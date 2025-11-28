/**
 * Standalone Playlist Poller Script
 *
 * Polls the CHIRP Radio current playlist API and stores tracks in the database
 * Can be run independently of the main CMS application
 */

import { getPayload } from 'payload'
import config from '../payload.config'

const CURRENT_PLAYLIST_API = 'https://chirpradio.appspot.com/api/current_playlist'
const POLL_INTERVAL = 30000 // 30 seconds

interface CurrentPlaylistTrack {
  id: string  // playlist event ID
  artist: string
  track: string
  release?: string
  label?: string
  dj?: string
  artist_is_local?: boolean
  lastfm_urls?: {
    large_image?: string
    med_image?: string
    sm_image?: string
  }
}

interface CurrentPlaylistResponse {
  now_playing: CurrentPlaylistTrack
  recently_played?: CurrentPlaylistTrack[]
}

let lastPlaylistEventId: string | null = null

async function fetchCurrentPlaylist(): Promise<CurrentPlaylistResponse | null> {
  try {
    console.log(`🔍 Fetching from ${CURRENT_PLAYLIST_API}...`)
    const response = await fetch(CURRENT_PLAYLIST_API)
    if (!response.ok) {
      console.error(`❌ Failed to fetch: ${response.status} ${response.statusText}`)
      return null
    }
    const data = await response.json()
    console.log(`✓ Fetched playlist data`)
    return data
  } catch (error) {
    console.error('❌ Error fetching:', error)
    return null
  }
}

async function recordTrack(track: CurrentPlaylistTrack, payload: any): Promise<boolean> {
  const eventId = String(track.id)
  const djName = track.dj || 'Unknown DJ'

  // Validate required fields from API
  if (!track.artist || !track.track || track.artist.trim() === '' || track.track.trim() === '') {
    console.log(`⚠️  Skipping track with missing artist/track data:`, JSON.stringify(track))
    return false
  }

  try {
    // Check if we already recorded this exact playlist event
    const existing = await payload.find({
      collection: 'tracks-played',
      where: {
        playlistEventId: { equals: eventId },
      },
      limit: 1,
    })

    if (existing.docs.length > 0) {
      console.log(`⊘ Already recorded: ${track.artist} - ${track.track} (event ${eventId.slice(0, 10)}...)`)
      return false
    }

    // Get album art from lastfm
    const albumArt = track.lastfm_urls?.large_image || track.lastfm_urls?.med_image || ''

    // Log the data we're about to save
    console.log(`📝 Recording track:`, {
      artistName: track.artist,
      trackName: track.track,
      djName: djName,
    })

    // Create new track record
    await payload.create({
      collection: 'tracks-played',
      data: {
        playlistEventId: eventId,
        artistName: track.artist.trim(),
        trackName: track.track.trim(),
        albumName: (track.release || '').trim(),
        labelName: (track.label || '').trim(),
        albumArt: albumArt,
        djName: djName.trim(),
        showName: 'Live on CHIRP Radio',  // API doesn't provide show name
        isLocal: track.artist_is_local || false,
        playedAt: new Date().toISOString(),
      },
    })

    console.log(`✅ Recorded: ${track.artist} - ${track.track}`)
    return true
  } catch (error) {
    console.error(`❌ Error recording track:`, error.message)
    console.error(`   Track data:`, JSON.stringify(track, null, 2))
    return false
  }
}

async function poll() {
  const payload = await getPayload({ config })
  const data = await fetchCurrentPlaylist()

  if (!data) {
    console.log('⚠️  No data received, will try again...')
    return
  }

  // Record now playing
  if (data.now_playing) {
    const track = data.now_playing
    await recordTrack(track, payload)
    lastPlaylistEventId = String(track.id)
  }

  // Also record recently played (to backfill history)
  if (data.recently_played && Array.isArray(data.recently_played)) {
    console.log(`📋 Found ${data.recently_played.length} recently played tracks, recording them...`)
    for (const track of data.recently_played) {
      await recordTrack(track, payload)
    }
  }

  console.log(`\n⏰ Next poll in ${POLL_INTERVAL / 1000} seconds\n`)
}

async function main() {
  console.log('🎵 CHIRP Radio Playlist Poller')
  console.log('═══════════════════════════════')
  console.log(`Polling: ${CURRENT_PLAYLIST_API}`)
  console.log(`Interval: ${POLL_INTERVAL / 1000} seconds`)
  console.log(`Database: ${process.env.DATABASE_URI?.replace(/:[^:@]+@/, ':***@') || 'Not set'}`)
  console.log('═══════════════════════════════\n')

  // Do initial poll immediately
  await poll()

  // Continue polling
  setInterval(poll, POLL_INTERVAL)
}

main().catch((error) => {
  console.error('💥 Fatal error:', error)
  process.exit(1)
})

/**
 * Standalone Playlist Poller Script
 *
 * Polls the CHIRP Radio current playlist API and stores tracks in the database
 * Can be run independently of the main CMS application
 */

import { getPayload } from 'payload'
import config from '../payload.config'
import { resolveAlbumArt } from './album-art-resolver'

const CURRENT_PLAYLIST_API = 'https://chirpradio.appspot.com/api/current_playlist'
const POLL_INTERVAL = 6000 // 6 seconds

interface CurrentPlaylistTrack {
  id: string  // playlist event ID
  artist: string
  track: string
  release?: string
  label?: string
  dj?: string
  artist_is_local?: boolean
  played_at_gmt?: string  // UTC timestamp from API
  played_at_local?: string  // Chicago time timestamp from API
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
let fallbackImages: any[] = []

async function loadFallbackImages(payload: any) {
  try {
    const { docs } = await payload.find({
      collection: 'player-fallback-images',
      limit: 100,
    })
    fallbackImages = docs
    console.log(`📷 Loaded ${fallbackImages.length} fallback images`)
  } catch (error) {
    console.error('⚠️  Error loading fallback images:', error.message)
    fallbackImages = []
  }
}

/**
 * DJB2 hash algorithm (same as frontend)
 */
function hashString(str: string): number {
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i)
  }
  return Math.abs(hash >>> 0) // Unsigned 32-bit integer
}

// Fallback image metadata for variety logic
interface FallbackImageMetadata {
  name: string  // album-art-8, album-art-9, etc.
  logo: 'bird' | 'chirp'
  color: 'red' | 'blue' | 'gray'
}

const fallbackMetadata: FallbackImageMetadata[] = [
  { name: 'album-art-8', logo: 'bird', color: 'red' },
  { name: 'album-art-9', logo: 'bird', color: 'blue' },
  { name: 'album-art-10', logo: 'bird', color: 'gray' },
  { name: 'album-art-11', logo: 'chirp', color: 'red' },
  { name: 'album-art-12', logo: 'chirp', color: 'blue' },
  { name: 'album-art-13', logo: 'chirp', color: 'gray' },
]

/**
 * Extract metadata from fallback image filename
 */
function getFallbackMetadata(url: string): FallbackImageMetadata | null {
  if (!url) return null
  const match = url.match(/album-art-(\d+)/)
  if (!match) return null
  const name = `album-art-${match[1]}`
  return fallbackMetadata.find(m => m.name === name) || null
}

/**
 * Gets fallback image with variety logic to avoid repeating colors/logos
 * Ensures no same color or logo type in consecutive tracks
 */
async function getDeterministicFallbackImage(artist: string, album: string, payload: any): Promise<string> {
  if (fallbackImages.length === 0) return ''

  // Get most recent track to check for variety
  let previousMeta: FallbackImageMetadata | null = null
  try {
    const { docs } = await payload.find({
      collection: 'tracks-played',
      limit: 1,
      sort: '-playedAt',
    })
    if (docs.length > 0 && docs[0].albumArt) {
      previousMeta = getFallbackMetadata(docs[0].albumArt)
    }
  } catch (error) {
    console.log('⚠️  Could not fetch previous track for variety logic')
  }

  // Filter fallback images based on variety rules
  let availableImages = fallbackImages
  if (previousMeta) {
    availableImages = fallbackImages.filter(img => {
      const imgMeta = getFallbackMetadata(img.sizes?.player?.url || img.url || '')
      if (!imgMeta) return true // Include if we can't determine metadata

      // Exclude same color or same logo type
      return imgMeta.color !== previousMeta.color && imgMeta.logo !== previousMeta.logo
    })

    // If filtering resulted in no images, fall back to all images
    if (availableImages.length === 0) {
      console.log('⚠️  Variety filter excluded all images, using all fallbacks')
      availableImages = fallbackImages
    } else {
      console.log(`🎨 Filtered fallbacks: ${availableImages.length}/${fallbackImages.length} (avoiding ${previousMeta.logo}/${previousMeta.color})`)
    }
  }

  // Use artist + album to deterministically select from available images
  const seed = hashString(`${artist}|${album}`)
  const index = seed % availableImages.length
  const selectedImage = availableImages[index]

  // Use player size (600x600) if available, otherwise base URL
  return selectedImage.sizes?.player?.url || selectedImage.url || ''
}

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

    // Resolve album art using parallel API tests (blocking with 3s timeout)
    const lastfmUrl = track.lastfm_urls?.large_image || track.lastfm_urls?.med_image || ''
    const albumName = (track.release || '').trim()

    let albumArt = await resolveAlbumArt(
      track.artist.trim(),
      albumName,
      lastfmUrl,
      3000 // 3 second timeout
    )

    // If parallel resolution failed, retry by re-fetching from CHIRP API for fresh Last.fm URL
    if (!albumArt || albumArt.trim() === '') {
      console.log(`🔄 Retrying: Re-fetching CHIRP API for fresh Last.fm URL...`)
      try {
        const retryResponse = await fetch(CURRENT_PLAYLIST_API)
        if (retryResponse.ok) {
          const retryData: CurrentPlaylistResponse = await retryResponse.json()

          // Find the same track in the response (check now_playing and recently_played)
          let freshTrack: CurrentPlaylistTrack | undefined
          if (retryData.now_playing?.id === track.id) {
            freshTrack = retryData.now_playing
          } else if (retryData.recently_played) {
            freshTrack = retryData.recently_played.find(t => t.id === track.id)
          }

          if (freshTrack) {
            const freshLastfmUrl = freshTrack.lastfm_urls?.large_image || freshTrack.lastfm_urls?.med_image || ''

            // Only retry if we got a different URL
            if (freshLastfmUrl && freshLastfmUrl !== lastfmUrl) {
              console.log(`🆕 Found new Last.fm URL, validating...`)
              albumArt = await resolveAlbumArt(
                track.artist.trim(),
                albumName,
                freshLastfmUrl,
                2000 // 2 second timeout for retry
              )
            } else {
              console.log(`⚠️  Same or empty Last.fm URL, skipping retry`)
            }
          } else {
            console.log(`⚠️  Track not found in retry API response`)
          }
        }
      } catch (retryError) {
        console.log(`⚠️  Retry fetch failed:`, retryError.message)
      }
    }

    // If still no album art after retry, use deterministic fallback image (same logic as player)
    if (!albumArt || albumArt.trim() === '') {
      albumArt = await getDeterministicFallbackImage(track.artist.trim(), albumName, payload)
      if (albumArt) {
        console.log(`🎨 Using deterministic fallback image for ${track.artist} - ${track.track}`)
      }
    }

    // Log the data we're about to save
    console.log(`📝 Recording track:`, {
      artistName: track.artist,
      trackName: track.track,
      djName: djName,
      albumArt: albumArt ? 'has art' : 'no art',
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
        playedAt: track.played_at_local || track.played_at_gmt || new Date().toISOString(),  // Use Chicago time from API
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

  // Load fallback images
  const payload = await getPayload({ config })
  await loadFallbackImages(payload)

  // Do initial poll immediately
  await poll()

  // Continue polling
  setInterval(poll, POLL_INTERVAL)
}

main().catch((error) => {
  console.error('💥 Fatal error:', error)
  process.exit(1)
})

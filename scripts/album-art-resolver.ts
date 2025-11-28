/**
 * Album Art Resolver - Parallel API Tests
 *
 * Attempts to resolve album art from multiple APIs in parallel:
 * 1. Last.fm URL validation (if provided)
 * 2. iTunes Search API (with PG filtering and similarity scoring)
 * 3. MusicBrainz + Cover Art Archive
 *
 * Returns the first successful result within the timeout period
 */

interface AlbumArtResult {
  url: string | null
  source: string
  time: number
  score?: number
}

/**
 * Upgrade Last.fm image URL to higher quality
 * Upgrades from 174s to 300x300 while keeping original format
 * Note: We keep .jpg/.png format because Last.fm doesn't always have WebP versions
 */
function upgradeImageQuality(
  url: string,
  quality: 'low' | 'medium' | 'high' = 'medium'
): string {
  if (!url || !url.includes('lastfm')) {
    return url
  }

  // Map quality to size parameter
  const sizeMap = {
    low: '174s', // 174x174px
    medium: '300x300', // 300x300px
    high: '300x300', // 300x300px
  }

  const size = sizeMap[quality]

  // Replace any /u/###s/ or /u/###x###/ pattern with the desired size
  // Keep original format (.jpg, .png) - don't force WebP conversion
  return url.replace(/\/u\/(\d+s|\d+x\d+)\//, `/u/${size}/`)
}

/**
 * Test if a Last.fm URL is valid and accessible
 * Upgrades URL to higher quality before validation
 */
async function tryLastFm(lastfmUrl: string): Promise<AlbumArtResult> {
  const start = performance.now()

  if (!lastfmUrl || lastfmUrl.trim() === '') {
    console.log('[Last.fm URL] No URL provided (null or empty)')
    return { url: null, source: 'Last.fm URL ✗', time: performance.now() - start }
  }

  // Upgrade to higher quality (174s → 300x300, keeping original format)
  const upgradedUrl = upgradeImageQuality(lastfmUrl, 'medium')

  try {
    console.log(`[Last.fm URL] Original: ${lastfmUrl}`)
    console.log(`[Last.fm URL] Upgraded: ${upgradedUrl}`)
    const res = await fetch(upgradedUrl, { method: 'HEAD' })
    const time = performance.now() - start

    if (res.ok) {
      console.log('[Last.fm URL] ✓ Upgraded URL is valid')
      return { url: upgradedUrl, source: 'Last.fm URL ✓', time }
    } else {
      console.log(`[Last.fm URL] ✗ Upgraded URL returned ${res.status}`)
      return { url: null, source: 'Last.fm URL ✗', time }
    }
  } catch (error) {
    console.error('[Last.fm URL] Error:', error)
    return { url: null, source: 'Last.fm URL ✗', time: performance.now() - start }
  }
}

/**
 * Normalize text for comparison
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Calculate similarity score between two strings
 */
function similarityScore(a: string, b: string): number {
  const normA = normalizeText(a)
  const normB = normalizeText(b)

  if (normA === normB) return 1.0
  if (normA.includes(normB) || normB.includes(normA)) return 0.8

  const wordsA = normA.split(' ')
  const wordsB = normB.split(' ')
  const commonWords = wordsA.filter(word => wordsB.includes(word))
  const overlapRatio = commonWords.length / Math.max(wordsA.length, wordsB.length)

  return overlapRatio * 0.6
}

/**
 * Search iTunes API for album art
 */
async function tryItunes(artist: string, album: string): Promise<AlbumArtResult> {
  const start = performance.now()
  try {
    console.log(`[iTunes] Searching for: "${artist}" - "${album}"`)

    const searchTerm = encodeURIComponent(`${artist} ${album}`)
    const itunesUrl = `https://itunes.apple.com/search?term=${searchTerm}&media=music&entity=album&limit=25&explicit=No&country=US`

    console.log(`[iTunes] URL: ${itunesUrl}`)

    const response = await fetch(itunesUrl)
    const data = await response.json()

    console.log(`[iTunes] Found ${data.resultCount || 0} total results`)

    if (data.results && data.results.length > 0) {
      let bestMatch = null
      let bestScore = 0

      // Filter out explicit content manually
      const cleanResults = data.results.filter((result: any) =>
        result.collectionExplicitness !== 'explicit' &&
        result.trackExplicitness !== 'explicit'
      )

      console.log(`[iTunes] ${cleanResults.length} clean/PG results after filtering`)

      for (const result of cleanResults) {
        const resultArtist = result.artistName || ''
        const resultAlbum = result.collectionName || ''

        const artistScore = similarityScore(artist, resultArtist)
        const albumScore = similarityScore(album, resultAlbum)
        const totalScore = (artistScore + albumScore) / 2

        console.log(
          `[iTunes] Result: "${resultArtist}" - "${resultAlbum}" ` +
          `(score: ${totalScore.toFixed(2)}, explicit: ${result.collectionExplicitness})`
        )

        // Require minimum 0.7 score (70% match)
        if (totalScore > bestScore && totalScore >= 0.7 && result.artworkUrl100) {
          bestScore = totalScore
          bestMatch = result
        }
      }

      if (bestMatch) {
        const artUrl = bestMatch.artworkUrl100.replace('100x100', '600x600')
        const time = performance.now() - start
        console.log(
          `[iTunes] ✓ Best match (${bestScore.toFixed(2)}): ${bestMatch.artistName} - ${bestMatch.collectionName}`
        )
        return { url: artUrl, source: 'iTunes ✓', time, score: bestScore }
      }

      console.log('[iTunes] ✗ No results met 0.7 threshold')
    } else {
      console.log('[iTunes] ✗ No results returned from API')
    }
    return { url: null, source: 'iTunes ✗', time: performance.now() - start, score: 0 }
  } catch (error) {
    console.error('[iTunes] Error:', error)
    return { url: null, source: 'iTunes ✗', time: performance.now() - start, score: 0 }
  }
}

/**
 * Search MusicBrainz + Cover Art Archive
 */
async function tryMusicBrainz(artist: string, album: string): Promise<AlbumArtResult> {
  const start = performance.now()
  try {
    console.log(`[MusicBrainz] Searching for: "${artist}" - "${album}"`)

    const artistQuery = encodeURIComponent(artist)
    const albumQuery = encodeURIComponent(album)
    const mbUrl = `https://musicbrainz.org/ws/2/release/?query=artist:${artistQuery}%20AND%20release:${albumQuery}&fmt=json&limit=5`

    console.log(`[MusicBrainz] URL: ${mbUrl}`)

    const response = await fetch(mbUrl, {
      headers: {
        'User-Agent': 'CHIRPRadio/3.0 (https://chirpradio.org)'
      }
    })
    const data = await response.json()

    console.log(`[MusicBrainz] Found ${data.releases?.length || 0} releases`)

    if (data.releases && data.releases.length > 0) {
      for (const release of data.releases) {
        const releaseId = release.id
        const releaseTitle = release.title || ''
        const artistCredit = release['artist-credit']?.[0]?.name || ''

        console.log(`[MusicBrainz] Checking release: "${artistCredit}" - "${releaseTitle}" (${releaseId})`)

        const coverArtUrl = `https://coverartarchive.org/release/${releaseId}/front`
        try {
          const checkResponse = await fetch(coverArtUrl, { method: 'HEAD' })
          if (checkResponse.ok) {
            const time = performance.now() - start
            console.log(`[MusicBrainz] ✓ Found cover art for: ${artistCredit} - ${releaseTitle}`)
            return { url: coverArtUrl, source: 'MusicBrainz ✓', time }
          }
        } catch (error) {
          console.log(`[MusicBrainz] No cover art for release ${releaseId}`)
        }
      }
      console.log('[MusicBrainz] ✗ No releases had cover art')
    }
    return { url: null, source: 'MusicBrainz ✗', time: performance.now() - start }
  } catch (error) {
    console.error('[MusicBrainz] Error:', error)
    return { url: null, source: 'MusicBrainz ✗', time: performance.now() - start }
  }
}

/**
 * Resolve album art using parallel API tests with timeout
 * Returns the first successful result or null if all fail/timeout
 */
export async function resolveAlbumArt(
  artist: string,
  album: string,
  lastfmUrl?: string,
  timeoutMs: number = 3000
): Promise<string | null> {
  console.log(`\n🎨 Resolving album art for: "${artist}" - "${album}"`)
  console.log(`   Timeout: ${timeoutMs}ms`)

  const promises: Promise<AlbumArtResult>[] = []

  // Add Last.fm URL test if provided
  if (lastfmUrl) {
    promises.push(tryLastFm(lastfmUrl))
  }

  // Add iTunes and MusicBrainz tests
  promises.push(tryItunes(artist, album))
  promises.push(tryMusicBrainz(artist, album))

  try {
    // Race: first successful result OR timeout
    const result = await Promise.race([
      // Wait for ANY successful result
      Promise.any(promises.map(async (p) => {
        const res = await p
        if (res.url) return res
        throw new Error('No URL')
      })),
      // Timeout promise
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), timeoutMs)
      )
    ])

    console.log(`✅ Album art resolved: ${result.source} (${result.time.toFixed(0)}ms)`)
    return result.url
  } catch (error) {
    console.log(`❌ Album art resolution failed: ${error.message}`)
    return null
  }
}

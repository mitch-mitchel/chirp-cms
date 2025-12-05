import type { PayloadHandler } from 'payload'

export const topTracksEndpoint: PayloadHandler = async (req) => {
  try {
    const { timeRange = 'week', limit = '10' } = req.query as { timeRange?: string; limit?: string }

    // Calculate date range
    const now = new Date()
    let startDate: Date

    switch (timeRange) {
      case 'week':
        startDate = new Date(now)
        startDate.setDate(now.getDate() - 7)
        break
      case 'month':
        startDate = new Date(now)
        startDate.setMonth(now.getMonth() - 1)
        break
      case 'ytd':
        startDate = new Date(now.getFullYear(), 0, 1) // January 1st of current year
        break
      case 'year':
        startDate = new Date(now)
        startDate.setFullYear(now.getFullYear() - 1)
        break
      default:
        startDate = new Date(now)
        startDate.setDate(now.getDate() - 7)
    }

    // Fetch all tracks played in the time range
    const tracksResult = await req.payload.find({
      collection: 'tracks-played',
      where: {
        playedAt: {
          greater_than_equal: startDate.toISOString(),
        },
      },
      limit: 10000, // Get all tracks in range
      pagination: false,
    })

    // Aggregate by track + artist
    const trackMap = new Map<
      string,
      { songName: string; artistName: string; recordCompany: string; playCount: number }
    >()

    tracksResult.docs.forEach((track: any) => {
      const key = `${track.trackName}|||${track.artistName}`.toLowerCase()
      const existing = trackMap.get(key)

      if (existing) {
        existing.playCount++
      } else {
        trackMap.set(key, {
          songName: track.trackName,
          artistName: track.artistName,
          recordCompany: track.labelName || 'Unknown',
          playCount: 1,
        })
      }
    })

    // Convert to array and sort by play count
    const tracks = Array.from(trackMap.values())
      .sort((a, b) => b.playCount - a.playCount)
      .slice(0, parseInt(String(limit)))

    return Response.json({
      success: true,
      tracks,
      timeRange,
      startDate: startDate.toISOString(),
      endDate: now.toISOString(),
    })
  } catch (error) {
    console.error('[top-tracks] Error:', error)
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch top tracks',
      },
      { status: 500 },
    )
  }
}

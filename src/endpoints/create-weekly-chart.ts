import type { PayloadHandler } from 'payload'

export const createWeeklyChartEndpoint: PayloadHandler = async (req) => {
  try {
    // In Payload v3, we need to parse the body from the request
    const body = await req.json()
    const { timeRange, chartSize, tracks } = body as {
      timeRange: string
      chartSize: number
      tracks: Array<{ songName: string; artistName: string; recordCompany: string }>
    }

    if (!tracks || !Array.isArray(tracks) || tracks.length === 0) {
      return Response.json(
        {
          success: false,
          error: 'No tracks provided',
        },
        { status: 400 },
      )
    }

    // Generate preheader based on time range
    const now = new Date()
    let preheader: string
    let startDate: Date

    switch (timeRange) {
      case 'week': {
        startDate = new Date(now)
        startDate.setDate(now.getDate() - 7)
        const startFormatted = startDate.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        })
        const endFormatted = now.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
        preheader = `Week of ${startFormatted} - ${endFormatted}`
        break
      }
      case 'month': {
        startDate = new Date(now)
        startDate.setMonth(now.getMonth() - 1)
        const monthName = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        preheader = `Month of ${monthName}`
        break
      }
      case 'ytd': {
        startDate = new Date(now.getFullYear(), 0, 1)
        preheader = `Year to Date ${now.getFullYear()}`
        break
      }
      case 'year': {
        startDate = new Date(now)
        startDate.setFullYear(now.getFullYear() - 1)
        const endYear = now.getFullYear()
        const startYear = startDate.getFullYear()
        preheader = `${startYear} - ${endYear}`
        break
      }
      default:
        preheader = 'Top Tracks'
    }

    // Generate title
    const title = `Top ${chartSize}`

    // Generate notes
    const createdDate = now.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
    const notes = `Created by the recently played dashboard on ${createdDate}`

    // Check if this is current week
    const isCurrentWeek = timeRange === 'week'

    // Create the weekly chart
    const chart = await req.payload.create({
      collection: 'weeklyCharts',
      data: {
        preheader,
        title,
        tracks: tracks.map((track: any) => ({
          songName: track.songName,
          artistName: track.artistName,
          recordCompany: track.recordCompany,
        })),
        isCurrentWeek,
        notes,
        status: 'draft',
      },
    })

    return Response.json({
      success: true,
      id: chart.id,
      title: chart.title,
      message: `Chart "${title}" created successfully`,
    })
  } catch (error) {
    console.error('[create-weekly-chart] Error:', error)
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create weekly chart',
      },
      { status: 500 },
    )
  }
}

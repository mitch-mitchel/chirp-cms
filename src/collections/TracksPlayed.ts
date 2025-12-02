import type { CollectionConfig } from 'payload'

export const TracksPlayed: CollectionConfig = {
  slug: 'tracks-played',
  labels: {
    singular: 'Track Played',
    plural: 'Tracks Played',
  },
  admin: {
    useAsTitle: 'trackName',
    defaultColumns: ['trackName', 'artistName', 'playedAt'],
    group: 'Radio Data',
    description: 'Historical record of all tracks played on CHIRP Radio',
  },
  access: {
    // Public read access for anyone to view playlist history
    read: () => true,
    // Allow create/update via API without authentication for system posts
    create: () => true,
    update: () => true,
    delete: ({ req: { user } }) => !!user,
  },
  endpoints: [
    {
      path: '/record-play',
      method: 'post',
      handler: async (req) => {
        try {
          const { payload } = req
          const {
            playlistEventId,
            artistName,
            trackName,
            albumName,
            labelName,
            albumArt,
            djName,
            showName,
            isLocal,
          } = req.body

          // Validate required fields
          if (!artistName || !trackName || !djName) {
            return Response.json(
              { error: 'Missing required fields: artistName, trackName, djName' },
              { status: 400 }
            )
          }

          const now = new Date()
          const threeMinutesAgo = new Date(now.getTime() - 3 * 60 * 1000)

          // Check for recent duplicate (same artist + track within 3 minutes)
          const recentTracks = await payload.find({
            collection: 'tracks-played',
            where: {
              and: [
                { artistName: { equals: artistName } },
                { trackName: { equals: trackName } },
                { playedAt: { greater_than: threeMinutesAgo.toISOString() } },
              ],
            },
            limit: 1,
            sort: '-playedAt',
          })

          if (recentTracks.docs.length > 0) {
            // Update existing entry with new timestamp (correction)
            const existingTrack = recentTracks.docs[0]
            const updated = await payload.update({
              collection: 'tracks-played',
              id: existingTrack.id,
              data: {
                playedAt: now.toISOString(),
                // Also update other fields in case they were corrected
                playlistEventId,
                albumName,
                labelName,
                albumArt,
                djName,
                showName,
                isLocal,
              },
            })

            return Response.json({
              success: true,
              action: 'updated',
              track: updated,
            })
          }

          // Create new entry
          const newTrack = await payload.create({
            collection: 'tracks-played',
            data: {
              playlistEventId,
              artistName,
              trackName,
              albumName,
              labelName,
              albumArt,
              djName,
              showName,
              isLocal: isLocal || false,
              playedAt: now.toISOString(),
            },
          })

          return Response.json({
            success: true,
            action: 'created',
            track: newTrack,
          })
        } catch (error) {
          console.error('Error recording track play:', error)
          return Response.json(
            { error: 'Failed to record track play', details: error.message },
            { status: 500 }
          )
        }
      },
    },
  ],
  fields: [
    {
      name: 'playlistEventId',
      type: 'text',
      label: 'Playlist Event ID',
      admin: {
        description: 'Original CHIRP playlist event ID from current_playlist API',
        readOnly: true,
      },
      index: true,
    },
    {
      name: 'artistName',
      type: 'text',
      required: true,
      index: true,
    },
    {
      name: 'trackName',
      type: 'text',
      required: true,
      index: true,
    },
    {
      name: 'albumName',
      type: 'text',
    },
    {
      name: 'labelName',
      type: 'text',
    },
    {
      name: 'albumArt',
      type: 'text',
      label: 'Album Art URL',
    },
    {
      name: 'djName',
      type: 'text',
      required: true,
      index: true,
    },
    {
      name: 'showName',
      type: 'text',
      required: false,
    },
    {
      name: 'isLocal',
      type: 'checkbox',
      label: 'Local Artist',
      defaultValue: false,
    },
    {
      name: 'playedAt',
      type: 'date',
      required: true,
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
      index: true,
    },
  ],
  // Sort by most recent first
  defaultSort: '-playedAt',
  // Optimize for large datasets
  pagination: {
    defaultLimit: 50,
    limits: [25, 50, 100],
  },
}

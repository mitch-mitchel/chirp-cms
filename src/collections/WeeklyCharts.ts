import type { CollectionConfig } from 'payload'

export const WeeklyCharts: CollectionConfig = {
  slug: 'weeklyCharts',
  labels: {
    singular: 'Weekly Chart',
    plural: 'Weekly Charts',
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'preheader', 'isCurrentWeek', 'updatedAt'],
    group: 'Content',
  },
  access: {
    read: () => true,
    // Note: create/update/delete access in CMS admin is controlled by admin user permissions
    // The frontend Top Tracks page is protected by Member roles (Volunteer/Board Member)
  },
  fields: [
    {
      name: 'preheader',
      type: 'text',
      required: false,
      admin: {
        description: 'Eyebrow text shown above the chart title on the Listen page (e.g., "Week of October 19, 2025" or "Chicago Local Artists")',
      },
    },
    {
      name: 'title',
      type: 'text',
      required: true,
      admin: {
        description: 'Chart title (e.g., "Top 50", "Most Added", "This Week\'s Adds")',
      },
    },
    {
      name: 'slug',
      type: 'text',
      required: false,
      admin: {
        hidden: true, // Hide from CMS admin - auto-generated from title
      },
      hooks: {
        beforeChange: [
          ({ data, value }) => {
            if (value) return value
            if (data?.title) {
              return data?.title
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '')
            }
            return value
          },
        ],
      },
    },
    {
      name: 'listType',
      type: 'text',
      admin: {
        description: 'Legacy field - no longer used',
        hidden: true,
      },
    },
    {
      name: 'csvFile',
      type: 'upload',
      relationTo: 'media',
      label: 'CSV File',
      admin: {
        description: 'Upload a CSV file (format: Position,Artist,Track,Label). Click "Create New" to select and upload a file.',
      },
    },
    {
      name: 'csvImport',
      type: 'textarea',
      label: 'Import CSV Data',
      admin: {
        description: 'Paste CSV data here (format: Song,Artist,Label). Each line should be one item. This will populate the items below when you save.',
      },
      hooks: {
        beforeChange: [
          ({ data, value }) => {
            if (value && value.trim()) {
              const lines = value.trim().split('\n')
              const tracks = lines.map((line: string) => {
                const parts = line.split(',').map((p: string) => p.trim())

                // Format: Song,Artist,Label
                if (parts.length >= 2) {
                  return {
                    songName: parts[0] || '',
                    artistName: parts[1] || '',
                    recordCompany: parts[2] || '',
                  }
                }
                return null
              }).filter(Boolean)

              if (tracks.length > 0 && data) {
                data.tracks = tracks
              }
            }
            return value
          },
        ],
      },
    },
    {
      name: 'tracks',
      type: 'array',
      label: 'Items',
      required: true,
      minRows: 1,
      fields: [
        {
          name: 'songName',
          type: 'text',
          required: true,
          admin: {
            description: 'Song/track/album title',
          },
        },
        {
          name: 'artistName',
          type: 'text',
          required: true,
          admin: {
            description: 'Artist name',
          },
        },
        {
          name: 'recordCompany',
          type: 'text',
          required: true,
          admin: {
            description: 'Record label/company (use "self-released" if independent)',
          },
        },
      ],
      admin: {
        description: 'Items for this list. Format: Song Name – Artist Name (Record Company)',
      },
    },
    {
      name: 'isCurrentWeek',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Mark this as the current week\'s chart to display on the Listen page',
      },
    },
    {
      name: 'notes',
      type: 'textarea',
      admin: {
        description: 'Optional notes or highlights for this week',
      },
    },
    {
      name: 'featuredTrack',
      type: 'number',
      admin: {
        description: 'Position of the featured/highlighted track (optional)',
      },
    },
    {
      name: 'status',
      type: 'select',
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Published', value: 'published' },
      ],
      defaultValue: 'draft',
      admin: {
        description: 'Publish status',
      },
    },
  ],
}

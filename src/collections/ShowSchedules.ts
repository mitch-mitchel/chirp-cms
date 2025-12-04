import type { CollectionConfig } from 'payload'
import { sendWebhook } from '../utils/webhook'

export const ShowSchedules: CollectionConfig = {
  slug: 'showSchedules',
  labels: {
    singular: 'Show Schedule',
    plural: 'Show Schedules',
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['dayOfWeek', 'startTime', 'endTime', 'dj', 'isActive'],
    group: 'Community & Schedule',
    pagination: {
      defaultLimit: 50,
    },
  },
  hooks: {
    beforeChange: [
      async ({ data, req }) => {
        // Helper to format time to "h:mm AM/PM" (handles both ISO and "6:00 AM" formats)
        const formatTime = (timeStr: string | Date): string => {
          // Try to parse as ISO date first
          const date = new Date(timeStr)

          // If valid ISO date, extract time
          if (!isNaN(date.getTime())) {
            const hours = date.getHours()
            const minutes = date.getMinutes()
            const period = hours >= 12 ? 'PM' : 'AM'
            const displayHours = hours % 12 || 12
            const displayMinutes = minutes.toString().padStart(2, '0')
            return `${displayHours}:${displayMinutes} ${period}`
          }

          // Fall back to returning the string as-is (already in "6:00 AM" format)
          return String(timeStr)
        }

        // Generate title from day + time + DJ/Music Mix
        if (data) {
          const day = data.dayOfWeek?.charAt(0).toUpperCase() + data.dayOfWeek?.slice(1) || ''
          const start = data.startTime ? formatTime(data.startTime) : ''
          const end = data.endTime ? formatTime(data.endTime) : ''

          let djName = 'Unassigned'
          if (data.isMusicMix) {
            djName = 'Music Mix'
          } else if (data.dj) {
            // Fetch DJ name if it's a relationship ID
            if (typeof data.dj === 'number' || typeof data.dj === 'string') {
              try {
                const djDoc = await req.payload.findByID({
                  collection: 'listeners',
                  id: data.dj,
                })
                djName = djDoc.djName || djDoc.firstName || 'DJ'
              } catch {
                // If fetch fails, use placeholder
                djName = 'DJ'
              }
            } else if (data.dj.djName) {
              djName = data.dj.djName
            }
          }

          data.title = `${day} ${start} - ${end} - ${djName}`
        }
        return data
      },
    ],
    afterChange: [
      async ({ doc, req, operation }) => {
        // Send webhook to notify frontend of changes
        await sendWebhook({
          collection: 'showSchedules',
          operation: operation === 'create' ? 'create' : 'update',
          timestamp: new Date().toISOString(),
          id: doc.id,
        })

        // Helper function to format time in compact style (handles both ISO and "6:00 AM" formats)
        const formatTime = (timeStr: string): string => {
          // Try to parse as ISO date first
          const date = new Date(timeStr)

          // If valid ISO date, format compactly
          if (!isNaN(date.getTime())) {
            const hours = date.getHours()
            const minutes = date.getMinutes()
            const period = hours >= 12 ? 'pm' : 'am'
            const displayHours = hours % 12 || 12

            // Special cases for noon and midnight
            if (displayHours === 12 && minutes === 0) {
              return period === 'pm' ? '12n' : '12m'
            }

            // Regular times - remove :00, lowercase am/pm
            if (minutes === 0) {
              return `${displayHours}${period}`
            } else {
              return `${displayHours}:${minutes.toString().padStart(2, '0')}${period}`
            }
          }

          // Fall back to parsing "6:00 AM" format
          const match = String(timeStr).match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i)
          if (match) {
            const hours = parseInt(match[1])
            const minutes = parseInt(match[2])
            const period = match[3].toLowerCase()

            // Special cases for noon and midnight
            if (hours === 12 && minutes === 0) {
              return period === 'pm' ? '12n' : '12m'
            }

            // Regular times - remove :00, lowercase am/pm
            if (minutes === 0) {
              return `${hours}${period}`
            } else {
              return `${hours}:${minutes.toString().padStart(2, '0')}${period}`
            }
          }

          // If all else fails, return as-is
          return String(timeStr)
        }

        // Update DJ's showTime field when they're assigned to a schedule
        if (doc.dj && !doc.isMusicMix) {
          try {
            const djId = typeof doc.dj === 'object' ? doc.dj.id : doc.dj

            // Find all schedules for this DJ
            const { docs: djSchedules } = await req.payload.find({
              collection: 'showSchedules',
              where: {
                dj: {
                  equals: djId,
                },
                isActive: {
                  equals: true,
                },
              },
              limit: 100,
            })

            // Build showTime string from all active schedules
            // Format: "Sun 12n - 2pm"
            const showTimes = djSchedules
              .map((schedule) => {
                const day =
                  schedule.dayOfWeek.charAt(0).toUpperCase() +
                  schedule.dayOfWeek.slice(1).substring(0, 3)
                const startFormatted = formatTime(schedule.startTime)
                const endFormatted = formatTime(schedule.endTime)
                return `${day} ${startFormatted} - ${endFormatted}`
              })
              .join(', ')

            // Update DJ's showTime field
            await req.payload.update({
              collection: 'listeners',
              id: djId,
              data: {
                showTime: showTimes || null,
              },
            })
          } catch (e) {
            console.error('Error updating DJ showTime:', e)
          }
        }
        return doc
      },
    ],
    afterDelete: [
      async ({ doc }) => {
        // Send webhook to notify frontend of deletion
        await sendWebhook({
          collection: 'showSchedules',
          operation: 'delete',
          timestamp: new Date().toISOString(),
          id: doc.id,
        })
      },
    ],
  },
  versions: {
    drafts: false, // No drafts for schedules
    maxPerDoc: 25,
  },
  access: {
    read: () => true,
    create: () => true,
    update: () => true,
    delete: () => true,
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      admin: {
        readOnly: true,
        description: 'Auto-generated title for this schedule slot',
      },
    },
    {
      name: 'dayOfWeek',
      type: 'select',
      required: true,
      options: [
        { label: 'Monday', value: 'monday' },
        { label: 'Tuesday', value: 'tuesday' },
        { label: 'Wednesday', value: 'wednesday' },
        { label: 'Thursday', value: 'thursday' },
        { label: 'Friday', value: 'friday' },
        { label: 'Saturday', value: 'saturday' },
        { label: 'Sunday', value: 'sunday' },
      ],
      admin: {
        description: 'Day of the week for this show',
      },
    },
    {
      name: 'startTime',
      type: 'text',
      required: true,
      admin: {
        description: 'Start time for this show (e.g., "6:00 AM")',
      },
    },
    {
      name: 'endTime',
      type: 'text',
      required: true,
      admin: {
        description: 'End time for this show (e.g., "8:00 AM")',
      },
    },
    {
      name: 'isMusicMix',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Check this for automated Music Mix slots (no DJ assignment needed)',
        position: 'sidebar',
      },
    },
    {
      name: 'dj',
      label: 'DJ',
      type: 'relationship',
      relationTo: 'listeners',
      required: false,
      admin: {
        description: 'DJ assigned to this time slot (not required for Music Mix)',
        condition: (data) => !data.isMusicMix,
      },
      filterOptions: () => {
        // Filter to only show members with DJ roles
        return {
          roles: {
            contains: 'Regular DJ',
          },
        }
      },
    },
    {
      name: 'isActive',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        description: 'Whether this show is currently active',
      },
    },
    {
      name: 'notes',
      type: 'textarea',
      admin: {
        description: 'Internal notes about this show slot',
      },
    },
    {
      name: 'displayOrder',
      type: 'number',
      admin: {
        description: 'Order in which to display (lower numbers appear first)',
      },
    },
  ],
}

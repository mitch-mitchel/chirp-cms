import type { CollectionConfig } from 'payload'
import { sendWebhook } from '../utils/webhook'

export const Pages: CollectionConfig = {
  slug: 'pages',
  labels: {
    singular: 'Website Page',
    plural: 'Website Pages',
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', 'updatedAt'],
    group: 'Website',
    preview: (doc) => {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
      return `${frontendUrl}/${doc.slug}`
    },
  },
  access: {
    read: () => true,
  },
  hooks: {
    afterChange: [
      async ({ doc, operation }) => {
        // Send webhook notification to front-end
        await sendWebhook({
          collection: 'pages',
          operation: operation === 'create' ? 'create' : 'update',
          timestamp: new Date().toISOString(),
          id: doc.id,
        })
      },
    ],
    afterDelete: [
      async ({ doc }) => {
        // Send webhook notification to front-end
        await sendWebhook({
          collection: 'pages',
          operation: 'delete',
          timestamp: new Date().toISOString(),
          id: doc.id,
        })
      },
    ],
  },
  fields: [
    {
      name: 'title',
      label: 'Page Title',
      type: 'text',
      required: true,
      admin: {
        description: 'The title displayed in browser tabs and search results (SEO)',
      },
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'excerpt',
      type: 'textarea',
      admin: {
        description:
          'Brief page summary used for SEO meta description and social media previews (recommended 150-160 characters)',
      },
    },
    {
      name: 'layoutTemplate',
      label: 'Page Layout Template',
      type: 'select',
      required: true,
      defaultValue: 'default',
      options: [
        { label: 'Single Column', value: 'default' },
        { label: 'Sidebar Right', value: 'sidebar-right' },
      ],
      admin: {
        position: 'sidebar',
        description: 'Choose the overall page layout structure',
      },
    },
    {
      name: 'layout',
      label: 'Page Content Blocks',
      type: 'blocks',
      blocks: [
        {
          slug: 'contentCard',
          labels: {
            singular: 'Content Card',
            plural: 'Content Cards',
          },
          fields: [
            {
              name: 'preheader',
              type: 'text',
              admin: {
                description: 'Small text above the title',
              },
            },
            {
              name: 'title',
              type: 'text',
              required: true,
            },
            {
              name: 'titleTag',
              type: 'select',
              options: ['h1', 'h2', 'h3', 'h4'],
              defaultValue: 'h2',
            },
            {
              name: 'content',
              type: 'richText',
              required: true,
            },
            {
              name: 'imagePosition',
              type: 'select',
              options: [
                { label: 'None', value: 'none' },
                { label: 'Left', value: 'left' },
                { label: 'Right', value: 'right' },
              ],
              defaultValue: 'none',
            },
            {
              name: 'backgroundImage',
              type: 'upload',
              relationTo: 'media',
            },
            {
              name: 'backgroundImageUrl',
              type: 'text',
              admin: {
                description: 'Or provide external URL',
              },
            },
          ],
        },
        {
          slug: 'imageRow',
          labels: {
            singular: 'Image Row',
            plural: 'Image Rows',
          },
          fields: [
            {
              name: 'images',
              type: 'array',
              fields: [
                {
                  name: 'image',
                  type: 'upload',
                  relationTo: 'media',
                },
                {
                  name: 'imageUrl',
                  type: 'text',
                },
                {
                  name: 'alt',
                  type: 'text',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      name: 'sidebarAnnouncement',
      type: 'relationship',
      relationTo: 'announcements',
      admin: {
        position: 'sidebar',
        description: 'Optional announcement to display in sidebar',
        condition: (data) => {
          return !['about', 'terms-of-service', 'privacy-policy'].includes(data.slug)
        },
      },
    },
    {
      name: 'sidebarContentType',
      type: 'select',
      options: [
        { label: 'None', value: 'none' },
        { label: 'Articles', value: 'articles' },
        { label: 'Events', value: 'events' },
        { label: 'Podcasts', value: 'podcasts' },
      ],
      defaultValue: 'none',
      admin: {
        position: 'sidebar',
        description: 'Type of content to display in sidebar cards',
        condition: (data) => {
          return !['about', 'terms-of-service', 'privacy-policy'].includes(data.slug)
        },
      },
    },
    {
      name: 'sidebarContentCount',
      type: 'number',
      defaultValue: 3,
      min: 1,
      max: 10,
      admin: {
        position: 'sidebar',
        description: 'Number of items to display (1-10)',
        condition: (data) => {
          return (
            !['about', 'terms-of-service', 'privacy-policy'].includes(data.slug) &&
            data.sidebarContentType &&
            data.sidebarContentType !== 'none'
          )
        },
      },
    },
    {
      name: 'sidebarAdvertisement',
      type: 'relationship',
      relationTo: 'advertisements',
      admin: {
        position: 'sidebar',
        description: 'Advertisement to display in sidebar',
        condition: (data) => {
          return !['about', 'terms-of-service', 'privacy-policy'].includes(data.slug)
        },
      },
    },
    {
      name: 'songRequestCooldownMinutes',
      label: 'Song Request Cooldown (Minutes)',
      type: 'number',
      defaultValue: 5,
      min: 0,
      max: 60,
      admin: {
        position: 'sidebar',
        description:
          'Number of minutes users must wait between song requests to prevent spam. Set to 0 to disable cooldown.',
        condition: (data) => data.slug === 'request-song',
      },
    },
    {
      name: 'songRequestCooldownMessage',
      label: 'Cooldown Message',
      type: 'text',
      defaultValue: 'You can submit another request in {minutes} minutes.',
      admin: {
        position: 'sidebar',
        description:
          'Message shown to users during cooldown period. Use {minutes} as placeholder for remaining time.',
        condition: (data) => data.slug === 'request-song',
      },
    },
  ],
}

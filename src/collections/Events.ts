import type { CollectionConfig } from 'payload'
import { lexicalEditor, LinkFeature } from '@payloadcms/richtext-lexical'
import { sendWebhook } from '../utils/webhook'
import { formatSlugHook } from '../utils/formatSlug'

export const Events: CollectionConfig = {
  slug: 'events',
  labels: {
    singular: 'Event',
    plural: 'Events',
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'date', 'venue', 'category', 'featured'],
    group: 'Content',
    livePreview: {
      url: ({ data }) => {
        // Use existing slug or generate from title for preview
        const slug =
          data.slug ||
          data.title
            ?.toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-+|-+$/g, '')
        const frontendUrl =
          process.env.FRONTEND_URL ||
          'http://chirp-radio-alb-1362747273.us-east-1.elb.amazonaws.com'
        return `${frontendUrl}/events/${slug || 'preview'}`
      },
    },
  },
  versions: {
    drafts: true,
    maxPerDoc: 50,
  },
  access: {
    read: () => true,
    create: () => true,
    update: () => true,
    delete: () => true,
  },
  hooks: {
    afterChange: [
      async ({ doc, operation }) => {
        // Send webhook notification to front-end
        await sendWebhook({
          collection: 'events',
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
          collection: 'events',
          operation: 'delete',
          timestamp: new Date().toISOString(),
          id: doc.id,
        })
      },
    ],
  },
  fields: [
    {
      name: 'category',
      type: 'relationship',
      relationTo: 'categories',
      required: true,
      admin: {
        description: 'Select a category for this event',
      },
    },
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'slug',
      label: 'Slug',
      type: 'text',
      required: false,
      unique: true,
      admin: {
        position: 'sidebar',
        description: 'URL-friendly version of the title (auto-generated if empty)',
      },
      hooks: {
        beforeValidate: [formatSlugHook('title')],
      },
    },
    {
      name: 'excerpt',
      type: 'textarea',
      required: true,
      maxLength: 200,
      admin: {
        description: 'Brief summary (max 200 characters)',
      },
    },
    {
      name: 'content',
      type: 'richText',
      required: false,
      editor: lexicalEditor({
        features: ({ defaultFeatures }) => [
          ...defaultFeatures,
          LinkFeature({
            enabledCollections: [],
          }),
        ],
      }),
    },
    {
      name: 'featuredImage',
      type: 'upload',
      relationTo: 'media',
      required: false,
    },
    {
      name: 'featuredImageUrl',
      type: 'text',
      required: false,
      admin: {
        description: 'Or provide external URL',
      },
    },
    {
      name: 'showPhotoCredit',
      type: 'checkbox',
      defaultValue: false,
      required: false,
      admin: {
        description: 'Display photo credit on the event page',
      },
    },
    {
      name: 'photographerName',
      type: 'text',
      required: false,
      admin: {
        description: 'Name of the photographer',
        condition: (data) => data.showPhotoCredit === true,
      },
    },
    {
      name: 'venue',
      type: 'relationship',
      relationTo: 'venues',
      required: true,
      admin: {
        description: 'Select a venue from the list',
      },
    },
    {
      name: 'date',
      type: 'date',
      required: true,
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
    {
      name: 'endDate',
      type: 'date',
      required: false,
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
    {
      name: 'featured',
      type: 'checkbox',
      defaultValue: false,
      required: false,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'ageRestriction',
      type: 'relationship',
      relationTo: 'ageGate',
      required: false,
      admin: {
        position: 'sidebar',
        description: 'Select age restriction if applicable',
      },
    },
  ],
}

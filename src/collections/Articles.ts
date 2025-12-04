import type { CollectionConfig } from 'payload'
import { lexicalEditor, LinkFeature } from '@payloadcms/richtext-lexical'
import { sendWebhook } from '../utils/webhook'
import { formatSlugHook } from '../utils/formatSlug'

export const Articles: CollectionConfig = {
  slug: 'articles',
  labels: {
    singular: 'Article',
    plural: 'Articles',
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'author', 'category', 'publishedDate'],
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
        return `${frontendUrl}/articles/${slug || 'preview'}`
      },
    },
  },
  versions: {
    drafts: true,
    maxPerDoc: 50,
  },
  access: {
    read: () => true,
  },
  hooks: {
    afterChange: [
      async ({ doc, operation }) => {
        // Send webhook notification to front-end
        await sendWebhook({
          collection: 'articles',
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
          collection: 'articles',
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
      name: 'author',
      label: 'Author',
      type: 'text',
      required: true,
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
      admin: {
        description: 'Or provide external URL',
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
      required: true,
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
      name: 'videoTitle',
      type: 'text',
    },
    {
      name: 'youtubeVideoId',
      type: 'text',
      admin: {
        description:
          'YouTube video ID or full URL (e.g., rXeaPSu1JFY or https://www.youtube.com/watch?v=rXeaPSu1JFY)',
      },
      hooks: {
        beforeChange: [
          ({ value }) => {
            if (!value) return value

            // Extract video ID from various YouTube URL formats
            const patterns = [
              /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s?]+)/,
              /^([a-zA-Z0-9_-]{11})$/, // Direct video ID format
            ]

            for (const pattern of patterns) {
              const match = value.match(pattern)
              if (match) {
                return match[1]
              }
            }

            return value
          },
        ],
      },
    },
    {
      name: 'tags',
      type: 'array',
      fields: [
        {
          name: 'tag',
          type: 'text',
        },
      ],
    },
    {
      name: 'publishedDate',
      type: 'date',
      required: true,
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
  ],
}

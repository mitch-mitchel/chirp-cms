import type { CollectionConfig } from 'payload'
import { lexicalEditor, LinkFeature } from '@payloadcms/richtext-lexical'
import { formatSlugHook } from '../utils/formatSlug'

export const Podcasts: CollectionConfig = {
  slug: 'podcasts',
  labels: {
    singular: 'Podcast',
    plural: 'Podcasts',
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'host', 'category'],
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
        return `${frontendUrl}/podcasts/${slug || 'preview'}`
      },
    },
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'category',
      type: 'relationship',
      relationTo: 'categories',
      required: true,
      admin: {
        description: 'Select a category for this podcast',
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
      name: 'host',
      type: 'text',
      required: true,
    },
    {
      name: 'coverArt',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'coverArtUrl',
      type: 'text',
      admin: {
        description: 'Or provide external URL',
      },
    },
    {
      name: 'soundCloudEmbedUrl',
      type: 'text',
      admin: {
        description: 'SoundCloud embed URL',
      },
    },
    {
      name: 'pullQuote',
      type: 'textarea',
    },
    {
      name: 'pullQuoteAttribution',
      type: 'text',
    },
    {
      name: 'additionalInfo',
      type: 'textarea',
    },
    {
      name: 'transcriptUrl',
      type: 'text',
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
  ],
}

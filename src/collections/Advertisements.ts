import type { CollectionConfig } from 'payload'

export const Advertisements: CollectionConfig = {
  slug: 'advertisements',
  labels: {
    singular: 'Advertisement',
    plural: 'Advertisements',
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'size', 'contentType', 'isActive', 'updatedAt'],
    group: 'Content Assets',
    livePreview: {
      url: ({ data }) => {
        const frontendUrl =
          process.env.FRONTEND_URL ||
          'http://chirp-radio-alb-1362747273.us-east-1.elb.amazonaws.com'
        return `${frontendUrl}/preview/advertisement/${data.id}`
      },
    },
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      admin: {
        description: 'Internal name for this advertisement',
      },
    },
    {
      name: 'isActive',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        position: 'sidebar',
        description: 'Whether this ad is currently active',
      },
    },
    {
      name: 'size',
      type: 'select',
      required: true,
      defaultValue: 'medium-rectangle',
      options: [
        { label: 'Large Rectangle (336x280)', value: 'large-rectangle' },
        { label: 'Leaderboard (728x90)', value: 'leaderboard' },
        { label: 'Medium Rectangle (300x250)', value: 'medium-rectangle' },
        { label: 'Mobile Banner (300x50)', value: 'mobile-banner' },
        { label: 'Wide Skyscraper (160x600)', value: 'wide-skyscraper' },
        { label: 'Custom Size', value: 'custom' },
      ],
      admin: {
        description: 'Standard ad size or custom dimensions',
      },
    },
    {
      name: 'customWidth',
      type: 'number',
      admin: {
        description: 'Custom width in pixels (only used if size is "custom")',
        condition: (data) => data.size === 'custom',
      },
    },
    {
      name: 'customHeight',
      type: 'number',
      admin: {
        description: 'Custom height in pixels (only used if size is "custom")',
        condition: (data) => data.size === 'custom',
      },
    },
    {
      name: 'contentType',
      type: 'select',
      required: true,
      defaultValue: 'image',
      options: [
        { label: 'Image', value: 'image' },
        { label: 'Video', value: 'video' },
        { label: 'HTML', value: 'html' },
        { label: 'Embed Code', value: 'embed' },
      ],
      admin: {
        description: 'Type of advertisement content',
      },
    },
    // Image fields
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description: 'Upload an image for the advertisement',
        condition: (data) => data.contentType === 'image',
      },
    },
    {
      name: 'imageUrl',
      type: 'text',
      admin: {
        description: 'Or provide an external image URL',
        condition: (data) => data.contentType === 'image',
      },
    },
    {
      name: 'alt',
      type: 'text',
      admin: {
        description: 'Alt text for the image/ad',
        condition: (data) => data.contentType === 'image',
      },
    },
    // Video fields
    {
      name: 'video',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description: 'Upload a video file',
        condition: (data) => data.contentType === 'video',
      },
    },
    {
      name: 'videoUrl',
      type: 'text',
      admin: {
        description: 'Or provide an external video URL',
        condition: (data) => data.contentType === 'video',
      },
    },
    // HTML content
    {
      name: 'htmlContent',
      type: 'textarea',
      admin: {
        description: 'Raw HTML content for the advertisement',
        condition: (data) => data.contentType === 'html',
      },
    },
    // Embed code
    {
      name: 'embedCode',
      type: 'textarea',
      admin: {
        description: 'Third-party embed code (e.g., Google Ads, AdSense)',
        condition: (data) => data.contentType === 'embed',
      },
    },
    // Link settings
    {
      name: 'href',
      type: 'text',
      admin: {
        description: 'URL to navigate to when ad is clicked',
      },
    },
    {
      name: 'target',
      type: 'select',
      defaultValue: '_blank',
      options: [
        { label: 'New Tab (_blank)', value: '_blank' },
        { label: 'Same Tab (_self)', value: '_self' },
      ],
      admin: {
        description: 'How to open the link',
        condition: (data) => !!data.href,
      },
    },
    // Display settings
    {
      name: 'showLabel',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        description: 'Show ad size label in placeholder',
      },
    },
  ],
}

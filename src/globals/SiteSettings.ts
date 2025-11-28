import type { GlobalConfig } from 'payload'
import { sendWebhook } from '../utils/webhook'

export const SiteSettings: GlobalConfig = {
  slug: 'siteSettings',
  label: 'Website Settings',
  admin: {
    group: 'Website',
  },
  access: {
    read: () => true,
  },
  hooks: {
    afterChange: [
      async () => {
        // Send webhook notification to front-end
        await sendWebhook({
          collection: 'siteSettings',
          operation: 'update',
          timestamp: new Date().toISOString(),
        })
      },
    ],
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Landing Page',
      fields: [
        {
          name: 'showTopAnnouncement',
          type: 'checkbox',
          defaultValue: true,
          admin: {
            description: 'Show announcement banner at top of landing page',
          },
        },
        {
          name: 'topAnnouncement',
          type: 'relationship',
          relationTo: 'announcements',
          admin: {
            description: 'Select which announcement to display at top of landing page',
          },
        },
        {
          name: 'sidebarAnnouncement',
          type: 'relationship',
          relationTo: 'announcements',
          admin: {
            description: 'Select which announcement to display in sidebar',
          },
        },
        {
          name: 'sidebarAdvertisement',
          type: 'relationship',
          relationTo: 'advertisements',
          admin: {
            description: 'Select which advertisement to display in sidebar',
          },
        },
      ],
        },
        {
          label: 'Listen Page',
      fields: [
        {
          name: 'showUserCollection',
          type: 'checkbox',
          defaultValue: true,
          admin: {
            description: 'Show 3 random songs from logged-in user\'s saved collection (if they have any)',
          },
        },
        {
          name: 'listenPageTitle',
          type: 'text',
          defaultValue: 'Listen',
          admin: {
            description: 'Main page title for Listen page',
          },
        },
        {
          name: 'listenCurrentPlaylistTitle',
          type: 'text',
          defaultValue: 'Current Playlist',
          admin: {
            description: 'Title for current playlist section',
          },
        },
        {
          name: 'listenPreviousPlaysButtonText',
          type: 'text',
          defaultValue: 'Previous Plays',
          admin: {
            description: 'Button text to navigate to full playlist page',
          },
        },
        {
          name: 'listenUserCollectionTitle',
          type: 'text',
          defaultValue: 'A Few from Your Collection',
          admin: {
            description: 'Title for user collection sidebar section',
          },
        },
        {
          name: 'listenYourCollectionButtonText',
          type: 'text',
          defaultValue: 'Your Collection',
          admin: {
            description: 'Button text to navigate to full collection page',
          },
        },
        {
          name: 'listenSidebarWeeklyChart',
          type: 'relationship',
          relationTo: 'weeklyCharts',
          admin: {
            description: 'Select which Weekly Chart list to display in sidebar',
          },
        },
        {
          name: 'listenSidebarAdvertisement',
          type: 'relationship',
          relationTo: 'advertisements',
          admin: {
            description: 'Select which advertisement to display in sidebar',
          },
        },
        {
          name: 'fullWidthAnnouncement',
          type: 'relationship',
          relationTo: 'announcements',
          admin: {
            description: 'Select announcement for full-width section (e.g., "DJ Applications Now Open")',
          },
        },
        {
          name: 'leftWeeklyChart',
          type: 'relationship',
          relationTo: 'weeklyCharts',
          admin: {
            description: 'Select which Weekly Chart list to display on the left',
          },
        },
        {
          name: 'rightWeeklyChart',
          type: 'relationship',
          relationTo: 'weeklyCharts',
          admin: {
            description: 'Select which Weekly Chart list to display on the right',
          },
        },
      ],
        },
        {
          label: 'Events Page',
      fields: [
        {
          name: 'eventsSidebarAnnouncement',
          type: 'relationship',
          relationTo: 'announcements',
          admin: {
            description: 'Select which announcement to display in sidebar',
          },
        },
        {
          name: 'eventsSidebarContentType',
          type: 'select',
          options: [
            { label: 'Articles', value: 'articles' },
            { label: 'Podcasts', value: 'podcasts' },
            { label: 'Events', value: 'events' },
            { label: 'None', value: 'none' },
          ],
          defaultValue: 'articles',
          admin: {
            description: 'Select which content type to display in sidebar',
          },
        },
        {
          name: 'eventsSidebarContentCount',
          type: 'select',
          options: [
            { label: '1', value: '1' },
            { label: '2', value: '2' },
            { label: '3', value: '3' },
          ],
          defaultValue: '3',
          admin: {
            description: 'Number of content items to display (1-3)',
          },
        },
        {
          name: 'eventsSidebarAdvertisement',
          type: 'relationship',
          relationTo: 'advertisements',
          admin: {
            description: 'Select which advertisement to display in sidebar',
          },
        },
        {
          name: 'eventsFullWidthAnnouncement',
          type: 'relationship',
          relationTo: 'announcements',
          admin: {
            description: 'Select announcement for full-width section (e.g., "Stream Quality Upgrade")',
          },
        },
      ],
        },
        {
          label: 'Articles Page',
      fields: [
        {
          name: 'articlesSidebarAnnouncement',
          type: 'relationship',
          relationTo: 'announcements',
          admin: {
            description: 'Select which announcement to display in sidebar',
          },
        },
        {
          name: 'articlesSidebarContentType',
          type: 'select',
          options: [
            { label: 'Articles', value: 'articles' },
            { label: 'Podcasts', value: 'podcasts' },
            { label: 'Events', value: 'events' },
            { label: 'None', value: 'none' },
          ],
          defaultValue: 'events',
          admin: {
            description: 'Select which content type to display in sidebar',
          },
        },
        {
          name: 'articlesSidebarContentCount',
          type: 'select',
          options: [
            { label: '1', value: '1' },
            { label: '2', value: '2' },
            { label: '3', value: '3' },
          ],
          defaultValue: '3',
          admin: {
            description: 'Number of content items to display (1-3)',
          },
        },
        {
          name: 'articlesSidebarAdvertisement',
          type: 'relationship',
          relationTo: 'advertisements',
          admin: {
            description: 'Select which advertisement to display in sidebar',
          },
        },
        {
          name: 'articlesFullWidthAnnouncement',
          type: 'relationship',
          relationTo: 'announcements',
          admin: {
            description: 'Select announcement for full-width section',
          },
        },
      ],
        },
        {
          label: 'Podcasts Page',
      fields: [
        {
          name: 'podcastsPageTitle',
          type: 'text',
          defaultValue: 'Podcasts',
          admin: {
            description: 'Main page title for Podcasts page',
          },
        },
        {
          name: 'podcastsSidebarAnnouncement',
          type: 'relationship',
          relationTo: 'announcements',
          admin: {
            description: 'Select which announcement to display in sidebar',
          },
        },
        {
          name: 'podcastsSidebarAdvertisement',
          type: 'relationship',
          relationTo: 'advertisements',
          admin: {
            description: 'Select which advertisement to display in sidebar',
          },
        },
        {
          name: 'podcastsFullWidthAnnouncement',
          type: 'relationship',
          relationTo: 'announcements',
          admin: {
            description: 'Select announcement for full-width section',
          },
        },
      ],
        },
        {
          label: 'DJ Detail Page',
      fields: [
        {
          name: 'djDetailSidebarAnnouncement',
          type: 'relationship',
          relationTo: 'announcements',
          admin: {
            description: 'Select which announcement to display in sidebar',
          },
        },
        {
          name: 'djDetailSidebarAdvertisement',
          type: 'relationship',
          relationTo: 'advertisements',
          admin: {
            description: 'Select which advertisement to display in sidebar',
          },
        },
        {
          name: 'djDetailSidebarContentType',
          type: 'select',
          options: [
            { label: 'Articles', value: 'articles' },
            { label: 'Podcasts', value: 'podcasts' },
            { label: 'Events', value: 'events' },
            { label: 'None', value: 'none' },
          ],
          defaultValue: 'articles',
          admin: {
            description: 'Select which content type to display in sidebar',
          },
        },
        {
          name: 'djDetailSidebarContentCount',
          type: 'select',
          options: [
            { label: '1', value: '1' },
            { label: '2', value: '2' },
            { label: '3', value: '3' },
          ],
          defaultValue: '3',
          admin: {
            description: 'Number of content items to display (1-3)',
          },
        },
      ],
        },
        {
          label: 'Schedule Page',
      fields: [
        {
          name: 'scheduleSidebarAnnouncement',
          type: 'relationship',
          relationTo: 'announcements',
          admin: {
            description: 'Select which announcement to display in sidebar',
          },
        },
        {
          name: 'scheduleSidebarAdvertisement',
          type: 'relationship',
          relationTo: 'advertisements',
          admin: {
            description: 'Select which advertisement to display in sidebar',
          },
        },
        {
          name: 'scheduleSidebarContentType',
          type: 'select',
          options: [
            { label: 'Articles', value: 'articles' },
            { label: 'Podcasts', value: 'podcasts' },
            { label: 'Events', value: 'events' },
            { label: 'None', value: 'none' },
          ],
          defaultValue: 'articles',
          admin: {
            description: 'Select which content type to display in sidebar',
          },
        },
        {
          name: 'scheduleSidebarContentCount',
          type: 'select',
          options: [
            { label: '1', value: '1' },
            { label: '2', value: '2' },
            { label: '3', value: '3' },
          ],
          defaultValue: '3',
          admin: {
            description: 'Number of content items to display (1-3)',
          },
        },
      ],
        },
        {
          label: 'Collection Page',
      fields: [
        {
          name: 'collectionPageContent',
          type: 'richText',
          admin: {
            description: 'Informational message about Your Collection feature. Explains that saved songs are available on web and mobile, and can be downloaded as CSV. Shows above the table on web, or in the main section on mobile (hidden when collection has items).',
          },
        },
      ],
        },
        {
          label: 'Error Pages',
      fields: [
        {
          name: 'notFoundPageHeading',
          type: 'text',
          defaultValue: 'Page Not Found',
          admin: {
            description: '404 error page heading',
          },
        },
        {
          name: 'notFoundPageMessage',
          type: 'textarea',
          defaultValue: "Sorry, we couldn't find the page you're looking for. It may have been moved or deleted.",
          admin: {
            description: '404 error page message',
          },
        },
        {
          name: 'forbiddenPageHeading',
          type: 'text',
          defaultValue: 'Access Denied',
          admin: {
            description: '403 forbidden page heading',
          },
        },
        {
          name: 'forbiddenPageMessage',
          type: 'textarea',
          defaultValue: "Sorry, you don't have permission to access this page. Please log in or contact us if you believe this is an error.",
          admin: {
            description: '403 forbidden page message',
          },
        },
        {
          name: 'forbiddenPageMessageLoggedIn',
          type: 'textarea',
          defaultValue: "You need to be signed in to access this page. Please sign in to continue.",
          admin: {
            description: '403 message for logged-out users',
          },
        },
        {
          name: 'serverErrorPageHeading',
          type: 'text',
          defaultValue: 'Internal Server Error',
          admin: {
            description: '500 server error page heading',
          },
        },
        {
          name: 'serverErrorPageMessage',
          type: 'textarea',
          defaultValue: "Oops! Something went wrong on our end. We're working to fix the issue. Please try again later.",
          admin: {
            description: '500 server error page message',
          },
        },
      ],
        },
        {
          label: 'Toast Messages',
      fields: [
        {
          name: 'loginSuccessMessage',
          type: 'text',
          defaultValue: 'Successfully logged in',
          admin: {
            description: 'Toast message shown after successful login',
          },
        },
        {
          name: 'logoutSuccessMessage',
          type: 'text',
          defaultValue: 'Successfully signed out',
          admin: {
            description: 'Toast message shown after successful sign out',
          },
        },
        {
          name: 'signupSuccessMessage',
          type: 'text',
          defaultValue: 'Account created successfully',
          admin: {
            description: 'Toast message shown after successful signup',
          },
        },
        {
          name: 'profileUpdateSuccessMessage',
          type: 'text',
          defaultValue: 'Profile updated successfully',
          admin: {
            description: 'Toast message shown after profile update',
          },
        },
        {
          name: 'profileUpdateErrorMessage',
          type: 'text',
          defaultValue: 'Failed to save profile. Please try again.',
          admin: {
            description: 'Toast message shown when profile update fails',
          },
        },
        {
          name: 'addToCollectionSuccessMessage',
          type: 'text',
          defaultValue: 'Added to your collection',
          admin: {
            description: 'Toast message shown when track added to collection',
          },
        },
        {
          name: 'removeFromCollectionSuccessMessage',
          type: 'text',
          defaultValue: 'Removed from your collection',
          admin: {
            description: 'Toast message shown when track removed from collection',
          },
        },
      ],
        },
        {
          label: 'Footer Support',
      fields: [
        {
          name: 'supportContent',
          type: 'richText',
          admin: {
            description: 'Content for the support section above the footer',
          },
        },
        {
          name: 'showDCaseLogo',
          type: 'checkbox',
          defaultValue: true,
          admin: {
            description: 'Show DCase logo in support section',
          },
        },
        {
          name: 'dCaseLogo',
          type: 'upload',
          relationTo: 'media',
          admin: {
            description: 'DCase logo image',
          },
        },
        {
          name: 'dCaseLogoUrl',
          type: 'text',
          label: 'DCase Logo Redirect',
          admin: {
            description: 'URL when DCase logo is clicked',
          },
        },
        {
          name: 'showIlArtsCouncilLogo',
          type: 'checkbox',
          defaultValue: true,
          admin: {
            description: 'Show Illinois Arts Council logo in support section',
          },
        },
        {
          name: 'ilArtsCouncilLogo',
          type: 'upload',
          relationTo: 'media',
          admin: {
            description: 'Illinois Arts Council logo image',
          },
        },
        {
          name: 'ilArtsCouncilLogoUrl',
          type: 'text',
          label: 'Illinois Arts Council Logo Redirect',
          admin: {
            description: 'URL when Illinois Arts Council logo is clicked',
          },
        },
        {
          name: 'additionalLogos',
          type: 'array',
          maxRows: 3,
          admin: {
            description: 'Additional support logos (up to 3)',
          },
          fields: [
            {
              name: 'logo',
              type: 'upload',
              relationTo: 'media',
              admin: {
                description: 'Logo image',
              },
            },
            {
              name: 'logoUrl',
              type: 'text',
              label: 'Logo Redirect',
              admin: {
                description: 'URL when logo is clicked (optional)',
              },
            },
            {
              name: 'alt',
              type: 'text',
              admin: {
                description: 'Alt text for logo',
              },
            },
          ],
        },
        {
          name: 'supportAdvertisement',
          type: 'relationship',
          relationTo: 'advertisements',
          admin: {
            description: 'Advertisement to show in support section',
          },
        },
      ],
        },
        {
          label: 'Footer',
      fields: [
        {
          name: 'copyrightText',
          type: 'text',
          defaultValue: '© {year} CHIRP Radio. All rights reserved.',
          admin: {
            description: 'Copyright text. Use {year} as placeholder for current year.',
          },
        },
        {
          name: 'socialLinks',
          type: 'array',
          admin: {
            description: 'Social media links for footer',
          },
          fields: [
            {
              name: 'platform',
              type: 'select',
              required: true,
              options: [
                { label: 'Facebook', value: 'facebook' },
                { label: 'Twitter/X', value: 'twitter' },
                { label: 'Instagram', value: 'instagram' },
                { label: 'Bluesky', value: 'bluesky' },
                { label: 'YouTube', value: 'youtube' },
                { label: 'TikTok', value: 'tiktok' },
                { label: 'LinkedIn', value: 'linkedin' },
                { label: 'Spotify', value: 'spotify' },
                { label: 'Apple Music', value: 'apple-music' },
                { label: 'Other', value: 'other' },
              ],
            },
            {
              name: 'url',
              type: 'text',
              required: true,
            },
            {
              name: 'label',
              type: 'text',
              admin: {
                description: 'Optional custom label (defaults to platform name)',
              },
            },
          ],
        },
        {
          name: 'showChirpFilmFestLogo',
          type: 'checkbox',
          defaultValue: false,
          admin: {
            description: 'Show CHIRP Radio Film Fest logo in footer',
          },
        },
        {
          name: 'chirpFilmFestLogo',
          type: 'upload',
          relationTo: 'media',
          admin: {
            description: 'CHIRP Radio Film Fest logo image',
          },
        },
        {
          name: 'chirpFilmFestLogoUrl',
          type: 'text',
          label: 'Film Fest Logo Redirect',
          admin: {
            description: 'URL when Film Fest logo is clicked',
          },
        },
        {
          name: 'showFirstTimeLogo',
          type: 'checkbox',
          defaultValue: false,
          admin: {
            description: 'Show First Time logo in footer',
          },
        },
        {
          name: 'firstTimeLogo',
          type: 'upload',
          relationTo: 'media',
          admin: {
            description: 'First Time logo image',
          },
        },
        {
          name: 'firstTimeLogoUrl',
          type: 'text',
          label: 'First Time Logo Redirect',
          admin: {
            description: 'URL when First Time logo is clicked',
          },
        },
      ],
        },
      ],
    },
  ],
}

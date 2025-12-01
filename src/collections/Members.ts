import type { CollectionConfig } from 'payload'
import { sendWebhook } from '../utils/webhook'
import type { Listener } from '../payload-types'

export const Members: CollectionConfig = {
  slug: 'listeners', // Keep DB table name as 'listeners' to preserve existing data
  labels: {
    singular: 'Member',
    plural: 'Members',
  },
  auth: {
    verify: {
      generateEmailSubject: () => 'Verify your CHIRP Radio account',
      generateEmailHTML: ({ token, user }: { token: string; user: Listener }) => {
        const verifyURL = `${process.env.PAYLOAD_PUBLIC_SERVER_URL || 'http://localhost:3000'}/api/listeners/verify/${token}`

        return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table cellpadding="0" cellspacing="0" border="0" width="600" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color: #000000; padding: 40px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">CHIRP Radio</h1>
              <p style="margin: 10px 0 0; color: #cccccc; font-size: 14px;">Chicago's Independent Radio Project</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; color: #333333; font-size: 24px; font-weight: 600;">Welcome to CHIRP Radio!</h2>

              <p style="margin: 0 0 20px; color: #666666; font-size: 16px; line-height: 1.5;">
                Thanks for signing up${user?.email ? ` with ${user.email}` : ''}! We're excited to have you join our community of music lovers.
              </p>

              <p style="margin: 0 0 30px; color: #666666; font-size: 16px; line-height: 1.5;">
                To complete your registration and start enjoying personalized features, please verify your email address by clicking the button below:
              </p>

              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td align="center" style="padding: 0 0 30px;">
                    <a href="${verifyURL}" style="display: inline-block; padding: 16px 40px; background-color: #000000; color: #ffffff; text-decoration: none; border-radius: 4px; font-size: 16px; font-weight: 600;">
                      Verify Email Address
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 10px; color: #999999; font-size: 14px; line-height: 1.5;">
                Or copy and paste this link into your browser:
              </p>
              <p style="margin: 0 0 30px; color: #666666; font-size: 14px; line-height: 1.5; word-break: break-all;">
                <a href="${verifyURL}" style="color: #666666;">${verifyURL}</a>
              </p>

              <p style="margin: 0; color: #999999; font-size: 13px; line-height: 1.5;">
                This verification link will expire in 2 hours for security reasons.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9f9f9; padding: 30px; text-align: center; border-radius: 0 0 8px 8px; border-top: 1px solid #eeeeee;">
              <p style="margin: 0 0 10px; color: #999999; font-size: 12px; line-height: 1.5;">
                If you didn't create an account with CHIRP Radio, you can safely ignore this email.
              </p>
              <p style="margin: 0; color: #cccccc; font-size: 12px;">
                &copy; ${new Date().getFullYear()} CHIRP Radio. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
        `
      },
    },
    tokenExpiration: 7200, // 2 hours for verification token
    maxLoginAttempts: 5,
    lockTime: 600 * 1000, // 10 minutes
    forgotPassword: {
      generateEmailSubject: () => 'Reset your CHIRP Radio password',
      generateEmailHTML: ({ token, user }: { token: string; user: Listener }) => {
        const resetURL = `${process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'}/reset-password?token=${token}`

        return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table cellpadding="0" cellspacing="0" border="0" width="600" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color: #000000; padding: 40px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">CHIRP Radio</h1>
              <p style="margin: 10px 0 0; color: #cccccc; font-size: 14px;">Chicago's Independent Radio Project</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; color: #333333; font-size: 24px; font-weight: 600;">Reset Your Password</h2>

              <p style="margin: 0 0 20px; color: #666666; font-size: 16px; line-height: 1.5;">
                We received a request to reset the password for your CHIRP Radio account${user?.email ? ` (${user.email})` : ''}.
              </p>

              <p style="margin: 0 0 30px; color: #666666; font-size: 16px; line-height: 1.5;">
                Click the button below to reset your password:
              </p>

              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td align="center" style="padding: 0 0 30px;">
                    <a href="${resetURL}" style="display: inline-block; padding: 16px 40px; background-color: #000000; color: #ffffff; text-decoration: none; border-radius: 4px; font-size: 16px; font-weight: 600;">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 10px; color: #999999; font-size: 14px; line-height: 1.5;">
                Or copy and paste this link into your browser:
              </p>
              <p style="margin: 0 0 30px; color: #666666; font-size: 14px; line-height: 1.5; word-break: break-all;">
                <a href="${resetURL}" style="color: #666666;">${resetURL}</a>
              </p>

              <p style="margin: 0; color: #999999; font-size: 13px; line-height: 1.5;">
                This password reset link will expire in 2 hours for security reasons.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9f9f9; padding: 30px; text-align: center; border-radius: 0 0 8px 8px; border-top: 1px solid #eeeeee;">
              <p style="margin: 0 0 10px; color: #999999; font-size: 12px; line-height: 1.5;">
                If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
              </p>
              <p style="margin: 0; color: #cccccc; font-size: 12px;">
                &copy; ${new Date().getFullYear()} CHIRP Radio. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
        `
      },
    },
  },
  admin: {
    useAsTitle: 'displayTitle',
    defaultColumns: ['id', 'displayTitle', 'djName', 'roles'],
    group: 'Community & Schedule',
    pagination: {
      defaultLimit: 50,
    },
  },
  access: {
    read: () => true,
    create: () => true,
    update: ({ req }) => {
      // Admins can update any profile
      if (req.user?.collection === 'users') {
        return true
      }
      // Regular users can only update their own profile
      if (req.user) {
        return {
          id: {
            equals: req.user.id,
          },
        }
      }
      return false
    },
    delete: ({ req }) => {
      // Only admins can delete members
      return req.user?.collection === 'users'
    },
  },
  hooks: {
    beforeChange: [
      async ({ data }) => {
        // Generate display title for dropdown selections
        if (data) {
          const firstName = data.firstName || ''
          const lastName = data.lastName || ''
          const djName = data.djName || ''
          const email = data.email || ''

          // Format: "First Last - DJ Name" or fallback to email
          if (firstName && lastName && djName) {
            data.displayTitle = `${firstName} ${lastName} - ${djName}`
          } else if (firstName && lastName) {
            data.displayTitle = `${firstName} ${lastName}`
          } else if (djName) {
            data.displayTitle = djName
          } else {
            data.displayTitle = email
          }
        }
        return data
      },
    ],
    afterChange: [
      async ({ doc, operation }) => {
        // Send webhook notification to front-end
        await sendWebhook({
          collection: 'listeners',
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
          collection: 'listeners',
          operation: 'delete',
          timestamp: new Date().toISOString(),
          id: doc.id,
        })
      },
    ],
  },
  fields: [
    // TABS START HERE
    {
      type: 'tabs',
      tabs: [
        // ==========================================
        // LISTENER TAB (Always shown for all members)
        // ==========================================
        {
          label: 'Listener',
          fields: [
            // Base Information
            {
              name: 'displayTitle',
              type: 'text',
              admin: {
                hidden: true,
                readOnly: true,
              },
            },
            {
              name: 'username',
              type: 'text',
            },
            {
              name: 'firstName',
              type: 'text',
            },
            {
              name: 'lastName',
              type: 'text',
            },
            {
              name: 'memberSince',
              type: 'date',
            },
            {
              name: 'roles',
              type: 'select',
              hasMany: true,
              required: true,
              defaultValue: ['Listener'],
              options: [
                { label: 'Listener', value: 'Listener' },
                { label: 'Volunteer', value: 'Volunteer' },
                { label: 'Regular DJ', value: 'Regular DJ' },
                { label: 'Substitute DJ', value: 'Substitute DJ' },
                { label: 'Board Member', value: 'Board Member' },
              ],
              admin: {
                description: 'User roles - multiple roles can be selected',
              },
            },
            {
              name: 'profileImage',
              label: 'Profile Image',
              type: 'upload',
              relationTo: 'media',
              admin: {
                description: 'Profile image (use CrImageCropper to create avatar)',
              },
            },
            {
              name: 'profileImageOrientation',
              type: 'select',
              options: [
                { label: 'Square', value: 'square' },
                { label: 'Landscape', value: 'landscape' },
                { label: 'Portrait', value: 'portrait' },
              ],
            },
            {
              name: 'location',
              type: 'text',
            },
          ],
        },

        // ==========================================
        // PREFERENCES TAB (All listeners)
        // ==========================================
        {
          label: 'Preferences',
          fields: [
            {
              name: 'preferences',
              type: 'group',
              fields: [
                {
                  name: 'emailNotifications',
                  type: 'checkbox',
                  defaultValue: true,
                  label: 'Email Notifications',
                },
                {
                  name: 'showNotifications',
                  type: 'checkbox',
                  defaultValue: true,
                  label: 'Show Notifications',
                },
                {
                  name: 'darkMode',
                  type: 'select',
                  label: 'Dark Mode',
                  options: [
                    { label: 'Light', value: 'light' },
                    { label: 'Dark', value: 'dark' },
                    { label: 'Device', value: 'device' },
                  ],
                },
                { name: 'autoPlay', type: 'checkbox', defaultValue: true, label: 'Auto Play' },
              ],
            },
            {
              name: 'onboardingCompleted',
              type: 'checkbox',
              defaultValue: false,
              label: 'Onboarding Completed',
              admin: {
                description: 'Whether the user has completed the initial onboarding tour',
              },
            },
          ],
        },

        // ==========================================
        // MUSIC COLLECTION TAB (All listeners)
        // ==========================================
        {
          label: 'Music Collection',
          fields: [
            {
              name: 'collection',
              type: 'array',
              label: 'Saved Tracks',
              fields: [
                { name: 'id', type: 'text', required: true },
                { name: 'trackName', type: 'text', required: true },
                { name: 'artistName', type: 'text', required: true },
                { name: 'albumName', type: 'text' },
                { name: 'labelName', type: 'text' },
                { name: 'albumArt', type: 'text' },
                { name: 'albumArtAlt', type: 'text' },
                { name: 'isLocal', type: 'checkbox' },
                { name: 'dateAdded', type: 'date', required: true },
              ],
              admin: {
                description: "User's saved music collection",
              },
            },
          ],
        },

        // ==========================================
        // FAVORITE DJs TAB (All listeners)
        // ==========================================
        {
          label: 'Favorite DJs',
          fields: [
            {
              name: 'favoriteDJs',
              type: 'array',
              label: 'Favorite DJs',
              labels: {
                singular: 'Favorite DJ',
                plural: 'Favorite DJs',
              },
              fields: [
                {
                  name: 'djId',
                  type: 'text',
                  label: 'DJ ID',
                },
              ],
            },
          ],
        },

        // ==========================================
        // DONATION HISTORY TAB (All listeners)
        // ==========================================
        {
          label: 'Donation History',
          description:
            'All donations made by this member. View and manage donations in the Donations collection.',
          fields: [
            {
              name: 'donorLevel',
              type: 'text',
              admin: {
                description: 'Donor level based on total donations (e.g., Bronze, Silver, Gold)',
              },
            },
          ],
        },

        // ==========================================
        // PURCHASE HISTORY TAB (All listeners)
        // ==========================================
        {
          label: 'Purchase History',
          description:
            'All store purchases made by this member. View and manage purchases in the Purchases collection.',
          fields: [
            {
              name: '_purchaseNote',
              type: 'text',
              admin: {
                readOnly: true,
                description:
                  "Store purchases are managed in the Purchases collection. To view this member's purchase history, go to Collections > Purchases and filter by this member.",
              },
            },
          ],
        },

        // ==========================================
        // VOLUNTEER TAB (Conditional)
        // ==========================================
        {
          label: 'Volunteer',
          admin: {
            condition: (data) => {
              const roles = data?.roles || []
              // Show if user is a Volunteer, Regular DJ, Substitute DJ, or Board Member
              return roles.includes('Volunteer') ||
                     roles.includes('Regular DJ') ||
                     roles.includes('Substitute DJ') ||
                     roles.includes('Board Member')
            },
          },
          fields: [
            { name: 'primaryPhoneType', type: 'text', label: 'Primary Phone Type' },
            { name: 'primaryPhone', type: 'text', label: 'Primary Phone' },
            { name: 'secondaryPhoneType', type: 'text', label: 'Secondary Phone Type' },
            { name: 'secondaryPhone', type: 'text', label: 'Secondary Phone' },
            { name: 'address', type: 'text' },
            { name: 'city', type: 'text' },
            { name: 'state', type: 'text' },
            { name: 'zipCode', type: 'text', label: 'Zip Code' },
            { name: 'age', type: 'text' },
            { name: 'education', type: 'text' },
            { name: 'employer', type: 'text' },
            {
              name: 'volunteerOrgs',
              type: 'array',
              label: 'Other Volunteer Organizations',
              fields: [{ name: 'org', type: 'text', label: 'Organization' }],
            },
            { name: 'hasRadioExperience', type: 'text', label: 'Has Radio Experience?' },
            { name: 'radioStations', type: 'text', label: 'Radio Stations Worked At' },
            {
              name: 'specialSkills',
              type: 'array',
              fields: [{ name: 'skill', type: 'text' }],
            },
            {
              name: 'hearAboutChirp',
              type: 'array',
              label: 'How They Heard About CHIRP',
              fields: [{ name: 'source', type: 'text' }],
            },
            {
              name: 'interests',
              type: 'array',
              fields: [{ name: 'interest', type: 'text' }],
            },
            { name: 'wantsToDJ', type: 'text', label: 'Wants To DJ' },
            {
              name: 'djAvailability',
              type: 'array',
              label: 'DJ Availability',
              labels: {
                singular: 'Time Slot',
                plural: 'Time Slots',
              },
              fields: [{ name: 'time', type: 'text' }],
            },
            {
              name: 'socialLinks',
              type: 'group',
              label: 'Social Media Links',
              fields: [
                { name: 'facebook', type: 'text', label: 'Facebook URL' },
                { name: 'instagram', type: 'text', label: 'Instagram URL' },
                { name: 'twitter', type: 'text', label: 'Twitter URL' },
                { name: 'tiktok', type: 'text', label: 'TikTok URL' },
                { name: 'bluesky', type: 'text', label: 'Bluesky URL' },
                { name: 'linkedin', type: 'text', label: 'LinkedIn URL' },
              ],
            },
          ],
        },

        // ==========================================
        // DJ TAB (Conditional)
        // ==========================================
        {
          label: 'DJ',
          admin: {
            condition: (data) => {
              const roles = data?.roles || []
              // Show if user is a Regular DJ or Substitute DJ
              return roles.includes('Regular DJ') || roles.includes('Substitute DJ')
            },
          },
          fields: [
            {
              name: 'djId',
              label: 'DJ ID',
              type: 'number',
              admin: {
                description: 'Unique DJ ID number',
              },
            },
            { name: 'djName', label: 'DJ Name', type: 'text' },
            { name: 'showName', label: 'Show Name', type: 'text' },
            {
              name: 'showTime',
              label: 'Show Time',
              type: 'text',
              admin: {
                readOnly: true,
                description: 'Auto-populated from Show Schedules assignments',
              },
            },
            {
              name: 'djExcerpt',
              label: 'DJ Excerpt',
              type: 'textarea',
              admin: {
                description: 'Short description for DJ cards and listings (1-2 sentences)',
              },
            },
            {
              name: 'djBio',
              label: 'DJ Bio',
              type: 'textarea',
              admin: {
                description: 'Full DJ biography shown on detailed DJ profile page',
              },
            },
            {
              name: 'djDonationLink',
              label: 'DJ Donation Link',
              type: 'text',
              admin: {
                description: 'Optional donation link for the DJ',
              },
            },
            {
              name: 'previousShows',
              type: 'array',
              label: 'Previous Shows',
              labels: {
                singular: 'Previous Show',
                plural: 'Previous Shows',
              },
              fields: [
                {
                  name: 'title',
                  type: 'text',
                  required: true,
                  admin: {
                    description: 'Show title (e.g., "Morning Mix - March 15")',
                  },
                },
                {
                  name: 'date',
                  type: 'date',
                  required: true,
                  admin: {
                    description: 'Date the show aired',
                  },
                },
                {
                  name: 'audioUrl',
                  type: 'text',
                  required: true,
                  admin: {
                    description: 'Google Cloud Storage URL for the audio file',
                  },
                },
                {
                  name: 'duration',
                  type: 'text',
                  admin: {
                    description: 'Show duration (e.g., "2:00:00")',
                  },
                },
                {
                  name: 'gcsFileName',
                  type: 'text',
                  admin: {
                    description: 'Original GCS file name for reference',
                  },
                },
              ],
              admin: {
                description:
                  'Auto-populated from Google Cloud Storage. Shows are automatically added when uploaded to GCS.',
              },
            },

            // Substitute DJ specific fields (nested condition)
            {
              name: 'substituteAvailability',
              type: 'array',
              label: 'Substitute Availability',
              fields: [{ name: 'time', type: 'text' }],
              admin: {
                condition: (data) => data?.roles?.includes('Substitute DJ'),
                description: 'Only for Substitute DJs',
              },
            },
            {
              name: 'canSubstituteFor',
              type: 'array',
              label: 'Can Substitute For',
              labels: {
                singular: 'DJ',
                plural: 'DJs',
              },
              fields: [{ name: 'djId', type: 'text', label: 'DJ ID' }],
              admin: {
                condition: (data) => data?.roles?.includes('Substitute DJ'),
                description: 'DJs this substitute can fill in for',
              },
            },
          ],
        },

        // ==========================================
        // BOARD MEMBER TAB (Conditional)
        // ==========================================
        {
          label: 'Board Member',
          admin: {
            condition: (data) => {
              const roles = data?.roles || []
              // Show only if user is a Board Member
              return roles.includes('Board Member')
            },
          },
          fields: [
            {
              name: 'boardPosition',
              type: 'text',
              label: 'Board Position',
              admin: {
                description: 'e.g., President, Treasurer, Secretary',
              },
            },
            { name: 'boardSince', type: 'date', label: 'Board Member Since' },
            { name: 'boardTermEnd', type: 'date', label: 'Board Term Ends' },
          ],
        },
      ],
    },
  ],
}

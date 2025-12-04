import type { GlobalConfig } from 'payload'
import { sendWebhook } from '../utils/webhook'

export const MobileAppSettings: GlobalConfig = {
  slug: 'mobileAppSettings',
  label: 'Mobile App Settings',
  admin: {
    group: 'Mobile App',
    description: 'Global settings and shared content for the mobile app',
  },
  versions: {
    drafts: false,
    maxPerDoc: 25,
  },
  access: {
    read: () => true,
  },
  hooks: {
    afterChange: [
      async () => {
        // Send webhook notification to front-end
        await sendWebhook({
          collection: 'mobile-app-settings',
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
          label: 'Authentication',
          fields: [
            {
              name: 'notLoggedInMessage',
              type: 'group',
              label: 'Not Logged In Message',
              admin: {
                description: 'Default message shown on pages that require login (used across all pages unless overridden)',
              },
              fields: [
                {
                  name: 'title',
                  type: 'text',
                  defaultValue: 'Login Required',
                  admin: {
                    description: 'Heading for not-logged-in state',
                  },
                },
                {
                  name: 'message',
                  type: 'richText',
                  admin: {
                    description: 'Explanation of why login is required',
                  },
                },
                {
                  name: 'loginButtonText',
                  type: 'text',
                  defaultValue: 'Log In',
                  admin: {
                    description: 'Text for login button',
                  },
                },
                {
                  name: 'signupButtonText',
                  type: 'text',
                  defaultValue: 'Sign Up',
                  admin: {
                    description: 'Text for signup button',
                  },
                },
              ],
            },
            {
              name: 'loginModal',
              type: 'group',
              label: 'Login/Signup Modal Messages',
              admin: {
                description: 'Messages shown in the login/signup modal',
              },
              fields: [
                {
                  name: 'loginMessage',
                  type: 'richText',
                  label: 'Login Message',
                  admin: {
                    description: 'Message shown when user clicks "Log In"',
                  },
                },
                {
                  name: 'signupMessage',
                  type: 'richText',
                  label: 'Sign Up Message',
                  admin: {
                    description: 'Message shown when user clicks "Sign Up"',
                  },
                },
              ],
            },
            {
              name: 'accountBenefits',
              type: 'group',
              label: 'Account Benefits',
              admin: {
                description: 'List of benefits shown on not-logged-in pages',
              },
              fields: [
                {
                  name: 'title',
                  type: 'text',
                  defaultValue: 'Benefits of Creating an Account:',
                  admin: {
                    description: 'Heading above benefits list',
                  },
                },
                {
                  name: 'benefits',
                  type: 'array',
                  label: 'Benefits List',
                  admin: {
                    description: 'Individual benefit items',
                  },
                  fields: [
                    {
                      name: 'benefit',
                      type: 'text',
                      required: true,
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          label: 'Account Benefits',
          fields: [
            {
              name: 'accountBenefitsTitle',
              type: 'text',
              defaultValue: 'Benefits of Creating an Account',
              admin: {
                description: 'Heading for benefits section',
              },
            },
            {
              name: 'accountBenefitsContent',
              type: 'richText',
              label: 'Benefits Content',
              admin: {
                description: 'Content explaining benefits of creating an account (use bullet list format)',
              },
            },
          ],
        },
      ],
    },
  ],
}

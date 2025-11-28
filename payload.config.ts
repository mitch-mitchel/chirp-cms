import path from 'path'
import { fileURLToPath } from 'url'
import { buildConfig } from 'payload'
import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { redirectsPlugin } from '@payloadcms/plugin-redirects'
import sharp from 'sharp'
import { Resend } from 'resend'

import { Articles } from './src/collections/Articles'
import { Events } from './src/collections/Events'
import { VolunteerCalendar } from './src/collections/VolunteerCalendar'
import { WeeklyCharts } from './src/collections/WeeklyCharts'
import { Media } from './src/collections/Media'
import { PlayerFallbackImages } from './src/collections/PlayerFallbackImages'
import { Venues } from './src/collections/Venues'
import { Pages } from './src/collections/Pages'
import { Podcasts } from './src/collections/Podcasts'
import { Announcements } from './src/collections/Announcements'
import { Advertisements } from './src/collections/Advertisements'
import { ShopItems } from './src/collections/ShopItems'
import { ShowSchedules } from './src/collections/ShowSchedules'
import { Users } from './src/collections/Users'
import { AgeGate } from './src/collections/AgeGate'
import { Members } from './src/collections/Members'
import { Donations } from './src/collections/Donations'
import { Purchases } from './src/collections/Purchases'
import { Categories } from './src/collections/Categories'
import { MobilePageContent } from './src/collections/MobilePageContent'
import { Onboarding } from './src/collections/Onboarding'
import { TracksPlayed } from './src/collections/TracksPlayed'
import { SiteSettings } from './src/globals/SiteSettings'
import { MobileAppSettings } from './src/globals/MobileAppSettings'
import { VolunteerFormSettings } from './src/globals/VolunteerFormSettings'
import { migrations as _migrations } from './src/migrations'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Initialize Resend client (with fallback for scripts that load config before env vars are set)
const resend = new Resend(process.env.RESEND_API_KEY || 'dummy_key_for_scripts')

// Database adapter selection based on DATABASE_URI
const databaseAdapter = () => {
  const dbUri = process.env.DATABASE_URI || 'file:./payload.db'

  // Use PostgreSQL if URI starts with postgresql:// or postgres://
  if (dbUri.startsWith('postgresql://') || dbUri.startsWith('postgres://')) {
    console.log('📊 Using PostgreSQL database adapter')
    return postgresAdapter({
      pool: {
        connectionString: dbUri,
      },
      migrationDir: path.resolve(__dirname, 'src/migrations'),
      // Enable push to auto-create/update schema
      push: true,
    })
  }

  // Default to SQLite for local development
  console.log('📊 Using SQLite database adapter')
  return sqliteAdapter({
    client: {
      url: dbUri,
    },
  })
}

export default buildConfig({
  serverURL: process.env.PAYLOAD_PUBLIC_SERVER_URL || 'http://localhost:3000',
  admin: {
    meta: {
      titleSuffix: '- CHIRP Radio',
      ogImage: '/images/chirp-logo.svg',
      favicon: '/images/chirp-logo.svg',
    },
    components: {
      graphics: {
        Icon: '@/components/Logo#Logo',
        Logo: '@/components/Logo#Logo',
      },
    },
  },
  plugins: [
    redirectsPlugin({
      collections: ['pages', 'articles', 'events', 'podcasts'],
      overrides: {
        admin: {
          group: 'Website',
        },
      },
    }),
  ],
  collections: [
    // 1. CMS Settings
    Users,

    // 2. Community & Schedule
    Members,
    ShowSchedules,

    // 3. Content
    Articles,
    Events,
    Podcasts,
    ShopItems,
    WeeklyCharts,
    VolunteerCalendar,

    // 4. Content Assets
    Categories,
    Venues,
    Announcements,
    Advertisements,
    AgeGate,

    // 5. Media
    Media,
    PlayerFallbackImages,

    // 6. Commerce
    Donations,
    Purchases,

    // 7. Website
    Pages,

    // 8. Mobile App
    MobilePageContent,
    Onboarding,

    // 9. Radio Data
    TracksPlayed,
  ],
  globals: [
    // Mobile App
    MobileAppSettings,
    VolunteerFormSettings,

    // Website
    SiteSettings,
  ],
  secret: process.env.PAYLOAD_SECRET || 'your-secret-key-here-change-in-production',
  typescript: {
    outputFile: path.resolve(__dirname, 'payload-types.ts'),
  },
  db: databaseAdapter(),
  editor: lexicalEditor({}),
  sharp,
  email: () => ({
    name: 'resend',
    defaultFromAddress: process.env.EMAIL_FROM || 'noreply@chirpradio.org',
    defaultFromName: process.env.EMAIL_FROM_NAME || 'CHIRP Radio',
    sendEmail: async (message) => {
      try {
        const { to, subject, html, text, from } = message

        console.log('📧 Sending email via Resend:')
        console.log('  To:', to)
        console.log('  Subject:', subject)

        const result = await resend.emails.send({
          from: from
            ? typeof from === 'string'
              ? from
              : `${from.name || 'CHIRP Radio'} <${from.address}>`
            : `${process.env.EMAIL_FROM_NAME || 'CHIRP Radio'} <${process.env.EMAIL_FROM || 'noreply@chirpradio.org'}>`,
          to: Array.isArray(to) ? to : [to],
          subject: subject || '',
          html: html || text || '',
        })

        console.log('✅ Email sent successfully:', result)
        return result
      } catch (error) {
        console.error('❌ Resend email error:', error)
        throw error
      }
    },
  }),
  cors: [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    'http://localhost:5173',
    'http://localhost:3001',
  ].filter(Boolean),
  csrf: [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    'http://localhost:5173',
    'http://localhost:3001',
  ].filter(Boolean),
})

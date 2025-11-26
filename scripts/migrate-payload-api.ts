import { getPayload } from 'payload'
import { buildConfig } from 'payload'
import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

// Import collections
import { Articles } from '../src/collections/Articles.js'
import { Events } from '../src/collections/Events.js'
import { VolunteerCalendar } from '../src/collections/VolunteerCalendar.js'
import { WeeklyCharts } from '../src/collections/WeeklyCharts.js'
import { Media } from '../src/collections/Media.js'
import { PlayerFallbackImages } from '../src/collections/PlayerFallbackImages.js'
import { Venues } from '../src/collections/Venues.js'
import { Pages } from '../src/collections/Pages.js'
import { Podcasts } from '../src/collections/Podcasts.js'
import { Announcements } from '../src/collections/Announcements.js'
import { Advertisements } from '../src/collections/Advertisements.js'
import { ShopItems } from '../src/collections/ShopItems.js'
import { ShowSchedules } from '../src/collections/ShowSchedules.js'
import { Users } from '../src/collections/Users.js'
import { AgeGate } from '../src/collections/AgeGate.js'
import { Members } from '../src/collections/Members.js'
import { Donations } from '../src/collections/Donations.js'
import { Purchases } from '../src/collections/Purchases.js'
import { Categories } from '../src/collections/Categories.js'
import { MobilePageContent } from '../src/collections/MobilePageContent.js'
import { Onboarding } from '../src/collections/Onboarding.js'
import { SiteSettings } from '../src/globals/SiteSettings.js'
import { MobileAppSettings } from '../src/globals/MobileAppSettings.js'
import { VolunteerFormSettings } from '../src/globals/VolunteerFormSettings.js'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

interface MigrationStats {
  collection: string
  exported: number
  imported: number
  errors: number
  errorMessages: string[]
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const migrateViaPayloadAPI = async () => {
  console.log('🚀 Migrating SQLite to AWS RDS via Payload API\n')
  console.log('='.repeat(70))

  const sqliteDbPath = path.resolve(__dirname, '../data-backups/payload.db')

  // Load AWS infrastructure config
  const awsConfigPath = path.resolve(__dirname, '../infrastructure-config.env')
  if (fs.existsSync(awsConfigPath)) {
    const awsConfig = fs.readFileSync(awsConfigPath, 'utf-8')
    awsConfig.split('\n').forEach((line) => {
      const [key, value] = line.split('=')
      if (key && value && key.trim() && !key.startsWith('#')) {
        process.env[key.trim()] = value.trim()
      }
    })
  }

  const postgresUri = process.env.DATABASE_URI

  if (!postgresUri) {
    console.error('❌ DATABASE_URI not found in environment or infrastructure-config.env')
    process.exit(1)
  }

  if (!fs.existsSync(sqliteDbPath)) {
    console.error(`❌ SQLite database not found at: ${sqliteDbPath}`)
    process.exit(1)
  }

  console.log(`📂 Source: ${sqliteDbPath}`)
  console.log(`📂 Target: AWS RDS PostgreSQL`)
  console.log(`   Endpoint: ${process.env.DB_ENDPOINT}`)
  console.log(`   Database: ${process.env.DB_NAME}\n`)
  console.log('='.repeat(70))
  console.log('\n⚠️  This will import data into the AWS RDS database!')
  console.log('   Existing data will be preserved (no deletion)')
  console.log('   Press Ctrl+C within 5 seconds to cancel...\n')

  await wait(5000)

  let sqlitePayload: any
  let postgresPayload: any
  const stats: MigrationStats[] = []

  try {
    // Step 1: Connect to SQLite (source)
    console.log('📤 Connecting to SQLite...\n')
    const sqliteConfig = buildConfig({
      secret: process.env.PAYLOAD_SECRET || 'your-secret-key-here-change-in-production',
      collections: [
        Users,
        Members,
        ShowSchedules,
        Articles,
        Events,
        Podcasts,
        ShopItems,
        WeeklyCharts,
        VolunteerCalendar,
        Categories,
        Venues,
        Announcements,
        Advertisements,
        AgeGate,
        Media,
        PlayerFallbackImages,
        Donations,
        Purchases,
        Pages,
        MobilePageContent,
        Onboarding,
      ],
      globals: [MobileAppSettings, VolunteerFormSettings, SiteSettings],
      db: sqliteAdapter({
        client: { url: `file:${sqliteDbPath}` },
        push: false,
      }),
      typescript: { outputFile: path.resolve(__dirname, '../payload-types.ts') },
      editor: lexicalEditor({}),
      sharp,
    })

    sqlitePayload = await getPayload({ config: sqliteConfig })
    console.log('✅ SQLite connected\n')

    // Step 2: Connect to PostgreSQL (target)
    console.log('📥 Connecting to AWS RDS PostgreSQL...\n')
    const postgresConfig = buildConfig({
      secret: process.env.PAYLOAD_SECRET || 'your-secret-key-here-change-in-production',
      collections: [
        Users,
        Members,
        ShowSchedules,
        Articles,
        Events,
        Podcasts,
        ShopItems,
        WeeklyCharts,
        VolunteerCalendar,
        Categories,
        Venues,
        Announcements,
        Advertisements,
        AgeGate,
        Media,
        PlayerFallbackImages,
        Donations,
        Purchases,
        Pages,
        MobilePageContent,
        Onboarding,
      ],
      globals: [MobileAppSettings, VolunteerFormSettings, SiteSettings],
      db: postgresAdapter({
        pool: {
          connectionString: postgresUri,
        },
        migrationDir: path.resolve(__dirname, '../src/migrations'),
        push: true, // Auto-create/update schema
      }),
      typescript: { outputFile: path.resolve(__dirname, '../payload-types.ts') },
      editor: lexicalEditor({}),
      sharp,
    })

    postgresPayload = await getPayload({ config: postgresConfig })
    console.log('✅ PostgreSQL connected and schema initialized\n')

    console.log('🔄 Starting migration...\n')

    // Migration order: dependencies first
    const migrationPlan = [
      // 1. Independent collections (no dependencies)
      { slug: 'categories', label: 'Categories' },
      { slug: 'venues', label: 'Venues' },
      { slug: 'ageGate', label: 'Age Gate', sqliteTable: 'age_gate' },
      { slug: 'users', label: 'Users' },

      // 2. Media (needed by other collections)
      { slug: 'media', label: 'Media' },
      {
        slug: 'playerFallbackImages',
        label: 'Player Fallback Images',
        sqliteTable: 'player_fallback_images',
      },

      // 3. Content collections (depend on categories, venues, media)
      { slug: 'articles', label: 'Articles' },
      { slug: 'events', label: 'Events' },
      { slug: 'podcasts', label: 'Podcasts' },
      { slug: 'pages', label: 'Pages' },

      // 4. Schedule and Members
      { slug: 'members', label: 'Members', sqliteTable: 'listeners' },
      { slug: 'showSchedules', label: 'Show Schedules', sqliteTable: 'show_schedules' },

      // 5. Other collections
      { slug: 'announcements', label: 'Announcements' },
      { slug: 'advertisements', label: 'Advertisements' },
      { slug: 'onboarding', label: 'Onboarding' },
      {
        slug: 'mobilePageContent',
        label: 'Mobile Page Content',
        sqliteTable: 'mobile_page_content',
      },

      // 6. Commerce
      { slug: 'shopItems', label: 'Shop Items', sqliteTable: 'shop_items' },
      { slug: 'weeklyCharts', label: 'Weekly Charts', sqliteTable: 'weekly_charts' },
      { slug: 'volunteerCalendar', label: 'Volunteer Calendar', sqliteTable: 'volunteer_calendar' },
      { slug: 'donations', label: 'Donations' },
      { slug: 'purchases', label: 'Purchases' },
    ]

    for (const plan of migrationPlan) {
      await migrateCollection(
        sqlitePayload,
        postgresPayload,
        plan.slug,
        plan.label,
        plan.sqliteTable,
        stats
      )
    }

    // Summary
    console.log('\n' + '='.repeat(70))
    console.log('✨ Migration to AWS RDS Complete!')
    console.log('='.repeat(70))
    console.log('\n📊 Results:\n')

    const totalExported = stats.reduce((sum, s) => sum + s.exported, 0)
    const totalImported = stats.reduce((sum, s) => sum + s.imported, 0)
    const totalErrors = stats.reduce((sum, s) => sum + s.errors, 0)

    stats.forEach((s) => {
      const icon = s.errors > 0 ? '⚠️' : s.imported > 0 ? '✅' : '⚪'
      console.log(
        `   ${icon} ${s.collection.padEnd(30)} ${s.imported}/${s.exported} imported${s.errors > 0 ? ` (${s.errors} errors)` : ''}`
      )
    })

    console.log('\n' + '-'.repeat(70))
    console.log(`   📈 Total: ${totalImported}/${totalExported} records migrated`)
    if (totalErrors > 0) {
      console.log(`   ⚠️  Total Errors: ${totalErrors}`)
      console.log('\n📝 Error Details:\n')
      stats
        .filter((s) => s.errorMessages.length > 0)
        .forEach((s) => {
          console.log(`   ${s.collection}:`)
          s.errorMessages.slice(0, 3).forEach((msg) => {
            console.log(`      - ${msg}`)
          })
          if (s.errorMessages.length > 3) {
            console.log(`      ... and ${s.errorMessages.length - 3} more`)
          }
        })
    }

    console.log('\n📝 Next Steps:')
    console.log(`   1. Access your application at: http://${process.env.ALB_DNS || 'your-alb-dns'}`)
    console.log('   2. Verify your data in the admin panel')
    console.log('   3. Check error details above if any migrations failed\n')
  } catch (error) {
    console.error('\n❌ Migration failed:', error)
    process.exit(1)
  }
}

async function migrateCollection(
  sourcePayload: any,
  targetPayload: any,
  collectionSlug: string,
  label: string,
  sqliteTable?: string,
  stats: MigrationStats[] = []
) {
  console.log(`📦 Migrating ${label}...`)

  const collectionStats: MigrationStats = {
    collection: label,
    exported: 0,
    imported: 0,
    errors: 0,
    errorMessages: [],
  }

  try {
    // Read from SQLite
    const { docs } = await sourcePayload.find({
      collection: collectionSlug as any,
      limit: 100000,
      depth: 0,
      pagination: false,
    })

    collectionStats.exported = docs.length

    if (docs.length === 0) {
      console.log('   ⚪ No data\n')
      stats.push(collectionStats)
      return
    }

    // Import to PostgreSQL one by one
    for (let i = 0; i < docs.length; i++) {
      const doc = docs[i]
      try {
        // Remove auto-generated fields that will be recreated
        const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...data } = doc

        // Create in target database
        await targetPayload.create({
          collection: collectionSlug as any,
          data,
          depth: 0,
        })

        collectionStats.imported++

        // Progress indicator
        if ((i + 1) % 10 === 0 || i === docs.length - 1) {
          process.stdout.write(`\r   ⏳ ${collectionStats.imported}/${docs.length}`)
        }
      } catch (error) {
        collectionStats.errors++
        const errorMsg = (error as Error).message.substring(0, 100)
        if (collectionStats.errorMessages.length < 5) {
          collectionStats.errorMessages.push(errorMsg)
        }
      }
    }

    console.log(`\r   ✅ ${collectionStats.imported}/${docs.length}\n`)
  } catch (error) {
    const errorMsg = (error as Error).message
    console.log(`\n   ❌ Error: ${errorMsg.substring(0, 80)}\n`)
    collectionStats.errorMessages.push(errorMsg)
  }

  stats.push(collectionStats)
}

migrateViaPayloadAPI()

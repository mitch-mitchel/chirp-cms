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

// Helper function to generate valid slug
function _generateSlug(text: string, existingSlugs: Set<string>): string {
  if (!text) {
    text = 'untitled'
  }

  // Convert to lowercase and replace spaces/special chars with hyphens
  const slug = text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens

  // Ensure uniqueness
  let finalSlug = slug
  let counter = 1
  while (existingSlugs.has(finalSlug)) {
    finalSlug = `${slug}-${counter}`
    counter++
  }

  existingSlugs.add(finalSlug)
  return finalSlug
}

const fixAndMigrate = async () => {
  console.log('🔧 Fixing and Migrating Remaining Data\n')
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
    console.error('❌ DATABASE_URI not found')
    process.exit(1)
  }

  if (!fs.existsSync(sqliteDbPath)) {
    console.error(`❌ SQLite database not found at: ${sqliteDbPath}`)
    process.exit(1)
  }

  console.log(`📂 Source: ${sqliteDbPath}`)
  console.log(`📂 Target: AWS RDS PostgreSQL\n`)
  console.log('='.repeat(70))
  console.log('\n⚠️  Fixing slugs and migrating remaining collections...')
  console.log('   Press Ctrl+C within 5 seconds to cancel...\n')

  await wait(5000)

  let sqlitePayload: any
  let postgresPayload: any
  const stats: MigrationStats[] = []

  try {
    // Connect to SQLite
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

    // Connect to PostgreSQL
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
        push: true,
      }),
      typescript: { outputFile: path.resolve(__dirname, '../payload-types.ts') },
      editor: lexicalEditor({}),
      sharp,
    })

    postgresPayload = await getPayload({ config: postgresConfig })
    console.log('✅ PostgreSQL connected\n')

    console.log('🔄 Starting migration with fixes...\n')

    // Migrate collections with slug issues
    await migrateWithSlugFix(sqlitePayload, postgresPayload, 'articles', 'Articles', stats)
    await migrateWithSlugFix(sqlitePayload, postgresPayload, 'events', 'Events', stats)
    await migrateWithSlugFix(sqlitePayload, postgresPayload, 'podcasts', 'Podcasts', stats)
    await migrateWithSlugFix(sqlitePayload, postgresPayload, 'pages', 'Pages', stats)
    await migrateWithSlugFix(sqlitePayload, postgresPayload, 'shopItems', 'Shop Items', stats)

    // Summary
    console.log('\n' + '='.repeat(70))
    console.log('✨ Fix and Migration Complete!')
    console.log('='.repeat(70))
    console.log('\n📊 Results:\n')

    const totalExported = stats.reduce((sum, s) => sum + s.exported, 0)
    const totalImported = stats.reduce((sum, s) => sum + s.imported, 0)
    const totalErrors = stats.reduce((sum, s) => sum + s.errors, 0)

    stats.forEach((s) => {
      const icon = s.errors > 0 ? '⚠️' : s.imported > 0 ? '✅' : '⚪'
      const percentage = s.exported > 0 ? Math.round((s.imported / s.exported) * 100) : 0
      console.log(
        `   ${icon} ${s.collection.padEnd(30)} ${s.imported}/${s.exported} (${percentage}%)${s.errors > 0 ? ` - ${s.errors} errors` : ''}`
      )
    })

    console.log('\n' + '-'.repeat(70))
    console.log(`   📈 Total: ${totalImported}/${totalExported} records migrated`)
    if (totalErrors > 0) {
      console.log(`   ⚠️  Total Errors: ${totalErrors}`)
      console.log('\n📝 Error Sample:\n')
      stats
        .filter((s) => s.errorMessages.length > 0)
        .forEach((s) => {
          console.log(`   ${s.collection}:`)
          s.errorMessages.slice(0, 2).forEach((msg) => {
            console.log(`      - ${msg}`)
          })
        })
    }

    console.log('\n📝 Next Steps:')
    console.log(`   1. Access your application at: http://${process.env.ALB_DNS}`)
    console.log('   2. Verify your data in the admin panel\n')
  } catch (error) {
    console.error('\n❌ Migration failed:', error)
    process.exit(1)
  }
}

async function migrateWithSlugFix(
  sourcePayload: any,
  targetPayload: any,
  collectionSlug: string,
  label: string,
  stats: MigrationStats[]
) {
  console.log(`📦 Migrating ${label} (with slug fixes)...`)

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

    const existingSlugs = new Set<string>()

    // Import to PostgreSQL with fixed slugs
    for (let i = 0; i < docs.length; i++) {
      const doc = docs[i]
      try {
        // Remove auto-generated fields
        const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, slug: _slug, ...data } = doc

        // DON'T pass slug - let Payload's hook generate it
        // This avoids validation issues
        // Payload will auto-generate unique slugs from title via formatSlugHook

        // Make titles unique if needed to ensure unique slug generation
        if (data.title) {
          const titleKey = `${collectionSlug}-${data.title}`
          if (existingSlugs.has(titleKey)) {
            data.title = `${data.title} (${i})`
          }
          existingSlugs.add(titleKey)
        }

        // Handle transaction IDs for donations/purchases
        if (data.transactionId === null || data.transactionId === undefined) {
          data.transactionId = `TXN-${Date.now()}-${i}`
        }

        // Create in target database
        await targetPayload.create({
          collection: collectionSlug as any,
          data,
          depth: 0,
          overrideAccess: true, // Skip access control during migration
        })

        collectionStats.imported++

        // Progress indicator
        if ((i + 1) % 5 === 0 || i === docs.length - 1) {
          process.stdout.write(`\r   ⏳ ${collectionStats.imported}/${docs.length}`)
        }
      } catch (error) {
        collectionStats.errors++
        const errorMsg = (error as Error).message.substring(0, 150)
        if (collectionStats.errorMessages.length < 3) {
          collectionStats.errorMessages.push(errorMsg)
        }
      }
    }

    console.log(`\r   ✅ ${collectionStats.imported}/${docs.length}\n`)
  } catch (error) {
    const errorMsg = (error as Error).message
    console.log(`\n   ❌ Error: ${errorMsg.substring(0, 100)}\n`)
    collectionStats.errorMessages.push(errorMsg)
  }

  stats.push(collectionStats)
}

fixAndMigrate()

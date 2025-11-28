import { getPayload } from 'payload'
import { buildConfig } from 'payload'
import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import sharp from 'sharp'
import pg from 'pg'

// Import collections for SQLite connection
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
const { Pool } = pg

interface MigrationStats {
  collection: string
  exported: number
  imported: number
  errors: number
  errorMessages: string[]
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// Helper function to generate valid slug
function generateSlug(text: string, existingSlugs: Set<string>): string {
  if (!text) {
    text = 'untitled'
  }

  const slug = text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '')

  let finalSlug = slug
  let counter = 1
  while (existingSlugs.has(finalSlug)) {
    finalSlug = `${slug}-${counter}`
    counter++
  }

  existingSlugs.add(finalSlug)
  return finalSlug
}

const migrateDirectToPostgres = async () => {
  console.log('🔧 Direct PostgreSQL Migration (Bypassing Validation)\n')
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
  console.log('\n⚠️  Migrating directly to PostgreSQL tables...')
  console.log('   Press Ctrl+C within 5 seconds to cancel...\n')

  await wait(5000)

  let sqlitePayload: any
  let pgPool: pg.Pool | null = null
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

    // Connect to PostgreSQL with SSL
    console.log('📥 Connecting to AWS RDS PostgreSQL...\n')
    pgPool = new Pool({
      connectionString: postgresUri,
      ssl: {
        rejectUnauthorized: false,
      },
    })
    await pgPool.query('SELECT 1')
    console.log('✅ PostgreSQL connected\n')

    console.log('🔄 Starting direct migration...\n')

    // Migrate collections with direct SQL
    await migrateArticlesDirect(sqlitePayload, pgPool, stats)
    await migrateEventsDirect(sqlitePayload, pgPool, stats)
    await migratePodcastsDirect(sqlitePayload, pgPool, stats)
    // Pages and shop items already migrated successfully in previous run
    // await migratePagesDirect(sqlitePayload, pgPool, stats)
    // await migrateShopItemsDirect(sqlitePayload, pgPool, stats)

    // Summary
    console.log('\n' + '='.repeat(70))
    console.log('✨ Direct Migration Complete!')
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
  } finally {
    if (pgPool) {
      await pgPool.end()
      console.log('🔄 Closed connections\n')
    }
  }
}

async function migrateArticlesDirect(sourcePayload: any, pgPool: pg.Pool, stats: MigrationStats[]) {
  console.log('📦 Migrating Articles (direct SQL)...')

  const collectionStats: MigrationStats = {
    collection: 'Articles',
    exported: 0,
    imported: 0,
    errors: 0,
    errorMessages: [],
  }

  try {
    const { docs } = await sourcePayload.find({
      collection: 'articles',
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

    // No transaction - insert records individually to avoid rollback on errors
    for (let i = 0; i < docs.length; i++) {
      const doc = docs[i]
      try {
        const slug = doc.slug
          ? generateSlug(doc.slug, existingSlugs)
          : generateSlug(doc.title || `article-${i}`, existingSlugs)

        const now = new Date()

        const client = await pgPool.connect()
        try {
          await client.query(
            `INSERT INTO articles (
              category_id, title, slug, author, featured_image_id, featured_image_url,
              excerpt, content, video_title, youtube_video_id, published_date,
              updated_at, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
            [
              1, // Default to category ID 1 (Music) - category_id is NOT NULL
              doc.title || 'Untitled',
              slug,
              doc.author || 'Unknown',
              doc.featuredImage || null,
              doc.featuredImageUrl || null,
              doc.excerpt || '', // excerpt is NOT NULL
              JSON.stringify(doc.content || {}),
              doc.videoTitle || null,
              doc.youtubeVideoId || null,
              doc.publishedDate || now,
              now,
              now,
            ]
          )
          collectionStats.imported++
        } finally {
          client.release()
        }

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

async function migrateEventsDirect(sourcePayload: any, pgPool: pg.Pool, stats: MigrationStats[]) {
  console.log('📦 Migrating Events (direct SQL)...')

  const collectionStats: MigrationStats = {
    collection: 'Events',
    exported: 0,
    imported: 0,
    errors: 0,
    errorMessages: [],
  }

  try {
    const { docs } = await sourcePayload.find({
      collection: 'events',
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

    // No transaction - insert records individually to avoid rollback on errors
    for (let i = 0; i < docs.length; i++) {
      const doc = docs[i]
      try {
        const slug = doc.slug
          ? generateSlug(doc.slug, existingSlugs)
          : generateSlug(doc.title || `event-${i}`, existingSlugs)

        const now = new Date()

        const client = await pgPool.connect()
        try {
          await client.query(
            `INSERT INTO events (
              category_id, title, slug, excerpt, content, featured_image_id,
              featured_image_url, show_photo_credit, photographer_name, venue_id,
              date, end_date, featured, age_restriction_id, updated_at, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
            [
              2, // Default to category ID 2 (Events) - category_id is NOT NULL
              doc.title || 'Untitled',
              slug,
              doc.excerpt || '', // excerpt is NOT NULL
              JSON.stringify(doc.content || {}),
              doc.featuredImage || null,
              doc.featuredImageUrl || null,
              doc.showPhotoCredit || false,
              doc.photographerName || null,
              1, // Default to venue ID 1 (TBD) - venue_id is NOT NULL
              doc.date || now,
              doc.endDate || null,
              doc.featured || false,
              null, // Set age restriction to NULL (nullable)
              now,
              now,
            ]
          )
          collectionStats.imported++
        } finally {
          client.release()
        }

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

async function migratePodcastsDirect(sourcePayload: any, pgPool: pg.Pool, stats: MigrationStats[]) {
  console.log('📦 Migrating Podcasts (direct SQL)...')

  const collectionStats: MigrationStats = {
    collection: 'Podcasts',
    exported: 0,
    imported: 0,
    errors: 0,
    errorMessages: [],
  }

  try {
    const { docs } = await sourcePayload.find({
      collection: 'podcasts',
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

    // No transaction - insert records individually to avoid rollback on errors
    for (let i = 0; i < docs.length; i++) {
      const doc = docs[i]
      try {
        const slug = doc.slug
          ? generateSlug(doc.slug, existingSlugs)
          : generateSlug(doc.title || `podcast-${i}`, existingSlugs)

        const now = new Date()

        const client = await pgPool.connect()
        try {
          await client.query(
            `INSERT INTO podcasts (
              category_id, title, slug, excerpt, content, host, cover_art_id,
              cover_art_url, sound_cloud_embed_url, pull_quote, pull_quote_attribution,
              additional_info, transcript_url, updated_at, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
            [
              1, // Default to category ID 1 (Music) - category_id is NOT NULL
              doc.title || 'Untitled',
              slug,
              doc.excerpt || '', // excerpt is NOT NULL
              JSON.stringify(doc.content || {}),
              doc.host || null,
              doc.coverArt || null,
              doc.coverArtUrl || null,
              doc.soundCloudEmbedUrl || null,
              doc.pullQuote || null,
              doc.pullQuoteAttribution || null,
              doc.additionalInfo || null,
              doc.transcriptUrl || null,
              now,
              now,
            ]
          )
          collectionStats.imported++
        } finally {
          client.release()
        }

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

async function _migratePagesDirect(sourcePayload: any, pgPool: pg.Pool, stats: MigrationStats[]) {
  console.log('📦 Migrating Pages (direct SQL)...')

  const collectionStats: MigrationStats = {
    collection: 'Pages',
    exported: 0,
    imported: 0,
    errors: 0,
    errorMessages: [],
  }

  try {
    const { docs } = await sourcePayload.find({
      collection: 'pages',
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

    // No transaction - insert records individually to avoid rollback on errors
    for (let i = 0; i < docs.length; i++) {
      const doc = docs[i]
      try {
        const slug = doc.slug
          ? generateSlug(doc.slug, existingSlugs)
          : generateSlug(doc.title || `page-${i}`, existingSlugs)

        const now = new Date()

        const client = await pgPool.connect()
        try {
          await client.query(
            `INSERT INTO pages (
              title, slug, excerpt, layout_template, sidebar_announcement_id,
              sidebar_content_type, sidebar_content_count, sidebar_advertisement_id,
              updated_at, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [
              doc.title || 'Untitled',
              slug,
              doc.excerpt || null,
              doc.layoutTemplate || 'default',
              null, // Set sidebar announcement to NULL - avoid foreign key issues
              doc.sidebarContentType || 'none',
              doc.sidebarContentCount || 3,
              null, // Set sidebar advertisement to NULL - avoid foreign key issues
              now,
              now,
            ]
          )
          collectionStats.imported++
        } finally {
          client.release()
        }

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

async function _migrateShopItemsDirect(
  sourcePayload: any,
  pgPool: pg.Pool,
  stats: MigrationStats[]
) {
  console.log('📦 Migrating Shop Items (direct SQL)...')

  const collectionStats: MigrationStats = {
    collection: 'Shop Items',
    exported: 0,
    imported: 0,
    errors: 0,
    errorMessages: [],
  }

  try {
    const { docs } = await sourcePayload.find({
      collection: 'shopItems',
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

    // No transaction - insert records individually to avoid rollback on errors
    for (let i = 0; i < docs.length; i++) {
      const doc = docs[i]
      try {
        const slug = doc.slug
          ? generateSlug(doc.slug, existingSlugs)
          : generateSlug(doc.name || `shop-item-${i}`, existingSlugs)

        const now = new Date()

        const client = await pgPool.connect()
        try {
          await client.query(
            `INSERT INTO shop_items (
              name, slug, description, price, category, in_stock, featured,
              updated_at, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
              doc.name || 'Untitled',
              slug,
              doc.description || null,
              doc.price || 0,
              doc.category || null,
              doc.inStock !== false,
              doc.featured || false,
              now,
              now,
            ]
          )
          collectionStats.imported++
        } finally {
          client.release()
        }

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

migrateDirectToPostgres()

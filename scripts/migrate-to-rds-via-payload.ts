import { getPayload } from 'payload'
import config from '../payload.config.js'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

interface MigrationStats {
  collection: string
  exported: number
  imported: number
  errors: number
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const migrateToRDSViaPayload = async () => {
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
  console.log('   Press Ctrl+C within 5 seconds to cancel...\n')

  await wait(5000)

  const stats: MigrationStats[] = []

  try {
    // Step 1: Connect to PostgreSQL (target) and ensure schema exists
    console.log('📥 Connecting to AWS RDS PostgreSQL...\n')
    const targetPayload = await getPayload({ config })
    console.log('✅ PostgreSQL connected and schema initialized\n')

    // Step 2: Connect to SQLite (source) to read data
    console.log('📤 Reading data from SQLite...\n')

    // Temporarily switch to SQLite to read data
    const originalDbUri = process.env.DATABASE_URI
    process.env.DATABASE_URI = `file:${sqliteDbPath}`

    const { buildConfig } = await import('payload')
    const { sqliteAdapter } = await import('@payloadcms/db-sqlite')
    const { lexicalEditor } = await import('@payloadcms/richtext-lexical')
    const sharp = (await import('sharp')).default

    // Import all collections dynamically
    const collections = config.collections || []

    const sqliteConfig = buildConfig({
      secret: process.env.PAYLOAD_SECRET || 'your-secret-key-here-change-in-production',
      collections: collections as any,
      globals: config.globals as any,
      db: sqliteAdapter({
        client: { url: `file:${sqliteDbPath}` },
        push: false,
      }),
      typescript: { outputFile: path.resolve(__dirname, '../payload-types.ts') },
      editor: lexicalEditor({}),
      sharp,
    })

    const sourcePayload = await getPayload({ config: sqliteConfig })
    console.log('✅ SQLite connected\n')

    // Restore PostgreSQL connection
    process.env.DATABASE_URI = originalDbUri

    console.log('🔄 Starting migration...\n')

    // Migrate each collection
    const collectionsToMigrate = [
      'categories',
      'venues',
      'users',
      'members',
      'showSchedules',
      'articles',
      'events',
      'podcasts',
      'shopItems',
      'weeklyCharts',
      'volunteerCalendar',
      'announcements',
      'advertisements',
      'ageGate',
      'media',
      'playerFallbackImages',
      'donations',
      'purchases',
      'pages',
      'mobilePageContent',
      'onboarding',
    ]

    for (const collectionSlug of collectionsToMigrate) {
      await migrateCollection(sourcePayload, targetPayload, collectionSlug, stats)
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
        `   ${icon} ${s.collection.padEnd(25)} ${s.imported}/${s.exported} imported${s.errors > 0 ? ` (${s.errors} errors)` : ''}`
      )
    })

    console.log('\n' + '-'.repeat(70))
    console.log(`   📈 Total: ${totalImported}/${totalExported} records migrated`)
    if (totalErrors > 0) {
      console.log(`   ⚠️  Total Errors: ${totalErrors}`)
    }
    console.log('\n📝 Next Steps:')
    console.log(`   1. Access your application at: ${process.env.ALB_DNS || 'your-alb-dns'}`)
    console.log('   2. Verify your data in the admin panel\n')
  } catch (error) {
    console.error('\n❌ Migration failed:', error)
    process.exit(1)
  }
}

async function migrateCollection(
  sourcePayload: any,
  targetPayload: any,
  collectionSlug: string,
  stats: MigrationStats[]
) {
  console.log(`📦 Migrating ${collectionSlug}...`)

  const collectionStats: MigrationStats = {
    collection: collectionSlug,
    exported: 0,
    imported: 0,
    errors: 0,
  }

  try {
    // Read from SQLite
    const { docs } = await sourcePayload.find({
      collection: collectionSlug as any,
      limit: 100000,
      depth: 0,
    })

    collectionStats.exported = docs.length

    if (docs.length === 0) {
      console.log('   ⚠️  No data\n')
      stats.push(collectionStats)
      return
    }

    // Import to PostgreSQL
    for (const doc of docs) {
      try {
        // Remove auto-generated fields
        const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...data } = doc

        await targetPayload.create({
          collection: collectionSlug as any,
          data,
          depth: 0,
        })
        collectionStats.imported++
      } catch (error) {
        console.log(
          `   ❌ Error importing ${collectionSlug} record:`,
          (error as Error).message.substring(0, 60)
        )
        collectionStats.errors++
      }
    }

    console.log(`   ✅ ${collectionStats.imported}/${docs.length}\n`)
  } catch (error) {
    console.log(`   ❌ Error: ${(error as Error).message.substring(0, 60)}\n`)
  }

  stats.push(collectionStats)
}

migrateToRDSViaPayload()

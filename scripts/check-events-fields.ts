import pg from 'pg'
import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config()

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

const { Pool } = pg

// Expected fields based on Events.ts schema
// Note: Payload converts relationship fields to fieldname_id in the database
const expectedFields = [
  'id',
  'category_id',
  'title',
  'slug',
  'excerpt',
  'content',
  'featured_image_id',
  'featured_image_url',
  'show_photo_credit',
  'photographer_name',
  'venue_id',
  'date',
  'end_date',
  'featured',
  'age_restriction_id',
  'updated_at',
  'created_at',
]

async function checkEventsFields() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URI,
    ssl: process.env.DATABASE_URI?.includes('localhost')
      ? undefined
      : { rejectUnauthorized: false },
  })

  const client = await pool.connect()
  try {
    // Get all columns from events table
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'events'
      ORDER BY ordinal_position
    `)

    console.log('\n=== Events Table Schema ===\n')
    const actualFields = result.rows.map((row) => row.column_name)

    result.rows.forEach((row) => {
      const expected = expectedFields.includes(row.column_name) ? '✓' : '?'
      console.log(
        `${expected} ${row.column_name.padEnd(30)} ${row.data_type.padEnd(20)} ${row.is_nullable === 'YES' ? 'nullable' : 'required'}`
      )
    })

    console.log('\n=== Field Analysis ===\n')

    // Check for unexpected fields
    const unexpectedFields = actualFields.filter((field) => !expectedFields.includes(field))
    if (unexpectedFields.length > 0) {
      console.log('⚠️  Unexpected fields in database (not in schema):')
      unexpectedFields.forEach((field) => console.log(`   - ${field}`))
    } else {
      console.log('✓ No unexpected fields found')
    }

    // Check for missing fields
    const missingFields = expectedFields.filter((field) => !actualFields.includes(field))
    if (missingFields.length > 0) {
      console.log('\n⚠️  Fields in schema but not in database:')
      missingFields.forEach((field) => console.log(`   - ${field}`))
    } else {
      console.log('\n✓ All schema fields exist in database')
    }

    // Check if there are any null venue_id or category_id values
    const nullChecks = await client.query(`
      SELECT
        COUNT(*) FILTER (WHERE venue_id IS NULL) as null_venues,
        COUNT(*) FILTER (WHERE category_id IS NULL) as null_categories,
        COUNT(*) as total_events
      FROM events
    `)

    console.log('\n=== Data Validation ===\n')
    console.log(`Total events: ${nullChecks.rows[0].total_events}`)
    console.log(`Events with null venue: ${nullChecks.rows[0].null_venues}`)
    console.log(`Events with null category: ${nullChecks.rows[0].null_categories}`)

    if (nullChecks.rows[0].null_venues > 0 || nullChecks.rows[0].null_categories > 0) {
      console.log('\n⚠️  Found events with null required relationships!')
      console.log('This may cause the "Cannot read properties of undefined" error.')
    }
  } finally {
    client.release()
    await pool.end()
  }
}

checkEventsFields().catch(console.error)

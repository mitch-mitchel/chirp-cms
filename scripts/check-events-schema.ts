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

const pool = new Pool({
  connectionString: process.env.DATABASE_URI,
  ssl: { rejectUnauthorized: false },
})

const client = await pool.connect()
try {
  const result = await client.query(`
    SELECT column_name, is_nullable
    FROM information_schema.columns 
    WHERE table_name = 'events'
    ORDER BY ordinal_position
  `)
  console.log('Events table schema (nullable columns):')
  result.rows.forEach((row) => {
    console.log(`  ${row.column_name}: ${row.is_nullable}`)
  })

  // Check if we have any venues
  const venues = await client.query('SELECT id, name FROM venues LIMIT 5')
  console.log('\nAvailable venues:')
  venues.rows.forEach((v) => console.log(`  ID: ${v.id}, Name: ${v.name}`))
} finally {
  client.release()
  await pool.end()
}

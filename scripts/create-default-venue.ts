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
  const now = new Date()
  const result = await client.query(
    `
    INSERT INTO venues (name, address, city, state, zip, phone, website, map_url, updated_at, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING id
  `,
    ['TBD', null, null, null, null, null, null, null, now, now]
  )

  console.log(`Created default venue with ID: ${result.rows[0].id}`)

  const venues = await client.query('SELECT id, name FROM venues')
  console.log('All venues:')
  venues.rows.forEach((v) => console.log(`  ID: ${v.id}, Name: ${v.name}`))
} finally {
  client.release()
  await pool.end()
}

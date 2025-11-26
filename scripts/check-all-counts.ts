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
  const tables = [
    'articles',
    'events',
    'podcasts',
    'pages',
    'shop_items',
    'categories',
    'venues',
    'announcements',
    'advertisements',
    'age_gate',
    'onboarding',
  ]

  console.log('Record counts in PostgreSQL:\n')
  for (const table of tables) {
    try {
      const result = await client.query(`SELECT COUNT(*) FROM ${table}`)
      console.log(`  ${table}: ${result.rows[0].count}`)
    } catch {
      console.log(`  ${table}: ERROR`)
    }
  }
} finally {
  client.release()
  await pool.end()
}

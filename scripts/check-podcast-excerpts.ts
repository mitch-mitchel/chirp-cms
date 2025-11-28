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
  console.log('Checking podcast excerpts in PostgreSQL database:\n')

  const result = await client.query(`
    SELECT id, title, excerpt
    FROM podcasts
    ORDER BY id
    LIMIT 10
  `)

  console.log(`Found ${result.rows.length} podcasts:\n`)

  result.rows.forEach((podcast) => {
    console.log(`ID: ${podcast.id}`)
    console.log(`Title: ${podcast.title}`)
    console.log(`Excerpt: ${podcast.excerpt || '(no excerpt)'}`)
    console.log('---')
  })
} catch (error) {
  console.error('Error:', error)
} finally {
  client.release()
  await pool.end()
}

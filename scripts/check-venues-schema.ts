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
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns 
    WHERE table_name = 'venues'
    ORDER BY ordinal_position
  `)
  console.log('Venues table schema:')
  result.rows.forEach((row) => {
    console.log(`  ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`)
  })
} finally {
  client.release()
  await pool.end()
}

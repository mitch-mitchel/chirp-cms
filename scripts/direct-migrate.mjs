#!/usr/bin/env node
import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import path from 'path'
import pg from 'pg'

const require = createRequire(import.meta.url)
const sqlite3 = require('@libsql/darwin-arm64')

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const { Pool } = pg

const SQLITE_DB = path.resolve(__dirname, '../data-backups/payload.db')
const PG_URI = 'postgresql://chirp:chirp_dev_password@localhost:5432/chirp_cms'

const COLLECTIONS = [
  'categories',
  'venues',
  'announcements',
  'advertisements',
  'articles',
  'events',
  'podcasts',
  'shop_items',
  'weekly_charts',
  'volunteer_calendar',
  'pages',
  'age_gate',
  'donations',
  'purchases',
  'onboarding',
]

async function migrate() {
  console.log('🚀 Starting SQLite to PostgreSQL migration...\n')

  // We'll use command line sqlite3 and pg
  const { exec } = await import('child_process')
  const { promisify } = await import('util')
  const execPromise = promisify(exec)

  // Connect to PostgreSQL
  const pgPool = new Pool({ connectionString: PG_URI })
  await pgPool.query('SELECT 1')
  console.log('✅ Connected to PostgreSQL\n')

  for (const table of COLLECTIONS) {
    try {
      console.log(`📦 Migrating ${table}...`)

      // Get count from SQLite
      const countResult = await execPromise(`sqlite3 "${SQLITE_DB}" "SELECT COUNT(*) FROM ${table}"`)
      const count = parseInt(countResult.stdout.trim())

      if (count === 0) {
        console.log(`   ⚠️  No data found\n`)
        continue
      }

      console.log(`   📥 Found ${count} records`)

      // Get data from SQLite as JSON
      const dataResult = await execPromise(
        `sqlite3 -json "${SQLITE_DB}" "SELECT * FROM ${table}"`
      )
      const rows = JSON.parse(dataResult.stdout)

      // Clear PostgreSQL table
      await pgPool.query(`DELETE FROM ${table}`)
      console.log(`   🗑️  Cleared existing data`)

      // Insert data
      let imported = 0
      let errors = 0

      for (const row of rows) {
        try {
          // Get column names (exclude id)
          const columns = Object.keys(row).filter((k) => k !== 'id')
          const values = []
          const placeholders = []

          for (let i = 0; i < columns.length; i++) {
            const col = columns[i]
            const value = row[col]

            // Check if value looks like JSON
            if (
              typeof value === 'string' &&
              (value.startsWith('{') || value.startsWith('['))
            ) {
              try {
                JSON.parse(value)
                placeholders.push(`$${i + 1}::jsonb`)
              } catch {
                placeholders.push(`$${i + 1}`)
              }
            } else {
              placeholders.push(`$${i + 1}`)
            }

            values.push(value)
          }

          // Build and execute INSERT
          const query = `
            INSERT INTO ${table} (${columns.join(', ')})
            VALUES (${placeholders.join(', ')})
          `

          await pgPool.query(query, values)
          imported++
        } catch (error) {
          errors++
          if (errors <= 3) {
            console.log(`   ⚠️  Error: ${error.message.substring(0, 80)}`)
          }
        }
      }

      console.log(
        `   ✅ Imported ${imported}/${count} records${errors > 0 ? ` (${errors} errors)` : ''}\n`
      )
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}\n`)
    }
  }

  await pgPool.end()
  console.log('\n✨ Migration complete!\n')
}

migrate().catch((error) => {
  console.error('❌ Migration failed:', error)
  process.exit(1)
})

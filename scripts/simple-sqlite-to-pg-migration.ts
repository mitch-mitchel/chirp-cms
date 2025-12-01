#!/usr/bin/env ts-node
import Database from 'better-sqlite3'
import pg from 'pg'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const { Pool } = pg

const collections = [
  { sqlite: 'categories', postgres: 'categories' },
  { sqlite: 'venues', postgres: 'venues' },
  { sqlite: 'announcements', postgres: 'announcements' },
  { sqlite: 'advertisements', postgres: 'advertisements' },
  { sqlite: 'articles', postgres: 'articles' },
  { sqlite: 'events', postgres: 'events' },
  { sqlite: 'podcasts', postgres: 'podcasts' },
  { sqlite: 'listeners', postgres: 'listeners' },
  { sqlite: 'shop_items', postgres: 'shop_items' },
  { sqlite: 'weekly_charts', postgres: 'weekly_charts' },
  { sqlite: 'volunteer_calendar', postgres: 'volunteer_calendar' },
  { sqlite: 'pages', postgres: 'pages' },
  { sqlite: 'age_gate', postgres: 'age_gate' },
  { sqlite: 'donations', postgres: 'donations' },
  { sqlite: 'purchases', postgres: 'purchases' },
  { sqlite: 'onboarding', postgres: 'onboarding' },
]

async function migrate() {
  console.log('🚀 Starting simple SQLite to PostgreSQL migration...\n')

  const sqliteDbPath = path.resolve(__dirname, '../data-backups/payload.db')
  const postgresUri = 'postgresql://chirp:chirp_dev_password@localhost:5432/chirp_cms'

  // Connect to SQLite
  const sqliteDb = new Database(sqliteDbPath, { readonly: true })
  console.log('✅ Connected to SQLite\n')

  // Connect to PostgreSQL
  const pgPool = new Pool({ connectionString: postgresUri })
  await pgPool.query('SELECT 1')
  console.log('✅ Connected to PostgreSQL\n')

  for (const { sqlite, postgres } of collections) {
    try {
      console.log(`📦 Migrating ${sqlite}...`)

      // Get data from SQLite
      const rows = sqliteDb.prepare(`SELECT * FROM ${sqlite}`).all()

      if (rows.length === 0) {
        console.log(`   ⚠️  No data found\n`)
        continue
      }

      console.log(`   📥 Found ${rows.length} records`)

      // Delete existing data in PostgreSQL
      await pgPool.query(`DELETE FROM ${postgres}`)
      console.log(`   🗑️  Cleared existing data`)

      // Insert data into PostgreSQL
      let imported = 0
      let errors = 0

      for (const row of rows) {
        try {
          // Get column names and values
          const columns = Object.keys(row).filter((k) => k !== 'id')
          const values: any[] = []
          const placeholders: string[] = []

          let paramIndex = 1
          for (const col of columns) {
            const value = row[col as keyof typeof row]

            // Check if the value looks like JSON (for jsonb columns)
            if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
              try {
                // Validate it's proper JSON
                JSON.parse(value)
                // For jsonb columns in PostgreSQL, we need to cast
                placeholders.push(`$${paramIndex}::jsonb`)
                values.push(value)
              } catch {
                // Not valid JSON, treat as string
                placeholders.push(`$${paramIndex}`)
                values.push(value)
              }
            } else {
              placeholders.push(`$${paramIndex}`)
              values.push(value)
            }
            paramIndex++
          }

          // Build and execute INSERT query
          const query = `
            INSERT INTO ${postgres} (${columns.join(', ')})
            VALUES (${placeholders.join(', ')})
          `

          await pgPool.query(query, values)
          imported++
        } catch (error) {
          errors++
          if (errors <= 3) {
            console.log(
              `   ⚠️  Error inserting record: ${(error as Error).message.substring(0, 80)}`
            )
          }
        }
      }

      console.log(
        `   ✅ Imported ${imported}/${rows.length} records${errors > 0 ? ` (${errors} errors)` : ''}\n`
      )
    } catch (error) {
      console.log(`   ❌ Error: ${(error as Error).message}\n`)
    }
  }

  // Close connections
  sqliteDb.close()
  await pgPool.end()

  console.log('\n✨ Migration complete!\n')
  process.exit(0)
}

migrate().catch((error) => {
  console.error('❌ Migration failed:', error)
  process.exit(1)
})

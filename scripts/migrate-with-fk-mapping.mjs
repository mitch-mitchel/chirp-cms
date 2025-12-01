#!/usr/bin/env node
import { fileURLToPath } from 'url'
import path from 'path'
import pg from 'pg'
import { exec } from 'child_process'
import { promisify } from 'util'

const execPromise = promisify(exec)

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const { Pool } = pg

const SQLITE_DB = path.resolve(__dirname, '../data-backups/payload.db')
const PG_URI = 'postgresql://chirp:chirp_dev_password@localhost:5432/chirp_cms'

// Store ID mappings from SQLite to PostgreSQL
const idMappings = {
  categories: new Map(),
  venues: new Map(),
  media: new Map(),
  age_gate: new Map(),
  listeners: new Map(),
  shop_items: new Map(),
}

async function getSQLiteData(table) {
  const result = await execPromise(`sqlite3 -json "${SQLITE_DB}" "SELECT * FROM ${table}"`)
  return JSON.parse(result.stdout)
}

async function buildIdMapping(pgPool, table, nameField = 'name') {
  console.log(`   📋 Building ID mapping for ${table}...`)

  // Get SQLite data
  const sqliteData = await getSQLiteData(table)

  // Get PostgreSQL data
  const pgResult = await pgPool.query(`SELECT id, ${nameField} FROM ${table}`)

  // Create mapping based on name matching
  for (const sqliteRow of sqliteData) {
    const pgRow = pgResult.rows.find(r => r[nameField] === sqliteRow[nameField])
    if (pgRow) {
      idMappings[table].set(sqliteRow.id, pgRow.id)
    }
  }

  console.log(`   ✓ Mapped ${idMappings[table].size} ${table} IDs`)
}

async function migrateWithForeignKeys(pgPool, table, config) {
  console.log(`\n📦 Migrating ${table} with foreign key updates...`)

  try {
    // Get SQLite data
    const rows = await getSQLiteData(table)

    if (rows.length === 0) {
      console.log(`   ⚠️  No data found`)
      return
    }

    console.log(`   📥 Found ${rows.length} records`)

    // Clear PostgreSQL table
    await pgPool.query(`DELETE FROM ${table}`)
    console.log(`   🗑️  Cleared existing data`)

    let imported = 0
    let errors = 0

    for (const row of rows) {
      try {
        // Update foreign key references
        const updatedRow = { ...row }

        for (const [fkField, refTable] of Object.entries(config.foreignKeys || {})) {
          if (updatedRow[fkField] && idMappings[refTable]) {
            const newId = idMappings[refTable].get(updatedRow[fkField])
            if (newId) {
              updatedRow[fkField] = newId
            } else {
              // If no mapping found, set to null (ON DELETE SET NULL)
              updatedRow[fkField] = null
            }
          }
        }

        // Get column names (exclude id)
        const columns = Object.keys(updatedRow).filter(k => k !== 'id')
        const values = []
        const placeholders = []

        for (let i = 0; i < columns.length; i++) {
          const col = columns[i]
          const value = updatedRow[col]

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
          console.log(`   ⚠️  Error: ${error.message.substring(0, 100)}`)
        }
      }
    }

    console.log(`   ✅ Imported ${imported}/${rows.length} records${errors > 0 ? ` (${errors} errors)` : ''}`)
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`)
  }
}

async function migrateSpecialTable(pgPool, table) {
  console.log(`\n📦 Migrating ${table}...`)

  try {
    const rows = await getSQLiteData(table)

    if (rows.length === 0) {
      console.log(`   ⚠️  No data found`)
      return
    }

    console.log(`   📥 Found ${rows.length} records`)
    await pgPool.query(`DELETE FROM ${table}`)
    console.log(`   🗑️  Cleared existing data`)

    let imported = 0
    let errors = 0

    for (const row of rows) {
      try {
        // Get column names, excluding problematic ones
        let columns = Object.keys(row).filter(k => k !== 'id')

        // For pages, exclude song_request columns that don't exist in PG schema
        if (table === 'pages') {
          columns = columns.filter(k =>
            k !== 'song_request_cooldown_minutes' &&
            k !== 'song_request_cooldown_message'
          )
        }

        // For onboarding, handle the "order" column (reserved keyword)
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

        // Build query with quoted column names for reserved keywords
        const quotedColumns = columns.map(c => `"${c}"`).join(', ')
        const query = `
          INSERT INTO ${table} (${quotedColumns})
          VALUES (${placeholders.join(', ')})
        `

        await pgPool.query(query, values)
        imported++
      } catch (error) {
        errors++
        if (errors <= 3) {
          console.log(`   ⚠️  Error: ${error.message.substring(0, 100)}`)
        }
      }
    }

    console.log(`   ✅ Imported ${imported}/${rows.length} records${errors > 0 ? ` (${errors} errors)` : ''}`)
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`)
  }
}

async function migrate() {
  console.log('🚀 Starting Foreign Key Aware Migration...\n')

  const pgPool = new Pool({ connectionString: PG_URI })
  await pgPool.query('SELECT 1')
  console.log('✅ Connected to PostgreSQL\n')

  console.log('📋 Step 1: Building ID mappings...\n')

  // Build mappings for already-migrated tables
  await buildIdMapping(pgPool, 'categories', 'name')
  await buildIdMapping(pgPool, 'venues', 'name')
  await buildIdMapping(pgPool, 'age_gate', 'age')

  console.log('\n📦 Step 2: Migrating collections with foreign keys...\n')

  // Migrate events with FK updates
  await migrateWithForeignKeys(pgPool, 'events', {
    foreignKeys: {
      category_id: 'categories',
      venue_id: 'venues',
      age_restriction_id: 'age_gate',
      featured_image_id: 'media', // will be null if media not migrated
    }
  })

  // Migrate podcasts with FK updates
  await migrateWithForeignKeys(pgPool, 'podcasts', {
    foreignKeys: {
      category_id: 'categories',
      cover_art_id: 'media', // will be null if media not migrated
    }
  })

  // For donations and purchases, we need listener mapping
  // Since listeners migration failed earlier, we'll skip these or set FKs to null
  console.log('\n📦 Step 3: Migrating donations and purchases...\n')
  console.log('   ⚠️  Note: listener_id references will be set to NULL (listeners collection has issues)')

  await migrateWithForeignKeys(pgPool, 'donations', {
    foreignKeys: {
      member_id: 'listeners', // will be null
    }
  })

  await migrateWithForeignKeys(pgPool, 'purchases', {
    foreignKeys: {
      member_id: 'listeners', // will be null
      shop_item_id: 'shop_items',
    }
  })

  console.log('\n📦 Step 4: Migrating special tables (pages, onboarding)...\n')

  // Migrate pages (excluding problematic columns)
  await migrateSpecialTable(pgPool, 'pages')

  // Migrate onboarding (with quoted column names for reserved keywords)
  await migrateSpecialTable(pgPool, 'onboarding')

  await pgPool.end()
  console.log('\n✨ Migration complete!\n')
}

migrate().catch((error) => {
  console.error('❌ Migration failed:', error)
  process.exit(1)
})

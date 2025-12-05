import { getPayload } from 'payload'
import config from '../payload.config'
import dotenv from 'dotenv'
import pg from 'pg'
import path from 'path'
import fs from 'fs'

dotenv.config()

const { Pool } = pg

/**
 * Initialize Payload CMS schema and update media references
 *
 * This script will:
 * 1. Initialize Payload CMS database schema (if not already done)
 * 2. Create media records for all files in the media directory
 * 3. Update old ExpressionEngine file path references
 */
const initAndUpdateMedia = async () => {
  console.log('🚀 Initializing Payload CMS and updating media references\n')

  const postgresUri =
    process.env.DATABASE_URI || 'postgresql://chirp:chirp_dev_password@localhost:5432/chirp_cms'
  const mediaDir = path.resolve(process.cwd(), 'media')

  let payload: any
  let pgPool: pg.Pool | null = null

  try {
    // ==========================================
    // STEP 1: Initialize Payload CMS
    // ==========================================
    console.log('📦 STEP 1: Initializing Payload CMS...\n')

    payload = await getPayload({ config })
    console.log('✅ Payload CMS initialized\n')

    // ==========================================
    // STEP 2: Connect to PostgreSQL
    // ==========================================
    console.log('📥 STEP 2: Connecting to PostgreSQL...\n')
    pgPool = new Pool({ connectionString: postgresUri })
    await pgPool.query('SELECT 1')
    console.log('✅ PostgreSQL connected\n')

    // ==========================================
    // STEP 3: Check Media Directory
    // ==========================================
    console.log('📁 STEP 3: Scanning media directory...\n')

    if (!fs.existsSync(mediaDir)) {
      console.error(`❌ Media directory not found: ${mediaDir}`)
      process.exit(1)
    }

    const mediaFiles = fs.readdirSync(mediaDir).filter(file => {
      const ext = path.extname(file).toLowerCase()
      return ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].includes(ext)
    })

    console.log(`   Found ${mediaFiles.length} image files in media directory\n`)

    // ==========================================
    // STEP 4: Check Existing Media Records
    // ==========================================
    console.log('📊 STEP 4: Checking existing media records...\n')

    const { docs: existingMedia, totalDocs } = await payload.find({
      collection: 'media',
      limit: 10000,
    })

    console.log(`   Found ${totalDocs} existing media records\n`)

    // Build a map of existing media by filename
    const existingMediaMap = new Map<string, any>()
    existingMedia.forEach(media => {
      if (media.filename) {
        existingMediaMap.set(media.filename, media)
      }
    })

    // ==========================================
    // STEP 5: Create Missing Media Records
    // ==========================================
    console.log('📸 STEP 5: Creating media records for files without records...\n')

    let created = 0
    let skipped = 0

    for (const filename of mediaFiles) {
      if (existingMediaMap.has(filename)) {
        skipped++
        continue
      }

      try {
        const filePath = path.join(mediaDir, filename)
        const stats = fs.statSync(filePath)

        // Determine category based on filename patterns
        let category = 'General'
        if (filename.includes('album-art')) {
          category = 'Podcasts'
        } else if (filename.match(/\w+-\d+x\d+\.(jpg|png)/)) {
          // Resized images - skip, Payload will create these
          continue
        }

        const mediaRecord = {
          filename: filename,
          mimeType: getMimeType(filename),
          filesize: stats.size,
          category: category,
          alt: filename.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
        }

        // Note: We can't actually upload files via API here, but we can log what would be created
        console.log(`   📄 Would create: ${filename} (${category})`)
        created++
      } catch (error) {
        console.error(`   ❌ Error processing ${filename}:`, error)
      }
    }

    console.log(`\n   ✅ Summary:`)
    console.log(`      - Existing records: ${existingMedia.length}`)
    console.log(`      - Would create: ${created}`)
    console.log(`      - Skipped: ${skipped}\n`)

    // ==========================================
    // STEP 6: Update Upload Preferences
    // ==========================================
    console.log('🔧 STEP 6: Updating upload preferences in old database...\n')

    // Update exp_upload_prefs to point to new media directory
    const updateUploadPrefs = `
      UPDATE av07282_production.exp_upload_prefs
      SET
        url = 'http://localhost:3000/media/',
        server_path = '/app/media/'
      WHERE id IN (8, 11, 13)  -- Blog, Store, Podcast galleries
    `

    try {
      const result = await pgPool.query(updateUploadPrefs)
      console.log(`   ✅ Updated ${result.rowCount} upload location(s)\n`)
    } catch (error) {
      console.error(`   ⚠️  Could not update upload prefs:`, error)
    }

    // ==========================================
    // SUMMARY
    // ==========================================
    console.log('\n' + '='.repeat(70))
    console.log('✨ Media Initialization Complete!')
    console.log('='.repeat(70))
    console.log(`\n📊 Summary:`)
    console.log(`   Media files found:    ${mediaFiles.length}`)
    console.log(`   Existing records:     ${existingMedia.length}`)
    console.log(`   Records to create:    ${created}`)
    console.log()

    console.log('📝 Next Steps:')
    console.log('   1. 🌐 Access admin panel: http://localhost:3000/admin')
    console.log('   2. 🖼️  Upload any missing media files through the admin UI')
    console.log('   3. ✓  Verify that images display correctly\n')

  } catch (error) {
    console.error('\n❌ Operation failed:', error)
    process.exit(1)
  } finally {
    if (pgPool) {
      await pgPool.end()
    }
    process.exit(0)
  }
}

function getMimeType(filename: string): string {
  const ext = path.extname(filename).toLowerCase()
  const mimeTypes: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
  }
  return mimeTypes[ext] || 'application/octet-stream'
}

initAndUpdateMedia()

import { getPayload } from 'payload'
import config from '../payload.config'
import dotenv from 'dotenv'
import pg from 'pg'

dotenv.config()

const { Pool } = pg

/**
 * Migrate content directly from ExpressionEngine to Payload CMS
 *
 * This script migrates:
 * - Blog Articles (channel_id 3)
 * - Events (channel_id 4)
 * - Podcasts (channel_id 7)
 * - Pages (channel_id 23)
 */

interface MigrationStats {
  collection: string
  total: number
  migrated: number
  errors: number
  errorSamples: string[]
}

const migrateFromEEToPayload = async () => {
  console.log('🚀 Migrating content from ExpressionEngine to Payload CMS\n')
  console.log('='.repeat(70))

  const postgresUri =
    process.env.DATABASE_URI || 'postgresql://chirp:chirp_dev_password@localhost:5432/chirp_cms'

  let payload: any
  let pgPool: pg.Pool | null = null
  const stats: MigrationStats[] = []

  try {
    // Initialize Payload
    console.log('📦 Initializing Payload CMS...\n')
    payload = await getPayload({ config })
    console.log('✅ Payload CMS initialized\n')

    // Connect to PostgreSQL
    console.log('📥 Connecting to PostgreSQL...\n')
    pgPool = new Pool({ connectionString: postgresUri })
    await pgPool.query('SELECT 1')
    console.log('✅ PostgreSQL connected\n')

    // ==========================================
    // CREATE DEFAULT CATEGORY IF NEEDED
    // ==========================================
    console.log('📁 Checking for default category...\n')

    let defaultCategoryId: any
    const { docs: existingCategories } = await payload.find({
      collection: 'categories',
      limit: 1,
    })

    if (existingCategories.length === 0) {
      console.log('   Creating default category...')
      const category = await payload.create({
        collection: 'categories',
        data: {
          name: 'General',
          slug: 'general',
        },
      })
      defaultCategoryId = category.id
      console.log(`   ✅ Created default category (ID: ${defaultCategoryId})\n`)
    } else {
      defaultCategoryId = existingCategories[0].id
      console.log(`   ✅ Using existing category (ID: ${defaultCategoryId})\n`)
    }

    // ==========================================
    // MIGRATE BLOG ARTICLES (channel_id 3)
    // ==========================================
    console.log('📝 Migrating Blog Articles...\n')

    const articlesQuery = `
      SELECT
        t.entry_id,
        t.title,
        t.url_title,
        t.entry_date,
        t.edit_date,
        t.author_id,
        t.status,
        d.field_id_89 as body,
        d.field_id_88 as featured_image,
        d.field_id_1 as excerpt
      FROM av07282_production.exp_channel_titles t
      LEFT JOIN av07282_production.exp_channel_data d ON t.entry_id = d.entry_id
      WHERE t.channel_id = 3
        AND t.status = 'open'
      ORDER BY t.entry_date DESC
      LIMIT 500
    `

    const articlesResult = await pgPool.query(articlesQuery)
    console.log(`   Found ${articlesResult.rows.length} articles to migrate\n`)

    let articlesSuccess = 0
    let articlesErrors = 0
    const articleErrorSamples: string[] = []

    for (const row of articlesResult.rows) {
      try {
        // Convert Unix timestamp to ISO date
        const publishedDate = new Date(row.entry_date * 1000).toISOString()
        const updatedDate = new Date(row.edit_date * 1000).toISOString()

        const articleData: any = {
          title: row.title || 'Untitled',
          slug: row.url_title || generateSlug(row.title),
          category: defaultCategoryId,
          author: 'CHIRP Radio',
          excerpt: row.excerpt || row.title?.substring(0, 200) || 'No excerpt available',
          content: row.body ? convertToLexical(row.body) : convertToLexical('Content not available'),
          publishedDate: publishedDate,
          updatedAt: updatedDate,
          _status: 'published',
        }

        await payload.create({
          collection: 'articles',
          data: articleData,
        })

        articlesSuccess++
        if (articlesSuccess % 10 === 0) {
          console.log(`   ✅ Migrated ${articlesSuccess} articles...`)
        }
      } catch (error: any) {
        articlesErrors++
        if (articleErrorSamples.length < 3) {
          articleErrorSamples.push(`${row.title}: ${error.message}`)
        }
      }
    }

    stats.push({
      collection: 'articles',
      total: articlesResult.rows.length,
      migrated: articlesSuccess,
      errors: articlesErrors,
      errorSamples: articleErrorSamples,
    })

    console.log(`\n   ✅ Articles: ${articlesSuccess}/${articlesResult.rows.length} migrated\n`)

    // ==========================================
    // SUMMARY
    // ==========================================
    console.log('\n' + '='.repeat(70))
    console.log('✨ Migration Complete!')
    console.log('='.repeat(70))
    console.log('\n📊 Summary:\n')

    for (const stat of stats) {
      console.log(`   ${stat.collection}:`)
      console.log(`      Total: ${stat.total}`)
      console.log(`      Migrated: ${stat.migrated}`)
      console.log(`      Errors: ${stat.errors}`)
      if (stat.errorSamples.length > 0) {
        console.log(`      Sample errors:`)
        stat.errorSamples.forEach(err => console.log(`         - ${err}`))
      }
      console.log()
    }

    console.log('📝 Next Steps:')
    console.log('   1. 🌐 Access admin panel: http://localhost:3000/admin/collections/articles')
    console.log('   2. 📄 Verify articles display correctly')
    console.log('   3. ✓  Update any image references as needed\n')

  } catch (error) {
    console.error('\n❌ Migration failed:', error)
    process.exit(1)
  } finally {
    if (pgPool) {
      await pgPool.end()
    }
    process.exit(0)
  }
}

function generateSlug(title: string): string {
  if (!title) return 'untitled'

  return title
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 100)
}

function convertToLexical(htmlContent: string): any {
  // Simple conversion - convert HTML to Lexical format
  // For now, just create a simple paragraph node
  if (!htmlContent) {
    return {
      root: {
        type: 'root',
        format: '',
        indent: 0,
        version: 1,
        children: [],
        direction: null,
      },
    }
  }

  // Strip HTML tags for now (you may want a more sophisticated HTML to Lexical converter)
  const textContent = htmlContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()

  return {
    root: {
      type: 'root',
      format: '',
      indent: 0,
      version: 1,
      children: [
        {
          type: 'paragraph',
          format: '',
          indent: 0,
          version: 1,
          children: [
            {
              type: 'text',
              format: 0,
              text: textContent,
              mode: 'normal',
              style: '',
              detail: 0,
              version: 1,
            },
          ],
          direction: 'ltr',
        },
      ],
      direction: 'ltr',
    },
  }
}

migrateFromEEToPayload()

import { getPayload } from 'payload'
import config from '../payload.config'
import dotenv from 'dotenv'
import pg from 'pg'

dotenv.config()

const { Pool } = pg

/**
 * Migrate ALL content from ExpressionEngine to Payload CMS
 *
 * This script migrates:
 * - ALL Blog Articles (channel_id 3)
 * - ALL Events (channel_id 4)
 * - ALL Podcasts (channel_id 7)
 * - ALL Pages (channel_id 23)
 */

interface MigrationStats {
  collection: string
  total: number
  migrated: number
  errors: number
  errorSamples: string[]
}

const migrateAllCollections = async () => {
  console.log('🚀 Migrating ALL content from ExpressionEngine to Payload CMS\n')
  console.log('='.repeat(70))
  console.log('⚠️  This will migrate thousands of records. This may take a while...\n')
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
    // ENSURE DEFAULT CATEGORY EXISTS
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
    // ENSURE DEFAULT VENUE EXISTS
    // ==========================================
    console.log('🏢 Checking for default venue...\n')

    let defaultVenueId: any
    const { docs: existingVenues } = await payload.find({
      collection: 'venues',
      limit: 1,
    })

    if (existingVenues.length === 0) {
      console.log('   Creating default venue...')
      const venue = await payload.create({
        collection: 'venues',
        data: {
          name: 'TBD',
          slug: 'tbd',
        },
      })
      defaultVenueId = venue.id
      console.log(`   ✅ Created default venue (ID: ${defaultVenueId})\n`)
    } else {
      defaultVenueId = existingVenues[0].id
      console.log(`   ✅ Using existing venue (ID: ${defaultVenueId})\n`)
    }

    // ==========================================
    // 1. MIGRATE ALL BLOG ARTICLES
    // ==========================================
    console.log('📝 Migrating ALL Blog Articles...\n')

    const articlesQuery = `
      SELECT
        t.entry_id,
        t.title,
        t.url_title,
        t.entry_date,
        t.edit_date,
        d.field_id_89 as body,
        d.field_id_88 as featured_image,
        d.field_id_1 as excerpt
      FROM av07282_production.exp_channel_titles t
      LEFT JOIN av07282_production.exp_channel_data d ON t.entry_id = d.entry_id
      WHERE t.channel_id = 3
        AND t.status = 'open'
      ORDER BY t.entry_date DESC
    `

    const articlesResult = await pgPool.query(articlesQuery)
    console.log(`   Found ${articlesResult.rows.length} articles to migrate\n`)

    let articlesSuccess = 0
    let articlesErrors = 0
    const articleErrorSamples: string[] = []
    const usedArticleSlugs = new Set<string>()

    // Get existing articles to skip duplicates
    const { totalDocs: existingArticlesCount } = await payload.find({
      collection: 'articles',
      limit: 1,
    })

    console.log(`   ℹ️  ${existingArticlesCount} articles already exist, will skip duplicates\n`)

    // Get all existing slugs to avoid duplicates
    if (existingArticlesCount > 0) {
      const { docs: existingArticles } = await payload.find({
        collection: 'articles',
        limit: 10000,
      })
      existingArticles.forEach(article => {
        if (article.slug) {
          usedArticleSlugs.add(article.slug)
        }
      })
      console.log(`   Loaded ${usedArticleSlugs.size} existing article slugs\n`)
    }

    for (const row of articlesResult.rows) {
      // Check if slug already exists
      const baseSlug = row.url_title || generateSlug(row.title)
      if (usedArticleSlugs.has(baseSlug)) {
        // Skip this article as it's already migrated
        continue
      }

      try {
        const publishedDate = new Date(row.entry_date * 1000).toISOString()
        const updatedDate = new Date(row.edit_date * 1000).toISOString()
        const slug = generateUniqueSlug(baseSlug, usedArticleSlugs)

        await payload.create({
          collection: 'articles',
          data: {
            title: row.title || 'Untitled',
            slug: slug,
            category: defaultCategoryId,
            author: 'CHIRP Radio',
            excerpt: row.excerpt || row.title?.substring(0, 200) || 'No excerpt available',
            content: row.body ? convertToLexical(row.body) : convertToLexical('Content not available'),
            publishedDate: publishedDate,
            updatedAt: updatedDate,
            _status: 'published',
          },
        })

        articlesSuccess++
        if (articlesSuccess % 100 === 0) {
          console.log(`   ✅ Migrated ${articlesSuccess}/${articlesResult.rows.length} articles...`)
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
    // 2. MIGRATE ALL EVENTS
    // ==========================================
    console.log('📅 Migrating ALL Events...\n')

    const eventsQuery = `
      SELECT
        t.entry_id,
        t.title,
        t.url_title,
        t.entry_date,
        t.edit_date,
        d.field_id_1 as excerpt,
        d.field_id_3 as content,
        d.field_id_88 as featured_image
      FROM av07282_production.exp_channel_titles t
      LEFT JOIN av07282_production.exp_channel_data d ON t.entry_id = d.entry_id
      WHERE t.channel_id = 4
        AND t.status = 'open'
      ORDER BY t.entry_date DESC
    `

    const eventsResult = await pgPool.query(eventsQuery)
    console.log(`   Found ${eventsResult.rows.length} events to migrate\n`)

    let eventsSuccess = 0
    let eventsErrors = 0
    const eventErrorSamples: string[] = []

    const usedEventSlugs = new Set<string>()

    for (const row of eventsResult.rows) {
      try {
        const eventDate = new Date(row.entry_date * 1000).toISOString()
        const slug = generateUniqueSlug(row.url_title || row.title, usedEventSlugs)

        await payload.create({
          collection: 'events',
          data: {
            title: row.title || 'Untitled Event',
            slug: slug,
            category: defaultCategoryId,
            venue: defaultVenueId,
            date: eventDate,
            excerpt: row.excerpt || row.title?.substring(0, 200) || 'No description',
            content: row.content ? convertToLexical(row.content) : convertToLexical('No details available'),
            _status: 'published',
          },
        })

        eventsSuccess++
        if (eventsSuccess % 100 === 0) {
          console.log(`   ✅ Migrated ${eventsSuccess}/${eventsResult.rows.length} events...`)
        }
      } catch (error: any) {
        eventsErrors++
        if (eventErrorSamples.length < 3) {
          eventErrorSamples.push(`${row.title}: ${error.message}`)
        }
      }
    }

    stats.push({
      collection: 'events',
      total: eventsResult.rows.length,
      migrated: eventsSuccess,
      errors: eventsErrors,
      errorSamples: eventErrorSamples,
    })

    console.log(`\n   ✅ Events: ${eventsSuccess}/${eventsResult.rows.length} migrated\n`)

    // ==========================================
    // 3. MIGRATE ALL PODCASTS
    // ==========================================
    console.log('🎙️  Migrating ALL Podcasts...\n')

    const podcastsQuery = `
      SELECT
        t.entry_id,
        t.title,
        t.url_title,
        t.entry_date,
        t.edit_date,
        d.field_id_1 as excerpt,
        d.field_id_3 as content,
        d.field_id_88 as featured_image
      FROM av07282_production.exp_channel_titles t
      LEFT JOIN av07282_production.exp_channel_data d ON t.entry_id = d.entry_id
      WHERE t.channel_id = 7
        AND t.status = 'open'
      ORDER BY t.entry_date DESC
    `

    const podcastsResult = await pgPool.query(podcastsQuery)
    console.log(`   Found ${podcastsResult.rows.length} podcasts to migrate\n`)

    let podcastsSuccess = 0
    let podcastsErrors = 0
    const podcastErrorSamples: string[] = []
    const usedPodcastSlugs = new Set<string>()

    for (const row of podcastsResult.rows) {
      try {
        const slug = generateUniqueSlug(row.url_title || row.title, usedPodcastSlugs)

        await payload.create({
          collection: 'podcasts',
          data: {
            title: row.title || 'Untitled Podcast',
            slug: slug,
            category: defaultCategoryId,
            host: 'CHIRP Radio',
            excerpt: row.excerpt || row.title?.substring(0, 200) || 'No description',
            content: row.content ? convertToLexical(row.content) : convertToLexical('No details available'),
            _status: 'published',
          },
        })

        podcastsSuccess++
        if (podcastsSuccess % 100 === 0) {
          console.log(`   ✅ Migrated ${podcastsSuccess}/${podcastsResult.rows.length} podcasts...`)
        }
      } catch (error: any) {
        podcastsErrors++
        if (podcastErrorSamples.length < 3) {
          podcastErrorSamples.push(`${row.title}: ${error.message}`)
        }
      }
    }

    stats.push({
      collection: 'podcasts',
      total: podcastsResult.rows.length,
      migrated: podcastsSuccess,
      errors: podcastsErrors,
      errorSamples: podcastErrorSamples,
    })

    console.log(`\n   ✅ Podcasts: ${podcastsSuccess}/${podcastsResult.rows.length} migrated\n`)

    // ==========================================
    // 4. MIGRATE ALL PAGES
    // ==========================================
    console.log('📄 Migrating ALL Pages...\n')

    const pagesQuery = `
      SELECT
        t.entry_id,
        t.title,
        t.url_title,
        t.entry_date,
        d.field_id_1 as excerpt,
        d.field_id_3 as content
      FROM av07282_production.exp_channel_titles t
      LEFT JOIN av07282_production.exp_channel_data d ON t.entry_id = d.entry_id
      WHERE t.channel_id = 23
        AND t.status = 'open'
      ORDER BY t.entry_date DESC
    `

    const pagesResult = await pgPool.query(pagesQuery)
    console.log(`   Found ${pagesResult.rows.length} pages to migrate\n`)

    let pagesSuccess = 0
    let pagesErrors = 0
    const pageErrorSamples: string[] = []
    const usedPageSlugs = new Set<string>()

    for (const row of pagesResult.rows) {
      try {
        const slug = generateUniqueSlug(row.url_title || row.title, usedPageSlugs)

        await payload.create({
          collection: 'pages',
          data: {
            title: row.title || 'Untitled Page',
            slug: slug,
            content: row.content ? convertToLexical(row.content) : convertToLexical('No content available'),
            _status: 'published',
          },
        })

        pagesSuccess++
      } catch (error: any) {
        pagesErrors++
        if (pageErrorSamples.length < 3) {
          pageErrorSamples.push(`${row.title}: ${error.message}`)
        }
      }
    }

    stats.push({
      collection: 'pages',
      total: pagesResult.rows.length,
      migrated: pagesSuccess,
      errors: pagesErrors,
      errorSamples: pageErrorSamples,
    })

    console.log(`\n   ✅ Pages: ${pagesSuccess}/${pagesResult.rows.length} migrated\n`)

    // ==========================================
    // SUMMARY
    // ==========================================
    console.log('\n' + '='.repeat(70))
    console.log('✨ Complete Migration Summary!')
    console.log('='.repeat(70))
    console.log('\n📊 Results:\n')

    let totalMigrated = 0
    let totalErrors = 0

    for (const stat of stats) {
      console.log(`   ${stat.collection.toUpperCase()}:`)
      console.log(`      Total in database: ${stat.total}`)
      console.log(`      Successfully migrated: ${stat.migrated}`)
      console.log(`      Errors: ${stat.errors}`)
      if (stat.errorSamples.length > 0) {
        console.log(`      Sample errors:`)
        stat.errorSamples.forEach(err => console.log(`         - ${err}`))
      }
      console.log()

      totalMigrated += stat.migrated
      totalErrors += stat.errors
    }

    console.log('='.repeat(70))
    console.log(`✅ TOTAL MIGRATED: ${totalMigrated} records`)
    console.log(`❌ TOTAL ERRORS: ${totalErrors} records`)
    console.log('='.repeat(70))

    console.log('\n📝 Next Steps:')
    console.log('   1. 🌐 Access admin panel: http://localhost:3000/admin')
    console.log('   2. 📄 Verify content in each collection')
    console.log('   3. ✓  Update image references as needed\n')

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

function generateUniqueSlug(title: string, usedSlugs: Set<string>): string {
  let baseSlug = generateSlug(title)
  let slug = baseSlug
  let counter = 1

  while (usedSlugs.has(slug)) {
    slug = `${baseSlug}-${counter}`
    counter++
  }

  usedSlugs.add(slug)
  return slug
}

function decodeHtmlEntities(text: string): string {
  if (!text) return text

  const entities: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'",
    '&rsquo;': '\u2019',
    '&lsquo;': '\u2018',
    '&rdquo;': '\u201D',
    '&ldquo;': '\u201C',
    '&nbsp;': ' ',
    '&mdash;': '\u2014',
    '&ndash;': '\u2013',
    '&hellip;': '\u2026',
    '&copy;': '\u00A9',
    '&reg;': '\u00AE',
    '&trade;': '\u2122',
  }

  let decoded = text
  for (const [entity, char] of Object.entries(entities)) {
    decoded = decoded.replace(new RegExp(entity, 'g'), char)
  }

  // Decode numeric entities (&#123; or &#x7B;)
  decoded = decoded.replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(parseInt(dec, 10)))
  decoded = decoded.replace(/&#x([0-9a-f]+);/gi, (match, hex) => String.fromCharCode(parseInt(hex, 16)))

  return decoded
}

function convertToLexical(htmlContent: string): any {
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

  // Strip HTML tags and decode entities
  let textContent = htmlContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  textContent = decodeHtmlEntities(textContent)

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

migrateAllCollections()

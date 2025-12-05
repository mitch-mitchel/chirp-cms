import { getPayload } from 'payload'
import config from '../payload.config'
import dotenv from 'dotenv'

dotenv.config()

/**
 * Fix HTML entities in excerpts for all collections
 *
 * This script decodes HTML entities like &rsquo; &amp; &nbsp; etc.
 * in excerpts for Articles, Events, and Podcasts
 */

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
    '&bull;': '\u2022',
    '&deg;': '\u00B0',
    '&para;': '\u00B6',
    '&sect;': '\u00A7',
    '&euro;': '\u20AC',
    '&pound;': '\u00A3',
    '&yen;': '\u00A5',
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

const fixHtmlEntities = async () => {
  console.log('🔧 Fixing HTML entities in excerpts...\n')

  let payload: any

  try {
    // Initialize Payload
    console.log('📦 Initializing Payload CMS...\n')
    payload = await getPayload({ config })
    console.log('✅ Payload CMS initialized\n')

    // ==========================================
    // FIX ARTICLES
    // ==========================================
    console.log('📝 Fixing Articles...\n')

    const { docs: articles } = await payload.find({
      collection: 'articles',
      limit: 10000,
    })

    let articlesFixed = 0

    for (const article of articles) {
      if (article.excerpt && article.excerpt.includes('&')) {
        const originalExcerpt = article.excerpt
        const decodedExcerpt = decodeHtmlEntities(article.excerpt)

        if (originalExcerpt !== decodedExcerpt) {
          await payload.update({
            collection: 'articles',
            id: article.id,
            data: {
              excerpt: decodedExcerpt,
            },
          })

          articlesFixed++
          if (articlesFixed % 100 === 0) {
            console.log(`   ✅ Fixed ${articlesFixed} articles...`)
          }
        }
      }
    }

    console.log(`\n   ✅ Fixed ${articlesFixed} / ${articles.length} articles\n`)

    // ==========================================
    // FIX EVENTS
    // ==========================================
    console.log('📅 Fixing Events...\n')

    const { docs: events } = await payload.find({
      collection: 'events',
      limit: 10000,
    })

    let eventsFixed = 0

    for (const event of events) {
      if (event.excerpt && event.excerpt.includes('&')) {
        const originalExcerpt = event.excerpt
        const decodedExcerpt = decodeHtmlEntities(event.excerpt)

        if (originalExcerpt !== decodedExcerpt) {
          await payload.update({
            collection: 'events',
            id: event.id,
            data: {
              excerpt: decodedExcerpt,
            },
          })

          eventsFixed++
          if (eventsFixed % 100 === 0) {
            console.log(`   ✅ Fixed ${eventsFixed} events...`)
          }
        }
      }
    }

    console.log(`\n   ✅ Fixed ${eventsFixed} / ${events.length} events\n`)

    // ==========================================
    // FIX PODCASTS
    // ==========================================
    console.log('🎙️  Fixing Podcasts...\n')

    const { docs: podcasts } = await payload.find({
      collection: 'podcasts',
      limit: 10000,
    })

    let podcastsFixed = 0

    for (const podcast of podcasts) {
      if (podcast.excerpt && podcast.excerpt.includes('&')) {
        const originalExcerpt = podcast.excerpt
        const decodedExcerpt = decodeHtmlEntities(podcast.excerpt)

        if (originalExcerpt !== decodedExcerpt) {
          await payload.update({
            collection: 'podcasts',
            id: podcast.id,
            data: {
              excerpt: decodedExcerpt,
            },
          })

          podcastsFixed++
          if (podcastsFixed % 100 === 0) {
            console.log(`   ✅ Fixed ${podcastsFixed} podcasts...`)
          }
        }
      }
    }

    console.log(`\n   ✅ Fixed ${podcastsFixed} / ${podcasts.length} podcasts\n`)

    // ==========================================
    // SUMMARY
    // ==========================================
    console.log('\n' + '='.repeat(70))
    console.log('✨ HTML Entity Fix Complete!')
    console.log('='.repeat(70))
    console.log('\n📊 Summary:\n')
    console.log(`   Articles fixed:  ${articlesFixed}`)
    console.log(`   Events fixed:    ${eventsFixed}`)
    console.log(`   Podcasts fixed:  ${podcastsFixed}`)
    console.log(`   Total fixed:     ${articlesFixed + eventsFixed + podcastsFixed}`)
    console.log()
    console.log('✅ All excerpts now display properly without HTML entities!\n')

  } catch (error) {
    console.error('\n❌ Fix failed:', error)
    process.exit(1)
  } finally {
    process.exit(0)
  }
}

fixHtmlEntities()

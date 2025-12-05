/**
 * Test Payload API for HTML Entities
 *
 * This script fetches data from the Payload API and checks for HTML entities
 * to verify that the API is serving clean data.
 *
 * Run with:
 * docker exec chirp-cms npx tsx /app/scripts/test-api-for-html-entities.ts
 *
 * Or locally:
 * npx tsx scripts/test-api-for-html-entities.ts
 */

const API_URL = process.env.PAYLOAD_PUBLIC_SERVER_URL || 'http://localhost:3000'

interface Article {
  id: string
  title: string
  excerpt?: string
}

interface ApiResponse {
  docs: Article[]
  totalDocs: number
}

const HTML_ENTITIES = [
  '&rsquo;',
  '&lsquo;',
  '&rdquo;',
  '&ldquo;',
  '&nbsp;',
  '&mdash;',
  '&ndash;',
  '&hellip;',
  '&amp;',
  '&lt;',
  '&gt;',
  '&quot;',
  '&#39;',
]

async function testCollection(collection: string) {
  console.log(`\n📝 Testing ${collection}...`)

  try {
    const response = await fetch(`${API_URL}/api/${collection}?limit=100`)

    if (!response.ok) {
      console.error(`❌ API error: ${response.status} ${response.statusText}`)
      return
    }

    const data: ApiResponse = await response.json()
    console.log(`   Found ${data.totalDocs} total ${collection}`)
    console.log(`   Testing ${data.docs.length} ${collection}...`)

    let foundEntities = 0
    const examples: string[] = []

    for (const doc of data.docs) {
      if (!doc.excerpt) continue

      for (const entity of HTML_ENTITIES) {
        if (doc.excerpt.includes(entity)) {
          foundEntities++
          if (examples.length < 3) {
            examples.push(
              `   "${doc.excerpt.substring(0, 80)}..." (ID: ${doc.id})`
            )
          }
          break
        }
      }
    }

    if (foundEntities === 0) {
      console.log(`   ✅ No HTML entities found in ${collection}`)
    } else {
      console.log(`   ❌ Found ${foundEntities} ${collection} with HTML entities:`)
      examples.forEach(example => console.log(example))
    }

  } catch (error) {
    console.error(`❌ Error testing ${collection}:`, error)
  }
}

async function main() {
  console.log('🧪 Testing Payload API for HTML Entities')
  console.log('=' .repeat(70))
  console.log(`API URL: ${API_URL}`)

  await testCollection('articles')
  await testCollection('events')
  await testCollection('podcasts')

  console.log('\n' + '='.repeat(70))
  console.log('✅ API Test Complete')
  console.log('\nIf no HTML entities were found, the Payload API is serving clean data.')
  console.log('If entities appear in your frontend, check:')
  console.log('  1. Your frontend API endpoint configuration')
  console.log('  2. Frontend cache (build cache and browser cache)')
  console.log('  3. CDN or proxy caching')
  console.log('\nSee FRONTEND_HTML_ENTITY_FIX.md for detailed instructions.\n')
}

main()

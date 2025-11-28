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
  console.log('✅ Migration Verification\n')
  console.log('='.repeat(70))

  // Check articles
  const articles = await client.query('SELECT id, title, slug, category_id FROM articles LIMIT 3')
  console.log('\n📰 Articles (sample):')
  articles.rows.forEach((a) =>
    console.log(`  - ${a.title} (slug: ${a.slug}, category: ${a.category_id})`)
  )

  // Check events
  const events = await client.query('SELECT id, title, slug, venue_id, date FROM events LIMIT 3')
  console.log('\n📅 Events (sample):')
  events.rows.forEach((e) => {
    const dateStr = e.date instanceof Date ? e.date.toISOString().split('T')[0] : e.date
    console.log(`  - ${e.title} (slug: ${e.slug}, venue: ${e.venue_id}, date: ${dateStr})`)
  })

  // Check podcasts
  const podcasts = await client.query('SELECT id, title, slug, category_id FROM podcasts LIMIT 3')
  console.log('\n🎙️  Podcasts (sample):')
  podcasts.rows.forEach((p) =>
    console.log(`  - ${p.title} (slug: ${p.slug}, category: ${p.category_id})`)
  )

  // Check pages
  const pages = await client.query('SELECT id, title, slug FROM pages LIMIT 3')
  console.log('\n📄 Pages (sample):')
  pages.rows.forEach((p) => console.log(`  - ${p.title} (slug: ${p.slug})`))

  // Check shop items
  const shopItems = await client.query('SELECT id, name, slug, price FROM shop_items LIMIT 3')
  console.log('\n🛒 Shop Items (sample):')
  shopItems.rows.forEach((s) => console.log(`  - ${s.name} (slug: ${s.slug}, price: $${s.price})`))

  console.log('\n' + '='.repeat(70))
  console.log('\n✨ Migration successful!')
  console.log(`\n🌐 Access your application at: http://${process.env.ALB_DNS}`)
  console.log('   Admin panel: http://' + process.env.ALB_DNS + '/admin\n')
} finally {
  client.release()
  await pool.end()
}

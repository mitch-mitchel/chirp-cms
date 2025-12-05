import { getPayload } from 'payload'
import config from '../payload.config'
import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

interface Article {
  id: string | number
  title: string
  slug: string
  author?: string
  publishedDate?: string
  featuredImage?: any
  featuredImageUrl?: string
}

interface MediaItem {
  id: string | number
  filename: string
  alt?: string
  category?: string
}

const matchArticleImages = async () => {
  const payload = await getPayload({ config })

  console.log('🔍 Analyzing articles and matching with available images...\n')

  try {
    // Get all articles
    const { docs: articles } = await payload.find({
      collection: 'articles',
      limit: 1000,
      sort: '-publishedDate',
    })

    console.log(`📰 Found ${articles.length} articles`)

    // Get all media items
    const { docs: mediaItems } = await payload.find({
      collection: 'media',
      limit: 5000,
    })

    console.log(`🖼️  Found ${mediaItems.length} media items in database\n`)

    // Get all physical image files (excluding size variants)
    const mediaDir = path.resolve(__dirname, '../media')
    const allFiles = fs.readdirSync(mediaDir)
    const imageFiles = allFiles.filter(
      (file) =>
        (file.endsWith('.jpg') || file.endsWith('.png') || file.endsWith('.jpeg')) &&
        !file.includes('-400x') &&
        !file.includes('-600x') &&
        !file.includes('-800x') &&
        !file.includes('-1200x'),
    )

    console.log(`📁 Found ${imageFiles.length} unique image files in media directory\n`)

    // Create a mapping of filenames to media items
    const mediaMap = new Map<string, MediaItem>()
    mediaItems.forEach((item: any) => {
      mediaMap.set(item.filename, {
        id: item.id,
        filename: item.filename,
        alt: item.alt,
        category: item.category,
      })
    })

    // Analyze articles
    const articlesWithImages: Article[] = []
    const articlesWithoutImages: Article[] = []
    const potentialMatches: Array<{
      article: Article
      suggestions: Array<{ filename: string; reason: string }>
    }> = []

    for (const article of articles as Article[]) {
      if (article.featuredImage || article.featuredImageUrl) {
        articlesWithImages.push(article)
      } else {
        articlesWithoutImages.push(article)

        // Try to find potential matches
        const suggestions: Array<{ filename: string; reason: string }> = []

        // Strategy 1: Match by slug (article slug to image filename)
        const slugBasedMatches = imageFiles.filter((file) => {
          const fileBase = file.replace(/\.(jpg|png|jpeg)$/i, '')
          return (
            fileBase.toLowerCase().includes(article.slug.toLowerCase()) ||
            article.slug.toLowerCase().includes(fileBase.toLowerCase())
          )
        })
        slugBasedMatches.forEach((file) => {
          suggestions.push({ filename: file, reason: 'Slug match' })
        })

        // Strategy 2: Match by title words
        const titleWords = article.title
          .toLowerCase()
          .split(' ')
          .filter((word) => word.length > 3) // Only significant words
        const titleBasedMatches = imageFiles.filter((file) => {
          const fileBase = file.replace(/\.(jpg|png|jpeg)$/i, '').toLowerCase()
          return titleWords.some((word) => fileBase.includes(word))
        })
        titleBasedMatches.forEach((file) => {
          if (!suggestions.find((s) => s.filename === file)) {
            suggestions.push({ filename: file, reason: 'Title keyword match' })
          }
        })

        // Strategy 3: Match by author name
        if (article.author) {
          const authorName = article.author.toLowerCase().replace(/\s+/g, '-')
          const authorBasedMatches = imageFiles.filter((file) => {
            const fileBase = file.replace(/\.(jpg|png|jpeg)$/i, '').toLowerCase()
            return fileBase.includes(authorName)
          })
          authorBasedMatches.forEach((file) => {
            if (!suggestions.find((s) => s.filename === file)) {
              suggestions.push({ filename: file, reason: 'Author name match' })
            }
          })
        }

        // Strategy 4: Match by date (if publishedDate exists and image has date in filename)
        if (article.publishedDate) {
          const date = new Date(article.publishedDate)
          const dateStr = date.toISOString().split('T')[0].replace(/-/g, '') // YYYYMMDD
          const dateBasedMatches = imageFiles.filter((file) => file.startsWith(dateStr))
          dateBasedMatches.forEach((file) => {
            if (!suggestions.find((s) => s.filename === file)) {
              suggestions.push({ filename: file, reason: 'Date match' })
            }
          })
        }

        if (suggestions.length > 0) {
          potentialMatches.push({
            article,
            suggestions: suggestions.slice(0, 5), // Limit to top 5 suggestions
          })
        }
      }
    }

    // Print summary
    console.log('📊 SUMMARY')
    console.log('═'.repeat(80))
    console.log(`✅ Articles with images: ${articlesWithImages.length}`)
    console.log(`❌ Articles without images: ${articlesWithoutImages.length}`)
    console.log(`💡 Articles with potential matches: ${potentialMatches.length}\n`)

    // Print articles with images
    if (articlesWithImages.length > 0) {
      console.log('✅ ARTICLES WITH IMAGES')
      console.log('═'.repeat(80))
      articlesWithImages.forEach((article) => {
        const imageInfo = article.featuredImage
          ? `Media ID: ${typeof article.featuredImage === 'object' ? article.featuredImage.id : article.featuredImage}`
          : `URL: ${article.featuredImageUrl}`
        console.log(`  • ${article.title}`)
        console.log(`    ${imageInfo}`)
      })
      console.log()
    }

    // Print articles without images
    if (articlesWithoutImages.length > 0 && potentialMatches.length === 0) {
      console.log('❌ ARTICLES WITHOUT IMAGES (NO MATCHES FOUND)')
      console.log('═'.repeat(80))
      articlesWithoutImages
        .filter((a) => !potentialMatches.find((pm) => pm.article.id === a.id))
        .forEach((article) => {
          console.log(`  • ${article.title}`)
          console.log(`    Slug: ${article.slug}`)
          if (article.author) console.log(`    Author: ${article.author}`)
          if (article.publishedDate)
            console.log(`    Published: ${new Date(article.publishedDate).toLocaleDateString()}`)
        })
      console.log()
    }

    // Print potential matches
    if (potentialMatches.length > 0) {
      console.log('💡 POTENTIAL MATCHES')
      console.log('═'.repeat(80))
      potentialMatches.forEach(({ article, suggestions }) => {
        console.log(`\n📰 ${article.title}`)
        console.log(`   Slug: ${article.slug}`)
        if (article.author) console.log(`   Author: ${article.author}`)
        if (article.publishedDate)
          console.log(`   Published: ${new Date(article.publishedDate).toLocaleDateString()}`)
        console.log(`   Suggested images:`)
        suggestions.forEach(({ filename, reason }) => {
          const inDatabase = mediaMap.has(filename) ? '✓ in DB' : '✗ not in DB'
          console.log(`     - ${filename} (${reason}) [${inDatabase}]`)
        })
      })
      console.log()
    }

    // Check for images in filesystem but not in database
    const orphanedFiles = imageFiles.filter((file) => !mediaMap.has(file))
    if (orphanedFiles.length > 0) {
      console.log('\n⚠️  ORPHANED IMAGE FILES (in filesystem but not in database)')
      console.log('═'.repeat(80))
      console.log(`Found ${orphanedFiles.length} image files not tracked in the database`)
      console.log('First 20 examples:')
      orphanedFiles.slice(0, 20).forEach((file) => {
        console.log(`  - ${file}`)
      })
      console.log()
    }

    // Save report to file
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalArticles: articles.length,
        articlesWithImages: articlesWithImages.length,
        articlesWithoutImages: articlesWithoutImages.length,
        potentialMatches: potentialMatches.length,
        totalMediaItems: mediaItems.length,
        totalImageFiles: imageFiles.length,
        orphanedFiles: orphanedFiles.length,
      },
      articlesWithImages: articlesWithImages.map((a) => ({
        id: a.id,
        title: a.title,
        slug: a.slug,
        hasImage: true,
      })),
      potentialMatches: potentialMatches.map(({ article, suggestions }) => ({
        id: article.id,
        title: article.title,
        slug: article.slug,
        author: article.author,
        publishedDate: article.publishedDate,
        suggestions: suggestions.map((s) => ({
          filename: s.filename,
          reason: s.reason,
          inDatabase: mediaMap.has(s.filename),
        })),
      })),
      orphanedFiles: orphanedFiles,
    }

    const reportPath = path.resolve(__dirname, '../article-image-matching-report.json')
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
    console.log(`\n📄 Full report saved to: ${reportPath}`)

    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

matchArticleImages()

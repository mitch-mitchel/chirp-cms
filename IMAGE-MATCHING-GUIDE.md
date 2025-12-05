# CHIRP CMS: Image Matching Guide

Generated: 2025-12-04

## Summary

You have **2,580 articles** and **241 media items** in your database, with **ZERO articles currently having featured images assigned**. This guide will help you match images with articles using direct database queries.

## What's Been Created

### 1. Analysis Files

- **`image-categorization-report.md`** - Detailed breakdown of all 354 unique images in your media directory
- **`scripts/match-article-images.ts`** - TypeScript script for automated matching (requires dependencies)

### 2. SQL Query Files

- **`scripts/match-images-queries.sql`** - Exploration queries to find potential matches
- **`scripts/batch-update-images.sql`** - Ready-to-execute UPDATE statements (HIGH CONFIDENCE matches)
- **`scripts/apply-image-matches.sql`** - Transaction-safe UPDATE template

### 3. Report Files

- **`/tmp/image-matches-report.txt`** - Generated report showing all potential matches

## Quick Start: Apply High-Confidence Matches

We found **7 high-confidence matches** ready to apply:

### CHIRP Music Film Festival Articles (6 articles)
- Article 286: "Reflections on Almost Famous..." → chirp-film-fest-2.jpg
- Article 287: "Out of Time: The Material Issue Story..." → chirp-film-fest-3.jpg
- Article 288: "Fanny: The Right to Rock..." → chirp-film-fest-4.jpg
- Article 289: "Wattstax..." → chirp-film-fest-5.jpg
- Article 292: "Almost Famous..." → chirp-film-fest-2.jpg
- Article 293: "Big Star: Nothing Can Hurt Me..." → chirp-film-fest-3.jpg

### Record Fair Article (1 article)
- Article 1655: "2017 CHIRP Record Fair Social Media Stream" → RF_poster_2017_-_2-3.jpg

## How to Apply Updates

### Method 1: Run the Batch Update Script (Recommended)

```bash
psql postgresql://chirp:chirp_dev_password@localhost:5432/chirp_cms -f scripts/batch-update-images.sql
```

This will:
1. Start a transaction (safe to rollback)
2. Apply 7 high-confidence matches
3. Show you what was updated
4. Ask you to COMMIT or ROLLBACK

### Method 2: Interactive psql Session

```bash
psql postgresql://chirp:chirp_dev_password@localhost:5432/chirp_cms
```

Then run queries from `scripts/match-images-queries.sql` to explore, and apply updates manually.

### Method 3: One-at-a-time Updates

```sql
-- Example: Update one article
BEGIN;
UPDATE articles SET featured_image_id = 51 WHERE id = 286;
SELECT title, featured_image_id FROM articles WHERE id = 286;
COMMIT; -- or ROLLBACK if something looks wrong
```

## Verification Queries

### Check how many articles have images after updates

```sql
SELECT
    COUNT(*) as total,
    COUNT(featured_image_id) as with_images,
    COUNT(*) - COUNT(featured_image_id) as without_images
FROM articles;
```

### View articles with their images

```sql
SELECT
    a.id,
    a.title,
    m.filename as image,
    m.url as image_url
FROM articles a
JOIN media m ON a.featured_image_id = m.id
ORDER BY a.published_date DESC
LIMIT 20;
```

## Finding More Matches

### 1. Search for Articles by Keyword

```sql
SELECT id, title, slug, published_date
FROM articles
WHERE LOWER(title) LIKE '%YOUR_KEYWORD%'
AND featured_image_id IS NULL
ORDER BY published_date DESC;
```

### 2. Find Available Images by Category

```sql
-- Event posters
SELECT id, filename FROM media
WHERE LOWER(filename) LIKE '%poster%'
ORDER BY filename;

-- Stock images (for fallbacks)
SELECT id, filename FROM media
WHERE LOWER(filename) LIKE '%unsplash%'
ORDER BY filename;

-- DJ photos
SELECT id, filename FROM media
WHERE category = 'Member Profile Images'
ORDER BY filename;
```

### 3. Manual Matching Strategy

For articles that don't have obvious matches:

1. **Pick an article without an image:**
   ```sql
   SELECT id, title, slug FROM articles
   WHERE featured_image_id IS NULL
   LIMIT 10;
   ```

2. **Find a relevant image:**
   ```sql
   SELECT id, filename FROM media
   WHERE LOWER(filename) LIKE '%keyword%';
   ```

3. **Apply the match:**
   ```sql
   UPDATE articles
   SET featured_image_id = <media_id>
   WHERE id = <article_id>;
   ```

## Available Images by Type

### Event Posters (Good for event announcements)
- 6 × Record Fair posters (2015, 2017, 2018)
- 6 × CHIRP 2019 posters
- 6 × CHIRP spring 2013 designs
- 4 × Film festival images
- 6 × Record Fair 2015 photos

### Stock Photos (Good fallbacks - 14 images)
- bp-miller-M98DitdZi0Q-unsplash
- ehimetalor-akhere-unuabona-1SiLHYYmMrU-unsplash
- marloes-hilckmann-40l3zKiOC8k-unsplash
- rob-griffin-xKQr7RoOW44-unsplash
- robert-zunikoff-oK6VHjsnHys-unsplash
- ryan-zazueta-GEJ7tZoXnt0-unsplash
- venti-views-IUerQnW26-g-unsplash

### DJ/Member Photos (~153 files for 51 people)
Great for matching with article authors or DJ feature stories.

## Next Steps

### Option A: Apply Just High-Confidence Matches
```bash
psql postgresql://chirp:chirp_dev_password@localhost:5432/chirp_cms -f scripts/batch-update-images.sql
```

### Option B: Explore and Match More Articles
```bash
# Open interactive session
psql postgresql://chirp:chirp_dev_password@localhost:5432/chirp_cms

# Load exploration queries
\i scripts/match-images-queries.sql
```

### Option C: Assign Default Fallback Images
You could assign stock photos to categories of articles:

```sql
-- Example: All "Coming Attractions" articles get a music-themed stock photo
UPDATE articles
SET featured_image_id = 48
WHERE LOWER(title) LIKE 'coming attractions:%'
AND featured_image_id IS NULL;
```

### Option D: Use the CMS Admin Panel
1. Log into your Payload CMS admin
2. Go to Articles collection
3. Manually select featured images from the media library
4. Use the categorization report as a reference guide

## Common Patterns for Matching

### By Event Type
- **Film festivals** → Use stock unsplash photos or generic event posters
- **Record Fairs** → Use Record Fair posters (match by year if possible)
- **CHIRP events** → Use CHIRP-branded posters/photos

### By Article Type
- **"Coming Attractions" reviews** → Album art or stock music photos
- **DJ interviews** → DJ profile photos
- **Event recaps** → Event photos (sandcastles, etc.)
- **Partnership announcements** → Organization logos (DCASE, IAC, etc.)

### By Author
- **Articles by specific DJs** → Use their profile photo
- **"CHIRP Radio" byline** → Use generic CHIRP branding or event photos

## Database Schema Reference

```sql
-- Articles table
featured_image_id INTEGER (foreign key to media.id)
featured_image_url VARCHAR (external URL fallback)

-- Media table
id INTEGER (primary key)
filename VARCHAR
category VARCHAR (General, Articles, Events, etc.)
url VARCHAR (full URL to image)
```

## Tips

1. **Use transactions** - Always wrap updates in BEGIN/COMMIT so you can ROLLBACK if needed
2. **Start small** - Apply the 7 high-confidence matches first
3. **Verify before committing** - Check the results before running COMMIT
4. **Stock photos as fallbacks** - The 14 unsplash images work well for any content type
5. **Category field** - Update media.category to "Articles" for images you use with articles

## Questions?

Run this to see current status:
```sql
SELECT
    'Articles: ' || COUNT(*) as stat FROM articles
UNION ALL
SELECT 'With images: ' || COUNT(*) FROM articles WHERE featured_image_id IS NOT NULL
UNION ALL
SELECT 'Without images: ' || COUNT(*) FROM articles WHERE featured_image_id IS NULL
UNION ALL
SELECT 'Media items: ' || COUNT(*) FROM media;
```

Good luck matching!

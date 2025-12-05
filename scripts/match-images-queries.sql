-- ========================================
-- CHIRP CMS: Article Image Matching Queries
-- Generated: 2025-12-04
-- ========================================

-- Summary Statistics
-- ========================================
SELECT
    'Total Articles' as metric,
    COUNT(*) as count
FROM articles
UNION ALL
SELECT
    'Articles with Images',
    COUNT(*)
FROM articles
WHERE featured_image_id IS NOT NULL
UNION ALL
SELECT
    'Articles without Images',
    COUNT(*)
FROM articles
WHERE featured_image_id IS NULL
UNION ALL
SELECT
    'Total Media Items',
    COUNT(*)
FROM media;


-- Media Items by Category
-- ========================================
SELECT category, COUNT(*) as count
FROM media
GROUP BY category
ORDER BY count DESC;


-- ========================================
-- STRATEGY 1: Event-based Matching
-- Match film festival articles with film fest images
-- ========================================
SELECT
    a.id as article_id,
    a.title as article_title,
    a.slug,
    a.published_date,
    m.id as media_id,
    m.filename,
    'Film festival keyword match' as match_reason
FROM articles a
CROSS JOIN media m
WHERE
    (LOWER(a.title) LIKE '%film fest%' OR LOWER(a.title) LIKE '%film festival%')
    AND LOWER(m.filename) LIKE '%film%fest%'
    AND a.featured_image_id IS NULL
ORDER BY a.published_date DESC;


-- ========================================
-- STRATEGY 2: Date-based Matching
-- Match articles by publication date with dated image filenames
-- Example: 20180227-CHIRP-RF-poster.jpg for articles from Feb 27, 2018
-- ========================================
WITH dated_media AS (
    SELECT
        id,
        filename,
        SUBSTRING(filename FROM '^(\d{8})') as file_date
    FROM media
    WHERE filename ~ '^\d{8}'
)
SELECT
    a.id as article_id,
    a.title,
    TO_CHAR(a.published_date, 'YYYYMMDD') as article_date,
    dm.media_id,
    dm.filename,
    'Date match in filename' as match_reason
FROM articles a
INNER JOIN (
    SELECT id as media_id, filename, file_date
    FROM dated_media
    WHERE file_date IS NOT NULL
) dm ON TO_CHAR(a.published_date, 'YYYYMMDD') = dm.file_date
WHERE a.featured_image_id IS NULL
ORDER BY a.published_date DESC;


-- ========================================
-- STRATEGY 3: Keyword Matching
-- Match article slug keywords with image filename
-- ========================================
-- Sandcastle events
SELECT
    a.id as article_id,
    a.title,
    a.slug,
    m.id as media_id,
    m.filename,
    'Sandcastle keyword match' as match_reason
FROM articles a
CROSS JOIN media m
WHERE
    (LOWER(a.title) LIKE '%sandcastle%' OR LOWER(a.slug) LIKE '%sandcastle%')
    AND LOWER(m.filename) LIKE '%sandcastle%'
    AND a.featured_image_id IS NULL;

-- Record Fair events
SELECT
    a.id as article_id,
    a.title,
    a.slug,
    a.published_date,
    m.id as media_id,
    m.filename,
    'Record Fair keyword match' as match_reason
FROM articles a
CROSS JOIN media m
WHERE
    (LOWER(a.title) LIKE '%record fair%' OR LOWER(a.slug) LIKE '%record%fair%')
    AND (LOWER(m.filename) LIKE '%rf%poster%' OR LOWER(m.filename) LIKE '%record%fair%')
    AND a.featured_image_id IS NULL
ORDER BY a.published_date DESC
LIMIT 20;


-- ========================================
-- STRATEGY 4: Author-based Matching
-- Match article authors with DJ profile images
-- ========================================
-- First, let's see what unique authors exist
SELECT DISTINCT author, COUNT(*) as article_count
FROM articles
WHERE author IS NOT NULL
GROUP BY author
ORDER BY article_count DESC
LIMIT 20;

-- Match authors with media filenames (DJ photos)
-- This query looks for author names in filenames
SELECT
    a.id as article_id,
    a.title,
    a.author,
    m.id as media_id,
    m.filename,
    'Author name in filename' as match_reason
FROM articles a
INNER JOIN media m ON
    LOWER(m.filename) LIKE '%' || REPLACE(LOWER(a.author), ' ', '%') || '%'
    OR LOWER(m.filename) LIKE '%' || REPLACE(LOWER(a.author), ' ', '-') || '%'
WHERE
    a.author IS NOT NULL
    AND a.author != 'CHIRP Radio'
    AND a.featured_image_id IS NULL
    AND m.category IN ('General', 'Member Profile Images')
LIMIT 30;


-- ========================================
-- View Available Images for Manual Matching
-- ========================================
-- Event-related images
SELECT id, filename, category
FROM media
WHERE
    LOWER(filename) LIKE '%chirp%'
    OR LOWER(filename) LIKE '%poster%'
    OR LOWER(filename) LIKE '%fest%'
    OR LOWER(filename) LIKE '%event%'
ORDER BY filename;

-- DJ/Person images
SELECT id, filename, category
FROM media
WHERE
    category = 'Member Profile Images'
    OR (
        category = 'General'
        AND filename ~ '^[a-z]+(-[a-z]+)+\.(jpg|png)$'
        AND filename NOT LIKE '%placeholder%'
    )
ORDER BY filename
LIMIT 50;

-- Stock/Unsplash images (good fallbacks)
SELECT id, filename
FROM media
WHERE LOWER(filename) LIKE '%unsplash%'
ORDER BY filename;


-- ========================================
-- High-Confidence Matches Ready for UPDATE
-- ========================================
-- These are matches we're confident about
-- Review these before running the UPDATE statements below

-- Film Festival Matches
SELECT
    'UPDATE articles SET featured_image_id = ' || m.id ||
    ' WHERE id = ' || a.id || '; -- ' || a.title as update_statement
FROM articles a
CROSS JOIN media m
WHERE
    LOWER(a.title) LIKE '%chirp%music%film festival%'
    AND LOWER(m.filename) LIKE '%chirp-film-fest%'
    AND a.featured_image_id IS NULL
LIMIT 10;


-- ========================================
-- EXAMPLE UPDATE STATEMENTS
-- Review and execute manually after verification
-- ========================================

-- Example: Match specific film festival article with film fest image
-- Uncomment and modify as needed:

-- UPDATE articles
-- SET featured_image_id = (SELECT id FROM media WHERE filename LIKE 'chirp-film-fest-2.jpg' LIMIT 1)
-- WHERE id = 286 AND featured_image_id IS NULL;


-- ========================================
-- Utility: Find articles by keyword
-- ========================================
-- Use this to search for specific topics
-- Replace 'YOUR_KEYWORD' with your search term

-- SELECT id, title, slug, published_date
-- FROM articles
-- WHERE
--     LOWER(title) LIKE '%YOUR_KEYWORD%'
--     OR LOWER(slug) LIKE '%YOUR_KEYWORD%'
-- ORDER BY published_date DESC
-- LIMIT 20;


-- ========================================
-- Utility: Find media by keyword
-- ========================================
-- Use this to search for specific images

-- SELECT id, filename, category
-- FROM media
-- WHERE LOWER(filename) LIKE '%YOUR_KEYWORD%'
-- ORDER BY filename;


-- ========================================
-- Generate UPDATE statements for manual review
-- ========================================
-- This creates a list of potential UPDATE statements
-- Copy and review each one before executing

WITH potential_matches AS (
    -- Film festival matches
    SELECT
        a.id as article_id,
        a.title,
        m.id as media_id,
        m.filename,
        1 as confidence, -- 1=high, 2=medium, 3=low
        'Film festival match' as reason
    FROM articles a
    CROSS JOIN media m
    WHERE
        (LOWER(a.title) LIKE '%chirp%film fest%' OR LOWER(a.title) LIKE '%music film festival%')
        AND LOWER(m.filename) LIKE '%film-fest%'
        AND a.featured_image_id IS NULL

    UNION ALL

    -- Record Fair date matches
    SELECT
        a.id,
        a.title,
        m.id,
        m.filename,
        1,
        'Record Fair date match'
    FROM articles a
    CROSS JOIN media m
    WHERE
        TO_CHAR(a.published_date, 'YYYYMMDD') = '20180227'
        AND m.filename LIKE '20180227-CHIRP-RF-poster%'
        AND a.featured_image_id IS NULL
)
SELECT
    confidence,
    reason,
    'UPDATE articles SET featured_image_id = ' || media_id ||
    ' WHERE id = ' || article_id || '; -- ' || title as suggested_update
FROM potential_matches
ORDER BY confidence, article_id;


-- ========================================
-- Verification Queries (run after updates)
-- ========================================

-- View articles with their assigned images
-- SELECT
--     a.id,
--     a.title,
--     a.featured_image_id,
--     m.filename
-- FROM articles a
-- LEFT JOIN media m ON a.featured_image_id = m.id
-- WHERE a.featured_image_id IS NOT NULL
-- ORDER BY a.published_date DESC
-- LIMIT 50;

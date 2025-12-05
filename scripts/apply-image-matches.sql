-- ========================================
-- CHIRP CMS: Apply Image Matches
-- HIGH CONFIDENCE MATCHES ONLY
-- Generated: 2025-12-04
-- ========================================
-- IMPORTANT: Review each UPDATE before executing!
-- These are algorithmic matches and should be verified.
-- ========================================

-- Start a transaction so you can ROLLBACK if needed
BEGIN;

-- ========================================
-- MATCH 1: CHIRP Music Film Festival Articles
-- ========================================
-- Article: "Reflections on Almost Famous"
-- Match with: chirp-film-fest-2.jpg
UPDATE articles
SET featured_image_id = 51
WHERE id = 286
AND featured_image_id IS NULL;
-- Confidence: HIGH - Direct keyword match "CHIRP Music Film Festival" + "chirp-film-fest"

-- Article: "COMING SOON: Out of Time at the CHIRP Music Film Festival"
-- Match with: chirp-film-fest-3.jpg
UPDATE articles
SET featured_image_id = 52
WHERE id = 287
AND featured_image_id IS NULL;
-- Confidence: HIGH - Direct keyword match

-- ========================================
-- MATCH 2: 2017 Record Fair Articles
-- ========================================
-- Article: "Check Out the 2017 CHIRP Record Fair Social Media Stream"
-- Match with: RF_poster_2017_-_2-3.jpg (2017 Record Fair poster)
UPDATE articles
SET featured_image_id = 18
WHERE id = 1655
AND featured_image_id IS NULL;
-- Confidence: HIGH - Year and event match


-- ========================================
-- TO FIND MORE MATCHES, RUN THESE QUERIES:
-- ========================================

-- Find all Record Fair articles that need images:
-- SELECT id, title, published_date
-- FROM articles
-- WHERE (LOWER(title) LIKE '%record fair%' OR LOWER(slug) LIKE '%record%fair%')
-- AND featured_image_id IS NULL
-- ORDER BY published_date DESC;

-- Find all available Record Fair posters:
-- SELECT id, filename
-- FROM media
-- WHERE LOWER(filename) LIKE '%rf%poster%'
-- OR LOWER(filename) LIKE '%record%fair%'
-- ORDER BY filename;


-- ========================================
-- VERIFY CHANGES
-- ========================================
-- Run this to see what would be updated:
SELECT
    a.id,
    a.title,
    a.featured_image_id as old_image_id,
    m.id as new_image_id,
    m.filename as new_image
FROM articles a
CROSS JOIN media m
WHERE a.id IN (286, 287, 1655)
AND m.id IN (51, 52, 18);


-- ========================================
-- COMMIT OR ROLLBACK
-- ========================================
-- If everything looks good, run:
-- COMMIT;

-- If something is wrong, run:
-- ROLLBACK;

-- For now, let's just show what would change without committing:
SELECT
    'Would update ' || COUNT(*) || ' articles with featured images' as summary
FROM articles
WHERE id IN (286, 287, 1655)
AND featured_image_id IS NULL;

-- Automatically rollback for safety (remove this line to actually apply changes)
ROLLBACK;

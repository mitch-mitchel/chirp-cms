-- ========================================
-- CHIRP CMS: Batch Image Matching Updates
-- Generated: 2025-12-04
-- ========================================
-- INSTRUCTIONS:
-- 1. Review each section carefully
-- 2. Uncomment the sections you want to apply
-- 3. Run in psql or your database client
-- 4. Use transactions to be safe (BEGIN/COMMIT/ROLLBACK)
-- ========================================

-- Start transaction for safety
BEGIN;

-- ========================================
-- SECTION 1: HIGH CONFIDENCE MATCHES
-- These are specific keyword matches
-- Safe to apply without much review
-- ========================================

-- CHIRP Music Film Festival Articles
-- All these articles mention "CHIRP Music Film Festival" specifically
-- Matching with chirp-film-fest images (4 available)

UPDATE articles SET featured_image_id = 51 WHERE id = 286 AND featured_image_id IS NULL;
-- Article: "Reflections on Almost Famous (Screening This Saturday at the CHIRP Music Film Festival)"

UPDATE articles SET featured_image_id = 52 WHERE id = 287 AND featured_image_id IS NULL;
-- Article: "COMING SOON: Out of Time: The Material Issue Story at the CHIRP Music Film Festival"

UPDATE articles SET featured_image_id = 164 WHERE id = 288 AND featured_image_id IS NULL;
-- Article: "COMING SOON: Fanny: The Right to Rock at the CHIRP Music Film Festival"

UPDATE articles SET featured_image_id = 165 WHERE id = 289 AND featured_image_id IS NULL;
-- Article: "COMING SOON: Wattstax at the CHIRP Music Film Festival"

UPDATE articles SET featured_image_id = 51 WHERE id = 292 AND featured_image_id IS NULL;
-- Article: "COMING SOON: Almost Famous at the CHIRP Music Film Festival"

UPDATE articles SET featured_image_id = 52 WHERE id = 293 AND featured_image_id IS NULL;
-- Article: "COMING SOON: Big Star: Nothing Can Hurt Me at the CHIRP Music Film Festival"


-- 2017 Record Fair Article
-- Direct match: article about 2017 Record Fair with 2017 poster

UPDATE articles SET featured_image_id = 18 WHERE id = 1655 AND featured_image_id IS NULL;
-- Article: "Check Out the 2017 CHIRP Record Fair Social Media Stream"
-- Image: RF_poster_2017_-_2-3.jpg


-- ========================================
-- SECTION 2: MEDIUM CONFIDENCE MATCHES
-- Generic film festival articles
-- These could use stock images as fallbacks
-- Review before uncommenting
-- ========================================

-- Chicago International Film Festival Articles
-- Using stock unsplash images since no specific CIFF images exist

-- UPDATE articles SET featured_image_id = 48 WHERE id = 1 AND featured_image_id IS NULL;
-- -- Article: "Kyle Sanders Goes to the 61st Chicago International Film Festival"

-- UPDATE articles SET featured_image_id = 161 WHERE id = 5 AND featured_image_id IS NULL;
-- -- Article: "Reeling 2025: The 43rd Chicago LGBTQ+ International Film Festival"

-- UPDATE articles SET featured_image_id = 68 WHERE id = 28 AND featured_image_id IS NULL;
-- -- Article: "Kyle Sanders Reviews the 2025 Chicago Critics Film Festival"

-- UPDATE articles SET featured_image_id = 181 WHERE id = 143 AND featured_image_id IS NULL;
-- -- Article: "Highlights From the 60th Annual Chicago International Film Festival"

-- UPDATE articles SET featured_image_id = 86 WHERE id = 147 AND featured_image_id IS NULL;
-- -- Article: "Kyle Sanders Goes to the 60th Annual Chicago International Film Festival"


-- ========================================
-- VERIFICATION QUERY
-- Run this to see what will be updated
-- ========================================

SELECT
    a.id,
    LEFT(a.title, 60) as title,
    a.featured_image_id as current_image,
    m.filename as new_image
FROM articles a
LEFT JOIN media m ON m.id = CASE
    WHEN a.id = 286 THEN 51
    WHEN a.id = 287 THEN 52
    WHEN a.id = 288 THEN 164
    WHEN a.id = 289 THEN 165
    WHEN a.id = 292 THEN 51
    WHEN a.id = 293 THEN 52
    WHEN a.id = 1655 THEN 18
END
WHERE a.id IN (286, 287, 288, 289, 292, 293, 1655);


-- ========================================
-- CHECK RESULTS
-- ========================================

SELECT
    COUNT(*) as articles_that_will_be_updated
FROM articles
WHERE id IN (286, 287, 288, 289, 292, 293, 1655)
AND featured_image_id IS NULL;


-- ========================================
-- COMMIT OR ROLLBACK
-- ========================================

-- If everything looks good:
COMMIT;

-- If you want to undo:
-- ROLLBACK;


-- ========================================
-- AFTER APPLYING: Verify Results
-- ========================================

-- Uncomment and run this after committing to verify:

-- SELECT
--     a.id,
--     a.title,
--     m.filename as image,
--     m.url as image_url
-- FROM articles a
-- JOIN media m ON a.featured_image_id = m.id
-- WHERE a.id IN (286, 287, 288, 289, 292, 293, 1655)
-- ORDER BY a.id;


-- ========================================
-- FIND MORE MATCHES
-- ========================================

-- To find more articles that need images, run:

-- Record Fair articles without images:
-- SELECT id, title, published_date
-- FROM articles
-- WHERE (LOWER(title) LIKE '%record fair%' OR LOWER(slug) LIKE '%record%fair%')
-- AND featured_image_id IS NULL
-- ORDER BY published_date DESC;

-- All articles without images (recent first):
-- SELECT id, title, published_date
-- FROM articles
-- WHERE featured_image_id IS NULL
-- AND published_date IS NOT NULL
-- ORDER BY published_date DESC
-- LIMIT 50;

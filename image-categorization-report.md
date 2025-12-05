# CHIRP CMS Image Categorization Report

Generated: 2025-12-04

## Summary

- **Total unique images**: 354 (excluding auto-generated size variants)
- **Total files including variants**: 1,151

## Image Categories

### 1. Event Posters & Promotional Materials
**Potential use: Article featured images for event announcements**

- `20180227-CHIRP-RF-poster*.jpg` (6 variants) - Record Fair 2018 posters
- `CHiRP2019_Poster_11x17*.jpg` (6 variants) - 2019 Event poster
- `RF_poster_2017_-_2*.jpg` (6 variants) - 2017 Record Fair poster
- `CHIRP_spring_2013_design*.jpg` (6 variants) - Spring 2013 design
- `chirp-film-fest*.jpg` (6 variants) - Film festival event
- `Record_Fair_2015*.jpg` (6 variants) - 2015 Record Fair

**Suggested matches**: Articles about these specific events or general event coverage

---

### 2. DJ/Host Profile Photos
**Potential use: Author profile images or DJ feature articles**

People photos follow the pattern: `[name]*.jpg` with 3 variants each (original + 2 sizes)

- alex-gilbert
- andy-f
- audible-snail
- bobby-evers
- chris-siuty
- commodore-jones
- craig-reptile
- d-rock
- dj-eco
- dj-rexi
- djrynk
- drew
- eddie
- eric-wiersema
- jack-ryan
- jenny-lizak
- jenny-west
- jessi-d
- jim-mulvaney
- joanna-bz
- joe-held
- julie
- k-tel
- kevin-shields
- kevin-swallow
- m-dash
- marty-oconnell
- mary-nisi
- matt-barr
- mauricio-reyes
- meilssa
- michael-griffith
- mick-rick
- mike-bennett
- nicole-oppenheim
- ninja
- paul-anderson
- psychotic-distraction
- sarah-a
- sarah-spencer
- shannon-duffy
- shawn-campbell
- shelby
- sheriff-jackson
- Spenser
- steve-o
- steven-grady
- the-panda
- tyler-clark
- wags
- willie-mcdonagh
- yang

**Suggested matches**:
- Articles written by these DJs (match by author name)
- Feature articles about these DJs
- Show highlights or interviews

---

### 3. Placeholder Images
**Potential use: Temporary placeholders for content in development**

- beatnik-placeholder*.jpg
- caroline-placeholder*.jpg
- chesney-placeholder*.jpg
- kaleigh-placeholder*.jpg
- moimoi-placeholder*.jpg
- nik-placeholder*.jpg
- val-woj-placeholder*.jpg
- zuzu-placeholder*.jpg

---

### 4. Album Art / Player Fallback Images
**Potential use: Music-related articles or player UI**

- `album-art-01.png` through `album-art-31.png` (31 total)

**Note**: These are likely used for the radio player fallback images when album art isn't available from streaming services.

---

### 5. Merchandise/Shop Items
**Potential use: Shop item images (not for articles)**

- `baby_onesie_*` series (multiple variants)
- `Baby_onesie_2021-*` series (10+ variants)
- `Baby_onesie-*` series
- `black_chirp_shirt-*` (3 variants)
- `Red_CHIRP_shirt_3*` (6 variants)
- `Shawn_chirp_shirt*` (3 variants)
- `the-candy-lady*` (3 variants - possibly merchandise)

---

### 6. Event/Activity Photos
**Potential use: Article featured images for event recaps**

- `chirp_sandcastles01*` (6 variants) - Beach/sandcastle event
- `chirp_sandcastles01(3)*` (3 variants)
- `chirp_sandcastles02*` (3 variants)

**Suggested matches**: Articles about summer events, community activities

---

### 7. Organization Logos & Branding
**Potential use: Partnership articles or sponsor features**

- `FirstTimeLogo*.jpg/png` (8 variants) - "First Time" logo
- `NEW IAC LOGO_Black_Green*.jpg/png` (6 variants) - IAC (Illinois Arts Council?) logo
- `dcase*.jpg/png` (6 variants) - DCASE (Department of Cultural Affairs) logo

**Suggested matches**: Articles about partnerships, grant announcements, collaborations

---

### 8. Stock/Generic Images
**Potential use: Generic article headers when specific images aren't available**

Unsplash photos (professional stock photography):
- `bp-miller-M98DitdZi0Q-unsplash*.jpg` (3 variants)
- `ehimetalor-akhere-unuabona-1SiLHYYmMrU-unsplash*.jpg` (3 variants)
- `marloes-hilckmann-40l3zKiOC8k-unsplash*.jpg` (3 variants)
- `rob-griffin-xKQr7RoOW44-unsplash*.jpg` (3 variants)
- `robert-zunikoff-oK6VHjsnHys-unsplash*.jpg` (3 variants)
- `ryan-zazueta-GEJ7tZoXnt0-unsplash*.jpg` (3 variants)
- `venti-views-IUerQnW26-g-unsplash*.jpg` (3 variants)

Other generic:
- `image5*.jpg` (3 variants) - Generic image
- `Liz_Mason_2_bw*.jpg` (3 variants) - B&W portrait
- `bdc*.jpg` (3 variants) - Unknown acronym

---

## Matching Strategy Recommendations

### For Event-Based Articles
1. **Date matching**: Event posters with dates (e.g., `20180227-CHIRP-RF-poster`) should match articles published around that date
2. **Keyword matching**: Articles with "Record Fair", "Film Fest", "CHIRP 2019" in title should match corresponding posters

### For DJ/Host Profile Articles
1. **Author matching**: Match article author field to DJ photo filename
   - Example: Article by "Shannon Duffy" → `shannon-duffy.jpg`
   - Example: Article by "DJ Rexi" → `dj-rexi.jpg`
2. **Title matching**: Articles featuring or interviewing a DJ
   - Example: "Interview with Jenny Lizak" → `jenny-lizak.jpg`

### For General Content Articles
1. **Keyword matching**: Extract keywords from article title/slug and match with image names
   - Example: Article slug "chirp-sandcastles-event-recap" → `chirp_sandcastles01.jpg`
2. **Topic matching**:
   - Music/album reviews → `album-art-*.png`
   - Partnership announcements → Logo images
   - Generic content → Unsplash stock photos

### Priority Actions

1. **Event posters** (high confidence matches)
   - These have specific dates and names
   - Should be relatively easy to match with event announcement articles

2. **DJ profile photos** (high confidence matches)
   - Match by author name or article subject
   - 51 DJ photos available

3. **Event photos** (medium confidence matches)
   - Sandcastle event photos for event recap articles
   - Need to review article titles/content

4. **Stock photos** (low confidence, fallback option)
   - Use for articles that don't have specific matches
   - Generic enough to work with most content

---

## Recommendations for Next Steps

### Option A: Automated Matching Script
Install dependencies and run the automated matching script:
```bash
npm install
npm run match-images  # (would need to add to package.json)
```

The script will:
- Query all articles from the database
- Apply matching algorithms
- Generate a detailed report with suggestions
- Optionally auto-assign images based on confidence level

### Option B: Manual Matching with Database Query
1. Export article data (titles, slugs, authors, dates)
2. Manually review and create a mapping CSV
3. Import and apply the mappings

### Option C: Category-First Approach
1. First categorize all media items in the CMS using the `category` field
2. Then manually assign featured images through the CMS admin panel
3. Use this report as a reference guide

### Option D: Database Direct Query
Connect directly to PostgreSQL and query articles, then create matches:
```bash
psql postgresql://chirp:chirp_dev_password@localhost:5432/chirp_cms
SELECT id, title, slug, author FROM articles WHERE featured_image_id IS NULL;
```

---

## File Naming Patterns Identified

1. **People**: `[first-last-name]*.jpg` (hyphenated, lowercase)
2. **Events with dates**: `YYYYMMDD-event-name*.jpg`
3. **Events general**: `event-name*.jpg/png`
4. **Merchandise**: `product-name-variant*.jpg`
5. **Placeholders**: `name-placeholder*.jpg`
6. **Stock photos**: `photographer-id-unsplash*.jpg`
7. **Logos**: `Organization_Name*.jpg/png`
8. **Album art**: `album-art-##.png` (numbered)

These patterns can be used to create automated matching algorithms.

---

## Questions to Consider

1. **Do articles require featured images?**
   - If yes, which categories get priority?
   - Can generic stock photos be used as fallbacks?

2. **Should DJ photos be linked to their authored articles?**
   - This would create a consistent visual identity for authors

3. **Should event posters be used for both announcements AND recaps?**
   - Or should recaps use event photos instead?

4. **What about articles without obvious image matches?**
   - Use stock photos?
   - Leave blank?
   - Create new images?

---

## Technical Notes

- All images have auto-generated size variants: 400x300, 800x400, 1200xAuto
- Original files are stored without size suffix
- Images are stored in `/media/` directory (flat structure, no subdirectories)
- Payload CMS handles image resizing automatically
- Media items can have a `category` field for organization

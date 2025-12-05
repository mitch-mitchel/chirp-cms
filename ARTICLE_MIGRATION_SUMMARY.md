# CHIRP CMS Article Migration Summary

## Overview
Successfully migrated articles from the ExpressionEngine database to Payload CMS.

## Migration Results

### ✅ Completed
- **Total Articles Migrated**: 500
- **Source**: ExpressionEngine (channel_id 3 - "Blog")
- **Destination**: Payload CMS `articles` collection
- **Status**: All articles published and accessible

### Article Data Migrated
| Field | Source | Notes |
|-------|--------|-------|
| **Title** | `exp_channel_titles.title` | ✅ Migrated |
| **Slug** | `exp_channel_titles.url_title` | ✅ Migrated |
| **Published Date** | `exp_channel_titles.entry_date` | ✅ Converted from Unix timestamp |
| **Updated Date** | `exp_channel_titles.edit_date` | ✅ Converted from Unix timestamp |
| **Author** | Default | Set to "CHIRP Radio" (original author field not migrated) |
| **Category** | Default | Set to "General" category (ID: 1) |
| **Content** | `exp_channel_data.field_id_89` | ⚠️ Converted from HTML to Lexical format |
| **Excerpt** | `exp_channel_data.field_id_1` | ✅ Migrated with fallback to title |
| **Featured Image** | `exp_channel_data.field_id_88` | ⚠️ Field exists but not yet linked to media |

### Sample Articles
Latest migrated articles (sorted by published date):

1. Kyle Sanders Goes to the 61st Chicago International Film Festival (Oct 17, 2025)
2. Coming Attractions: "Fundraiser" by bar italia (Oct 11, 2025)
3. The CHIRP Radio Interview: Alejandro Montoya Marin and Matt Walsh of 'The Unexpecteds' (Oct 5, 2025)
4. Coming Attractions: "Big Drops" by Avery Tucker (Oct 3, 2025)
5. Reeling 2025: The 43rd Chicago LGBTQ+ International Film Festival (Oct 3, 2025)

## Categories Created
- **General** (ID: 1) - Default category for all migrated articles

## Access Points

### Admin Panel
View all articles: http://localhost:3000/admin/collections/articles

### API Endpoint
```bash
# Get all articles
curl http://localhost:3000/api/articles

# Get articles with limit
curl http://localhost:3000/api/articles?limit=10

# Get specific article
curl http://localhost:3000/api/articles/1
```

### Database
```sql
-- Check article count
SELECT COUNT(*) FROM articles;

-- View recent articles
SELECT id, title, author, published_date
FROM articles
ORDER BY published_date DESC
LIMIT 10;
```

## Remaining Articles in ExpressionEngine
- **Total in EE database**: 2,594 blog articles
- **Migrated**: 500 (first batch)
- **Remaining**: 2,094

To migrate the rest, run the migration script again after updating the LIMIT:
```bash
docker exec chirp-cms npx tsx /app/scripts/migrate-from-ee-to-payload.ts
```

## Next Steps

### 1. Migrate Remaining Articles
Edit the script to increase the limit or remove it entirely:
```typescript
// In migrate-from-ee-to-payload.ts
LIMIT 500  // Change to higher number or remove
```

### 2. Link Featured Images
The migration script detected featured image references (`field_id_88`) but didn't link them to the media collection yet. You can:
- Manually update articles with featured images in the admin panel
- Create a script to map old image references to new media IDs

### 3. Migrate Other Content
The ExpressionEngine database contains:
- **Events**: 1,092 entries (channel_id 4)
- **Podcasts**: 961 entries (channel_id 7)
- **Pages**: 47 entries (channel_id 23)

Use similar migration scripts to import these collections.

### 4. Improve Content Conversion
The current script converts HTML content to basic Lexical format. Consider:
- Using an HTML-to-Lexical converter for better formatting
- Preserving images, links, and formatting from original content
- Migrating category information from ExpressionEngine categories

### 5. Map Authors
Currently all articles are attributed to "CHIRP Radio". To preserve original authors:
- Map `author_id` from ExpressionEngine to Payload users
- Create author profiles if needed
- Update articles with correct author references

## Notes

### Webhook Errors
During migration, you may see webhook errors:
```
[Webhook] Error sending webhook: TypeError: fetch failed
```
This is **expected** - it means the frontend at `http://localhost:5173` is not running. The articles are still created successfully.

### Content Format
Articles from ExpressionEngine use HTML formatting. The migration converts this to Payload's Lexical format, but advanced formatting may be lost. Review articles and adjust formatting as needed.

### Dates
Article dates use the ExpressionEngine entry_date (Unix timestamp), which has been converted to ISO 8601 format for Payload.

## Files Created
- `scripts/migrate-from-ee-to-payload.ts` - Migration script
- `ARTICLE_MIGRATION_SUMMARY.md` - This summary

## Status: ✅ 500 Articles Successfully Migrated

All articles are now visible in the Payload CMS admin panel and accessible via the API!

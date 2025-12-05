# HTML Entity Decoding Fix

## Issue

Excerpts displaying with HTML entities instead of proper characters:
- **Problem**: `can&rsquo;t` instead of `can't`
- **Example**: "No one thought there could be sound in space since sound waves can&rsquo;t travel in a vacuum"

## Investigation Results

✅ **VERIFIED**: The Payload CMS database does NOT contain any HTML entities in excerpts!

**Database Verification (Completed):**
- 2,580 articles - 0 records with HTML entities
- 1,007 events - 0 records with HTML entities
- 946 podcasts - 0 records with HTML entities

All data in the Payload CMS database is clean and properly formatted.

## Likely Causes

Since the Payload database is clean, the HTML entities must be coming from:

1. **Old ExpressionEngine API** - Frontend still hitting old EE endpoints
2. **Cached Data** - Frontend using cached data from before migration
3. **Separate Frontend Database** - Frontend connected to old database
4. **Legacy API Endpoint** - Using unmigrated API endpoint

## Solutions Implemented

### 1. Future-Proof Migration ✅

Updated the migration script (`migrate-all-collections.ts`) to automatically decode HTML entities for any future migrations.

### 2. Fix Script Created ✅

Created `scripts/fix-html-entities-in-excerpts.ts` - can be run to clean up any HTML entities if they appear.

**Run with:**
```bash
docker exec chirp-cms npx tsx /app/scripts/fix-html-entities-in-excerpts.ts
```

### 3. Frontend Utility Function ✅

Created `src/utils/decodeHtmlEntities.ts` with two utilities:

#### Option A: Direct Function
```typescript
import { decodeHtmlEntities } from '@/utils/decodeHtmlEntities'

function ArticleCard({ article }) {
  const cleanExcerpt = decodeHtmlEntities(article.excerpt)
  return <p>{cleanExcerpt}</p>
}
```

#### Option B: React Hook
```typescript
import { useDecodeHtmlEntities } from '@/utils/decodeHtmlEntities'

function ArticleCard({ article }) {
  const cleanExcerpt = useDecodeHtmlEntities(article.excerpt)
  return <p>{cleanExcerpt}</p>
}
```

## Frontend Fix Instructions

### Step 1: Verify Data Source

Check where your frontend is getting data:

```typescript
// Check your API endpoint
console.log('API URL:', process.env.NEXT_PUBLIC_API_URL)

// Check the raw data
const response = await fetch('/api/articles')
const data = await response.json()
console.log('Excerpt:', data.docs[0].excerpt)
```

### Step 2: Update API Endpoint

**If using old ExpressionEngine API**, update to Payload CMS:

```typescript
// OLD (ExpressionEngine)
const API_URL = 'https://old-site.com/api'

// NEW (Payload CMS)
const API_URL = 'http://localhost:3000/api'
// or
const API_URL = process.env.NEXT_PUBLIC_PAYLOAD_API_URL
```

### Step 3: Apply Decoding (if needed)

If you can't update the API endpoint immediately, use the utility:

```typescript
// In your article display component
import { decodeHtmlEntities } from '@/utils/decodeHtmlEntities'

export function ArticleCard({ article }) {
  return (
    <div>
      <h2>{article.title}</h2>
      <p>{decodeHtmlEntities(article.excerpt)}</p>
    </div>
  )
}
```

### Step 4: Clear Cache

If using cached data:

```bash
# Next.js
rm -rf .next
npm run build

# Or clear browser cache
# Hard reload: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
```

## Quick Test

To verify which source has the issue:

```bash
# Test Payload CMS API (should be clean)
curl http://localhost:3000/api/articles?limit=1 | grep excerpt

# Check if it contains &rsquo; or other entities
# If clean, the problem is in the frontend data source
```

## Files Created

1. **`src/utils/decodeHtmlEntities.ts`** - Frontend utility function
2. **`scripts/fix-html-entities-in-excerpts.ts`** - Database cleanup script
3. **Updated `scripts/migrate-all-collections.ts`** - Auto-decodes on migration

## Summary

✅ **Payload CMS Database**: VERIFIED CLEAN (0 records with HTML entities)
✅ **Migration Script**: Updated to decode entities in future migrations
✅ **Fix Script**: Available but not needed (database already clean)
✅ **Frontend Utility**: Ready to use in frontend application

**Next Action**: The issue is in your frontend application, not the CMS database. See **FRONTEND_HTML_ENTITY_FIX.md** for step-by-step instructions to fix the frontend display issue.

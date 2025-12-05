# Frontend HTML Entity Fix - Action Required

## Current Status

**Database Verification Complete:**
- ✅ 2,580 articles - **0 records with HTML entities**
- ✅ 1,007 events - **0 records with HTML entities**
- ✅ 946 podcasts - **0 records with HTML entities**

**The Payload CMS database is completely clean.** All excerpts are properly formatted without HTML entities like `&rsquo;`, `&nbsp;`, `&mdash;`, etc.

## Root Cause

Since the Payload CMS API at `http://localhost:3000/api` returns clean data, the HTML entities appearing in your frontend are coming from one of these sources:

1. **Old API Endpoint** - Frontend still hitting ExpressionEngine API
2. **Cached Data** - Using stale cached data from before migration
3. **Static Site Generation** - Pre-rendered pages using old data
4. **Browser Cache** - Client-side cached responses

## How to Fix

### Step 1: Verify Your API Endpoint

Check which API your frontend is using:

```typescript
// In your frontend code, find where you fetch articles
console.log('API URL:', process.env.NEXT_PUBLIC_API_URL)
// or
console.log('API URL:', process.env.VITE_API_URL) // for Vite
// or
console.log('API URL:', process.env.REACT_APP_API_URL) // for Create React App
```

**Expected:** `http://localhost:3000/api` (Payload CMS)
**Problem:** Any other URL (old ExpressionEngine API)

### Step 2: Update Environment Variables

If using the wrong API, update your frontend's `.env` file:

```bash
# .env (frontend project)
NEXT_PUBLIC_API_URL=http://localhost:3000/api
# or
VITE_API_URL=http://localhost:3000/api
# or
REACT_APP_API_URL=http://localhost:3000/api
```

### Step 3: Clear All Caches

```bash
# Frontend project
rm -rf .next              # Next.js cache
rm -rf dist               # Vite build
rm -rf build              # Create React App build
rm -rf node_modules/.cache # General cache

# Rebuild
npm run build
npm run dev

# Browser
# Hard reload: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
```

### Step 4: Verify Clean Data

Test the Payload API directly to confirm it's clean:

```bash
# Test articles endpoint
curl http://localhost:3000/api/articles?limit=1 | jq '.docs[0].excerpt'

# Should show clean text like: "can't" not "can&rsquo;t"
```

### Step 5: Apply Decoding Utility (Temporary Fix)

If you cannot update the API endpoint immediately, use the provided utility function to decode entities on the frontend:

#### Option A: Copy the Utility Function

Copy `/src/utils/decodeHtmlEntities.ts` from the CMS repository to your frontend project:

```typescript
// In your frontend project: src/utils/decodeHtmlEntities.ts
export function decodeHtmlEntities(text: string | null | undefined): string {
  if (!text) return ''

  const entities: Record<string, string> = {
    '&amp;': '&',
    '&rsquo;': '\u2019', // '
    '&lsquo;': '\u2018', // '
    '&rdquo;': '\u201D', // "
    '&ldquo;': '\u201C', // "
    '&nbsp;': ' ',
    '&mdash;': '\u2014', // —
    '&ndash;': '\u2013', // –
    '&hellip;': '\u2026', // …
  }

  let decoded = text
  for (const [entity, char] of Object.entries(entities)) {
    decoded = decoded.replace(new RegExp(entity, 'g'), char)
  }

  // Decode numeric entities
  decoded = decoded.replace(/&#(\d+);/g, (match, dec) =>
    String.fromCharCode(parseInt(dec, 10))
  )
  decoded = decoded.replace(/&#x([0-9a-f]+);/gi, (match, hex) =>
    String.fromCharCode(parseInt(hex, 16))
  )

  return decoded
}
```

#### Option B: Use in Components

Apply the function wherever you display excerpts:

```typescript
// ArticleCard.tsx (or similar)
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

#### Option C: Create an API Wrapper

Decode entities when fetching data:

```typescript
// api/articles.ts
import { decodeHtmlEntities } from '@/utils/decodeHtmlEntities'

export async function getArticles() {
  const response = await fetch(`${API_URL}/articles`)
  const data = await response.json()

  // Decode entities in all excerpts
  return {
    ...data,
    docs: data.docs.map(article => ({
      ...article,
      excerpt: decodeHtmlEntities(article.excerpt)
    }))
  }
}
```

## Testing Checklist

- [ ] Verify API endpoint is `http://localhost:3000/api`
- [ ] Clear frontend build cache
- [ ] Clear browser cache (hard reload)
- [ ] Test excerpt displays correctly: "can't" not "can&rsquo;t"
- [ ] Verify other special characters: dashes (—), quotes (""), ellipses (…)
- [ ] Check mobile and desktop views
- [ ] Test in different browsers

## Files Available in CMS Repository

1. `/src/utils/decodeHtmlEntities.ts` - Utility function (copy to frontend)
2. `/scripts/fix-html-entities-in-excerpts.ts` - Database fix script (not needed, DB is clean)
3. `/HTML_ENTITY_FIX.md` - Investigation details

## Need Help?

If excerpts still show HTML entities after following these steps:

1. Check your frontend's network tab in DevTools
2. Look at the actual API response
3. Verify the URL being called
4. Check if a CDN or proxy is caching responses

The Payload CMS is serving clean data - the issue is in how your frontend retrieves or displays it.

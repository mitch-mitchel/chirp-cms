# Apply CMS Schema Fix

This document explains how to fix the missing database tables and columns that are causing the "Cannot read properties of undefined (reading 'type')" error when editing events in the CMS.

## Problem

The CMS code expects the following database structures that don't exist in production:

**Missing Tables:**

- `site_settings_navigation_items`
- `site_settings_additional_logos`
- `site_settings_social_links`

**Missing Columns:**

- `listeners.social_links_tiktok`
- `pages.song_request_cooldown_minutes`
- `pages.song_request_cooldown_message`

## Solution

Apply the `fix-schema.sql` script to the production PostgreSQL database.

## Option 1: Apply via psql command line

```bash
# Connect to your production database and run the script
psql -h <your-db-host> -U <your-db-user> -d <your-db-name> -f fix-schema.sql
```

## Option 2: Apply via AWS RDS Query Editor (if using AWS RDS)

1. Go to AWS RDS Console
2. Select your database instance
3. Click "Query Editor" or "Query Database"
4. Copy and paste the contents of `fix-schema.sql`
5. Execute the query

## Option 3: Apply via database management tool

1. Open your database management tool (pgAdmin, DBeaver, etc.)
2. Connect to the production database
3. Open `fix-schema.sql` in the SQL query editor
4. Execute the script

## Verification

After running the script, the last query will output a verification result showing:

- The new columns added to `listeners` and `pages` tables
- Confirmation that the three new tables exist

You should see output like:

```
table_name                          | column_name                       | data_type
------------------------------------|-----------------------------------|-----------
listeners                           | social_links_tiktok               | varchar
pages                               | song_request_cooldown_minutes     | integer
pages                               | song_request_cooldown_message     | varchar
site_settings_additional_logos      | table exists                      | boolean
site_settings_navigation_items      | table exists                      | boolean
site_settings_social_links          | table exists                      | boolean
```

## Testing

After applying the schema fix:

1. Restart the CMS service to ensure it picks up the new schema
2. Try editing and saving an event in the CMS
3. The "Cannot read properties of undefined (reading 'type')" error should be resolved

## Rollback (if needed)

If you need to rollback these changes:

```sql
-- Drop the added columns
ALTER TABLE listeners DROP COLUMN IF EXISTS social_links_tiktok;
ALTER TABLE pages DROP COLUMN IF EXISTS song_request_cooldown_minutes;
ALTER TABLE pages DROP COLUMN IF EXISTS song_request_cooldown_message;

-- Drop the added tables
DROP TABLE IF EXISTS site_settings_navigation_items CASCADE;
DROP TABLE IF EXISTS site_settings_additional_logos CASCADE;
DROP TABLE IF EXISTS site_settings_social_links CASCADE;
```

## Why This Happened

The CMS uses PayloadCMS with PostgreSQL adapter configured with `push: true`, which should automatically push schema changes to the database. However, this didn't work correctly for these new fields, likely due to:

- The CMS running against a different database during development (SQLite)
- Migration generation failing due to drizzle-kit version/dialect mismatches
- Schema changes added after initial deployment without proper migration

## Future Prevention

To prevent this issue in the future:

1. Always test schema changes in a staging environment before production
2. Consider using explicit migrations instead of relying on `push: true`
3. Monitor CMS logs for schema-related errors after deployments

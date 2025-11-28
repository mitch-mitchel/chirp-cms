-- Fix CHIRP CMS Schema - Add missing tables and columns
-- Run this against the production PostgreSQL database

-- Add missing column to listeners table (for TikTok social link)
ALTER TABLE listeners
ADD COLUMN IF NOT EXISTS social_links_tiktok VARCHAR;

-- Add missing column to pages table (for song request cooldown)
ALTER TABLE pages
ADD COLUMN IF NOT EXISTS song_request_cooldown_minutes INTEGER DEFAULT 5;

ALTER TABLE pages
ADD COLUMN IF NOT EXISTS song_request_cooldown_message VARCHAR DEFAULT 'You can submit another request in {minutes} minutes.';

-- Create site_settings_navigation_items table
CREATE TABLE IF NOT EXISTS site_settings_navigation_items (
  _order INTEGER NOT NULL,
  _parent_id INTEGER NOT NULL,
  id SERIAL PRIMARY KEY,
  nav_item VARCHAR,
  custom_label VARCHAR,
  open_in_new_tab BOOLEAN DEFAULT false,
  _uuid VARCHAR,
  CONSTRAINT site_settings_navigation_items_parent_id_fk FOREIGN KEY (_parent_id) REFERENCES site_settings(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS site_settings_navigation_items_order_idx ON site_settings_navigation_items (_order);
CREATE INDEX IF NOT EXISTS site_settings_navigation_items_parent_id_idx ON site_settings_navigation_items (_parent_id);

-- Create site_settings_additional_logos table
CREATE TABLE IF NOT EXISTS site_settings_additional_logos (
  _order INTEGER NOT NULL,
  _parent_id INTEGER NOT NULL,
  id SERIAL PRIMARY KEY,
  logo INTEGER,
  logo_url VARCHAR,
  alt VARCHAR,
  _uuid VARCHAR,
  CONSTRAINT site_settings_additional_logos_parent_id_fk FOREIGN KEY (_parent_id) REFERENCES site_settings(id) ON DELETE CASCADE,
  CONSTRAINT site_settings_additional_logos_logo_fk FOREIGN KEY (logo) REFERENCES media(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS site_settings_additional_logos_order_idx ON site_settings_additional_logos (_order);
CREATE INDEX IF NOT EXISTS site_settings_additional_logos_parent_id_idx ON site_settings_additional_logos (_parent_id);
CREATE INDEX IF NOT EXISTS site_settings_additional_logos_logo_idx ON site_settings_additional_logos (logo);

-- Create site_settings_social_links table
CREATE TABLE IF NOT EXISTS site_settings_social_links (
  _order INTEGER NOT NULL,
  _parent_id INTEGER NOT NULL,
  id SERIAL PRIMARY KEY,
  platform VARCHAR,
  url VARCHAR,
  label VARCHAR,
  _uuid VARCHAR,
  CONSTRAINT site_settings_social_links_parent_id_fk FOREIGN KEY (_parent_id) REFERENCES site_settings(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS site_settings_social_links_order_idx ON site_settings_social_links (_order);
CREATE INDEX IF NOT EXISTS site_settings_social_links_parent_id_idx ON site_settings_social_links (_parent_id);

-- Verify the changes
SELECT
  'listeners' as table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'listeners'
  AND column_name IN ('social_links_tiktok')
UNION ALL
SELECT
  'pages' as table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'pages'
  AND column_name IN ('song_request_cooldown_minutes', 'song_request_cooldown_message')
UNION ALL
SELECT
  table_name::text,
  'table exists' as column_name,
  'boolean' as data_type
FROM information_schema.tables
WHERE table_name IN (
  'site_settings_navigation_items',
  'site_settings_additional_logos',
  'site_settings_social_links'
)
ORDER BY table_name, column_name;

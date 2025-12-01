#!/usr/bin/env python3
import sqlite3
import psycopg2
import json

# Configuration
SQLITE_DB = '/Users/steve/Documents/projects/chirp-cms/data-backups/payload.db'
PG_CONN = 'postgresql://chirp:chirp_dev_password@localhost:5432/chirp_cms'

# Collections to migrate
COLLECTIONS = [
    'categories',
    'venues',
    'announcements',
    'advertisements',
    'articles',
    'events',
    'podcasts',
    'shop_items',
    'weekly_charts',
    'volunteer_calendar',
    'pages',
    'age_gate',
    'donations',
    'purchases',
    'onboarding',
]

def migrate():
    print('🚀 Starting SQLite to PostgreSQL migration...\n')

    # Connect to SQLite
    sqlite_conn = sqlite3.connect(SQLITE_DB)
    sqlite_conn.row_factory = sqlite3.Row
    sqlite_cur = sqlite_conn.cursor()
    print('✅ Connected to SQLite\n')

    # Connect to PostgreSQL
    pg_conn = psycopg2.connect(PG_CONN)
    pg_cur = pg_conn.cursor()
    print('✅ Connected to PostgreSQL\n')

    for table in COLLECTIONS:
        try:
            print(f'📦 Migrating {table}...')

            # Get data from SQLite
            sqlite_cur.execute(f'SELECT * FROM {table}')
            rows = sqlite_cur.fetchall()

            if not rows:
                print(f'   ⚠️  No data found\n')
                continue

            print(f'   📥 Found {len(rows)} records')

            # Clear PostgreSQL table
            pg_cur.execute(f'DELETE FROM {table}')
            print(f'   🗑️  Cleared existing data')

            # Insert data
            imported = 0
            errors = 0

            for row in rows:
                try:
                    # Get column names (except id which is auto-increment)
                    columns = [col for col in row.keys() if col != 'id']
                    values = []
                    placeholders = []

                    for i, col in enumerate(columns, 1):
                        value = row[col]

                        # Check if value looks like JSON
                        if isinstance(value, str) and (value.startswith('{') or value.startswith('[')):
                            try:
                                # Validate JSON
                                json.loads(value)
                                placeholders.append(f'%s::jsonb')
                            except:
                                placeholders.append('%s')
                        else:
                            placeholders.append('%s')

                        values.append(value)

                    # Build INSERT query
                    query = f'''
                        INSERT INTO {table} ({', '.join(columns)})
                        VALUES ({', '.join(placeholders)})
                    '''

                    pg_cur.execute(query, values)
                    imported += 1

                except Exception as e:
                    errors += 1
                    if errors <= 3:
                        print(f'   ⚠️  Error: {str(e)[:80]}')

            pg_conn.commit()
            print(f'   ✅ Imported {imported}/{len(rows)} records{f" ({errors} errors)" if errors > 0 else ""}\n')

        except Exception as e:
            print(f'   ❌ Error: {str(e)}\n')
            pg_conn.rollback()

    # Close connections
    sqlite_conn.close()
    pg_conn.close()

    print('\n✨ Migration complete!\n')

if __name__ == '__main__':
    try:
        migrate()
    except Exception as e:
        print(f'❌ Migration failed: {e}')
        exit(1)

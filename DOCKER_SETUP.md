# CHIRP CMS Docker Setup with 24/7 Playlist Poller

This guide explains how to run the CHIRP CMS and playlist poller in Docker containers.

## Services

The Docker setup includes three main services:

1. **db** - PostgreSQL database
2. **app** - CHIRP CMS web application (port 3000)
3. **poller** - 24/7 playlist poller that records tracks from CHIRP Radio API

## Quick Start

### 1. Build and Start All Services

```bash
cd /Users/ryanwilson/Documents/Clients/CHIRP/chirp-cms

# Build and start all services
docker-compose up -d --build
```

This will start:
- PostgreSQL on `localhost:5432`
- CMS app on `http://localhost:3000`
- Playlist poller (runs in background)

### 2. Seed the Database

Once the containers are running, seed the database with initial data:

```bash
# Run seed script inside the app container
docker-compose exec app npm run seed
```

This will populate:
- Articles, Events, Podcasts
- Player fallback images
- Tracks played (sample data)

### 3. Monitor the Playlist Poller

Watch the poller logs to see tracks being recorded in real-time:

```bash
# Follow poller logs
docker-compose logs -f poller

# You should see output like:
# 🎵 CHIRP Radio Playlist Poller
# ✓ Fetched playlist data
# ✅ Recorded: Artist Name - Track Name
```

## Useful Commands

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f app
docker-compose logs -f poller
docker-compose logs -f db
```

### Restart Services

```bash
# Restart all
docker-compose restart

# Restart specific service
docker-compose restart poller
```

### Stop All Services

```bash
docker-compose down
```

### Stop and Remove Volumes (Fresh Start)

```bash
# WARNING: This deletes all database data!
docker-compose down -v
```

### Access the Database

```bash
# PostgreSQL shell
docker-compose exec db psql -U chirp -d chirp_cms

# Check tracks-played table
docker-compose exec db psql -U chirp -d chirp_cms -c "SELECT * FROM tracks_played ORDER BY \"playedAt\" DESC LIMIT 10;"
```

### Clear All Tracks (for Testing)

```bash
# Run the clear script
docker-compose exec app npx tsx scripts/clear-tracks-played.ts
```

## Database Access

- **Host**: `localhost`
- **Port**: `5432`
- **Database**: `chirp_cms`
- **User**: `chirp`
- **Password**: `chirp_dev_password`

## API Endpoints

Once running, the CMS is available at:

- **CMS Admin**: http://localhost:3000/admin
- **API**: http://localhost:3000/api
- **Tracks Played**: http://localhost:3000/api/tracks-played

## Troubleshooting

### Poller Not Recording Tracks

```bash
# Check if poller is running
docker ps | grep chirp-poller

# Check poller logs for errors
docker-compose logs poller

# Restart poller
docker-compose restart poller
```

### Database Connection Issues

```bash
# Check database health
docker-compose ps

# Ensure database is healthy before app starts
docker-compose up -d db
docker-compose logs db

# Wait for "database system is ready to accept connections"
# Then start app and poller
docker-compose up -d app poller
```

### Rebuild After Code Changes

```bash
# Stop everything
docker-compose down

# Rebuild and restart
docker-compose up -d --build
```

## How It Works

### Playlist Poller

- Polls `https://chirpradio.appspot.com/api/current_playlist` every **10 seconds**
- Records both `now_playing` and `recently_played` tracks
- Uses deterministic fallback images when Last.fm art is unavailable
- Prevents duplicates using `playlist_event_id`
- Runs 24/7 with automatic restart on failure (`restart: unless-stopped`)

### Data Flow

1. Poller fetches current playlist from CHIRP Radio API
2. Extracts track data (artist, track, album, DJ, timestamps)
3. Checks for duplicates in database
4. Records new tracks to `tracks-played` collection
5. Frontend fetches tracks from CMS API with auto-refresh every 15 seconds

## Production Deployment

For production:

1. Change `PAYLOAD_SECRET` in docker-compose.yml
2. Set `NODE_ENV=production`
3. Configure proper CORS in `FRONTEND_URL`
4. Use a managed PostgreSQL database instead of container DB
5. Consider using Docker Swarm or Kubernetes for orchestration

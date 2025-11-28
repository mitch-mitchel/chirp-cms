import type { Payload } from 'payload'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export const seedTracksPlayed = async (payload: Payload) => {
  console.log('🎵 Seeding tracks played...')

  // Read the seed data
  const seedDataPath = path.resolve(__dirname, 'seed-tracks-played-data.json')
  const seedData = JSON.parse(fs.readFileSync(seedDataPath, 'utf-8'))

  for (const track of seedData.tracks) {
    // Check if track already exists by playlistEventId
    const { docs: existing } = await payload.find({
      collection: 'tracks-played',
      where: {
        playlistEventId: { equals: track.playlistEventId },
      },
      limit: 1,
    })

    if (existing.length > 0) {
      console.log(`  ⊘ ${track.artistName} - ${track.trackName} (already exists)`)
      continue
    }

    await payload.create({
      collection: 'tracks-played',
      data: track,
    })
    console.log(`  ✓ ${track.artistName} - ${track.trackName}`)
  }

  console.log(`✓ ${seedData.tracks.length} tracks played seeded\n`)
}

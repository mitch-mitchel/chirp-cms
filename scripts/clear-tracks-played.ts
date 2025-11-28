/**
 * Clear all tracks-played records
 */
import { getPayload } from 'payload'
import config from '../payload.config'

async function clearTracks() {
  const payload = await getPayload({ config })
  
  console.log('🗑️  Fetching all tracks to delete...')
  const { docs, totalDocs } = await payload.find({
    collection: 'tracks-played',
    limit: 1000,
  })
  
  console.log(`Found ${totalDocs} tracks to delete`)
  
  for (const track of docs) {
    await payload.delete({
      collection: 'tracks-played',
      id: track.id,
    })
    console.log(`  ✓ Deleted: ${track.artistName} - ${track.trackName}`)
  }
  
  console.log(`\n✨ Deleted ${totalDocs} tracks`)
  process.exit(0)
}

clearTracks().catch((error) => {
  console.error('❌ Error:', error)
  process.exit(1)
})

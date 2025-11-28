import { getPayload } from 'payload'
import config from '../payload.config'
import Database from 'better-sqlite3'

interface OldListener {
  id: number
  email: string
  username?: string
  first_name?: string
  last_name?: string
  member_since?: string
  profile_image_id?: number
  location?: string
  primary_phone_type?: string
  primary_phone?: string
  secondary_phone_type?: string
  secondary_phone?: string
  address?: string
  city?: string
  state?: string
  zip_code?: string
  age?: string
  education?: string
  employer?: string
  has_radio_experience?: string
  radio_stations?: string
  wants_to_d_j?: string
  social_links_facebook?: string
  social_links_instagram?: string
  social_links_twitter?: string
  social_links_bluesky?: string
  social_links_linkedin?: string
  dj_name?: string
  show_name?: string
  show_time?: string
  dj_excerpt?: string
  dj_bio?: string
  dj_donation_link?: string
}

async function main() {
  console.log('🔄 Starting DJ restoration from backup...')

  // Connect to SQLite backup
  const db = new Database('/tmp/payload.db', { readonly: true })

  // Get all DJs (listeners with dj_name)
  const djs = db
    .prepare('SELECT * FROM listeners WHERE dj_name IS NOT NULL')
    .all() as OldListener[]

  console.log(`📊 Found ${djs.length} DJs in backup`)

  // Connect to PostgreSQL
  const payload = await getPayload({ config })

  let imported = 0
  let skipped = 0
  let errors = 0

  for (const oldDj of djs) {
    try {
      // Check if email already exists
      const { docs: existing } = await payload.find({
        collection: 'listeners',
        where: {
          email: {
            equals: oldDj.email,
          },
        },
        limit: 1,
      })

      if (existing.length > 0) {
        console.log(`⏭️  Skipping ${oldDj.dj_name} (${oldDj.email}) - already exists`)
        skipped++
        continue
      }

      // Generate a temporary password (user must reset via "forgot password")
      // Format: CHIRP_<random 12 chars>
      const tempPassword =
        'CHIRP_' + Math.random().toString(36).substring(2, 14).toUpperCase()

      // Map old schema to new schema
      const newDj = {
        email: oldDj.email,
        password: tempPassword, // Temporary password - DJ must use "forgot password" to reset
        username: oldDj.username || undefined,
        firstName: oldDj.first_name || undefined,
        lastName: oldDj.last_name || undefined,
        memberSince: oldDj.member_since || undefined,
        location: oldDj.location || undefined,

        // Assign DJ role
        roles: ['Regular DJ'],

        // DJ-specific fields
        djName: oldDj.dj_name || undefined,
        showName: oldDj.show_name || undefined,
        showTime: oldDj.show_time || undefined,
        djExcerpt: oldDj.dj_excerpt || undefined,
        djBio: oldDj.dj_bio || undefined,
        djDonationLink: oldDj.dj_donation_link || undefined,

        // Volunteer fields
        primaryPhoneType: oldDj.primary_phone_type || undefined,
        primaryPhone: oldDj.primary_phone || undefined,
        secondaryPhoneType: oldDj.secondary_phone_type || undefined,
        secondaryPhone: oldDj.secondary_phone || undefined,
        address: oldDj.address || undefined,
        city: oldDj.city || undefined,
        state: oldDj.state || undefined,
        zipCode: oldDj.zip_code || undefined,
        age: oldDj.age || undefined,
        education: oldDj.education || undefined,
        employer: oldDj.employer || undefined,
        hasRadioExperience: oldDj.has_radio_experience || undefined,
        radioStations: oldDj.radio_stations || undefined,
        wantsToDJ: oldDj.wants_to_d_j || undefined,

        // Social links
        socialLinks: {
          facebook: oldDj.social_links_facebook || undefined,
          instagram: oldDj.social_links_instagram || undefined,
          twitter: oldDj.social_links_twitter || undefined,
          bluesky: oldDj.social_links_bluesky || undefined,
          linkedin: oldDj.social_links_linkedin || undefined,
        },

        // Set verified to skip email verification
        _verified: true,
      }

      console.log(`   Generated temp password: ${tempPassword}`)

      // Create DJ in PostgreSQL
      await payload.create({
        collection: 'listeners',
        data: newDj,
      })

      console.log(`✅ Imported ${oldDj.dj_name} (${oldDj.email})`)
      imported++
    } catch (error) {
      console.error(`❌ Error importing ${oldDj.dj_name} (${oldDj.email}):`, error)
      errors++
    }
  }

  db.close()

  console.log('\n📈 Migration Summary:')
  console.log(`   ✅ Imported: ${imported}`)
  console.log(`   ⏭️  Skipped (already exists): ${skipped}`)
  console.log(`   ❌ Errors: ${errors}`)
  console.log(`   📊 Total in backup: ${djs.length}`)

  process.exit(0)
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})

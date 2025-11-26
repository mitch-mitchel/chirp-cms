import { getPayload } from 'payload'
import config from '../payload.config'
import dotenv from 'dotenv'

dotenv.config()

const importDemoUsers = async () => {
  const payload = await getPayload({ config })

  console.log('👥 Importing demo users...\n')

  const demoUsers = [
    {
      email: 'listener@chirpradio.org',
      username: 'listeneruser',
      firstName: 'Demo',
      lastName: 'Listener',
      profileImage:
        'https://amz-s3-chirp-bucket.s3.us-east-2.amazonaws.com/media/avatar-listener.jpg',
      bio: 'Demo listener account for testing basic listener functionality.',
      location: 'Chicago, IL',
      memberSince: '2024-01-01',
      roles: ['Listener'],
      collection: [],
      favoriteDJs: [],
      preferences: {
        emailNotifications: true,
        showNotifications: true,
        darkMode: 'light' as const,
        autoPlay: true,
      },
    },
    {
      email: 'volunteer@chirpradio.org',
      username: 'volunteeruser',
      firstName: 'Demo',
      lastName: 'Volunteer',
      profileImage:
        'https://amz-s3-chirp-bucket.s3.us-east-2.amazonaws.com/media/avatar-volunteer.jpg',
      location: 'Chicago, Illinois',
      roles: ['Listener', 'Volunteer'],
      memberSince: '2021-01-20',
      primaryPhoneType: 'mobile',
      primaryPhone: '(773) 555-2891',
      age: '35–44',
      education: 'University of Illinois at Chicago',
      employer: 'Starbucks',
      collection: [],
      favoriteDJs: [],
    },
    {
      email: 'regular-dj@chirpradio.org',
      username: 'regulardj',
      firstName: 'Demo',
      lastName: 'DJ',
      profileImage:
        'https://amz-s3-chirp-bucket.s3.us-east-2.amazonaws.com/media/avatar-regular-dj.jpg',
      location: 'Chicago, Illinois',
      roles: ['Listener', 'Volunteer', 'Regular DJ'],
      memberSince: '2017-09-15',
      djName: 'Demo DJ',
      showName: 'Demo Show',
      showTime: 'Fri 11pm - 1am',
      djExcerpt: 'Demo DJ profile for testing the regular DJ role and functionality.',
      djBio: 'This is a demo DJ profile used for development and testing purposes.',
      collection: [],
      favoriteDJs: [],
    },
    {
      email: 'substitute-dj@chirpradio.org',
      username: 'subdj',
      firstName: 'Demo',
      lastName: 'SubDJ',
      profileImage:
        'https://amz-s3-chirp-bucket.s3.us-east-2.amazonaws.com/media/avatar-sub-dj.jpg',
      location: 'Chicago, Illinois',
      roles: ['Listener', 'Volunteer', 'Substitute DJ'],
      memberSince: '2019-06-15',
      djName: 'Demo Sub DJ',
      showName: 'Fill-In Show',
      djExcerpt: 'Demo substitute DJ profile for testing substitute DJ role.',
      collection: [],
      favoriteDJs: [],
    },
    {
      email: 'board-member@chirpradio.org',
      username: 'boardmember',
      firstName: 'Demo',
      lastName: 'BoardMember',
      profileImage:
        'https://amz-s3-chirp-bucket.s3.us-east-2.amazonaws.com/media/avatar-board-member.jpg',
      location: 'Chicago, Illinois',
      roles: ['Listener', 'Volunteer', 'Regular DJ', 'Board Member'],
      memberSince: '2015-03-10',
      djName: 'Demo Board DJ',
      showName: 'Leadership Show',
      showTime: 'Wed 3pm - 5pm',
      boardPosition: 'Secretary',
      boardSince: '2020-01-15',
      boardTermEnd: '2026-01-15',
      collection: [],
      favoriteDJs: [],
    },
  ]

  let imported = 0
  let skipped = 0

  for (const user of demoUsers) {
    try {
      const created = await payload.create({
        collection: 'listeners',
        data: user as any,
      })

      console.log(`  ✓ ${user.firstName} ${user.lastName} (${user.email}) - ID: ${created.id}`)
      imported++
    } catch (error) {
      console.error(`  ⚠️  Failed to import ${user.email}:`, (error as Error).message)
      console.error(`     Details:`, JSON.stringify((error as any).data, null, 2))
      skipped++
    }
  }

  console.log(`\n✨ Import complete!`)
  console.log(`   Imported: ${imported}`)
  console.log(`   Skipped: ${skipped}`)

  process.exit(0)
}

importDemoUsers()

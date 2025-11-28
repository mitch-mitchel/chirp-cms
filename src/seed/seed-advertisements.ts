import type { Payload } from 'payload'

export async function seedAdvertisements(payload: Payload) {
  console.log('📢 Importing advertisements...')

  const advertisements = [
    {
      name: 'Local Record Store - Medium Rectangle',
      isActive: true,
      size: 'medium-rectangle',
      contentType: 'image',
      imageUrl: 'https://amz-s3-chirp-bucket.s3.us-east-2.amazonaws.com/media/record-store-ad.jpg',
      alt: 'Vintage Vinyl Record Store - Now Open in Logan Square',
      href: 'https://example.com/record-store',
      target: '_blank',
      showLabel: false,
    },
    {
      name: 'Concert Venue Promo - Leaderboard',
      isActive: true,
      size: 'leaderboard',
      contentType: 'image',
      imageUrl: 'https://amz-s3-chirp-bucket.s3.us-east-2.amazonaws.com/media/concert-venue-ad.jpg',
      alt: 'The Metro - Live Music Every Night',
      href: 'https://example.com/metro',
      target: '_blank',
      showLabel: false,
    },
    {
      name: 'Music Festival Video Ad',
      isActive: true,
      size: 'large-rectangle',
      contentType: 'video',
      videoUrl:
        'https://amz-s3-chirp-bucket.s3.us-east-2.amazonaws.com/media/music-festival-video.mp4',
      href: 'https://example.com/music-festival',
      target: '_blank',
      showLabel: false,
    },
    {
      name: 'Local Coffee Shop HTML Ad',
      isActive: true,
      size: 'medium-rectangle',
      contentType: 'html',
      htmlContent: `
        <div style="
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: white;
          font-family: Arial, sans-serif;
          padding: 20px;
          box-sizing: border-box;
        ">
          <h2 style="margin: 0 0 10px 0; font-size: 24px; font-weight: bold;">☕ Logan Beans</h2>
          <p style="margin: 0 0 15px 0; font-size: 14px; text-align: center;">
            Live Music Every Saturday<br/>
            Open Mic Wednesdays
          </p>
          <div style="
            background: white;
            color: #667eea;
            padding: 8px 20px;
            border-radius: 20px;
            font-weight: bold;
            font-size: 12px;
          ">
            2847 N Milwaukee Ave
          </div>
        </div>
      `,
      href: 'https://example.com/logan-beans',
      target: '_blank',
      showLabel: false,
    },
    {
      name: 'Google AdSense Example - Embed',
      isActive: true,
      size: 'medium-rectangle',
      contentType: 'embed',
      embedCode: `
        <div style="
          width: 100%;
          height: 100%;
          background: #f5f5f5;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: Arial, sans-serif;
          color: #666;
          text-align: center;
          padding: 20px;
          box-sizing: border-box;
        ">
          <div>
            <div style="font-size: 12px; margin-bottom: 10px;">Advertisement</div>
            <div style="
              background: white;
              padding: 20px;
              border-radius: 8px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            ">
              <h3 style="margin: 0 0 10px 0; color: #1a73e8;">Support Independent Radio</h3>
              <p style="margin: 0 0 15px 0; font-size: 14px; line-height: 1.4;">
                Become a CHIRP member today and help keep community radio alive
              </p>
              <button style="
                background: #1a73e8;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 4px;
                font-size: 14px;
                cursor: pointer;
              ">
                Join Now
              </button>
            </div>
          </div>
        </div>
      `,
      showLabel: false,
    },
    {
      name: 'Mobile Music App Banner',
      isActive: true,
      size: 'mobile-banner',
      contentType: 'html',
      htmlContent: `
        <div style="
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, #FF6B6B 0%, #FF8E53 100%);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 15px;
          box-sizing: border-box;
        ">
          <div style="color: white; font-family: Arial, sans-serif;">
            <div style="font-weight: bold; font-size: 14px;">🎵 Stream CHIRP</div>
            <div style="font-size: 11px; opacity: 0.9;">Download our mobile app</div>
          </div>
          <div style="
            background: white;
            color: #FF6B6B;
            padding: 6px 15px;
            border-radius: 15px;
            font-weight: bold;
            font-size: 12px;
          ">
            GET APP
          </div>
        </div>
      `,
      href: 'https://example.com/mobile-app',
      target: '_blank',
      showLabel: false,
    },
    {
      name: 'Vinyl Subscription Service - Skyscraper',
      isActive: true,
      size: 'wide-skyscraper',
      contentType: 'html',
      htmlContent: `
        <div style="
          width: 100%;
          height: 100%;
          background: linear-gradient(180deg, #2C3E50 0%, #34495E 100%);
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 20px;
          box-sizing: border-box;
          color: white;
          font-family: Arial, sans-serif;
        ">
          <div style="font-size: 48px; margin-bottom: 15px;">💿</div>
          <h3 style="margin: 0 0 10px 0; font-size: 18px; text-align: center;">Monthly Vinyl Club</h3>
          <p style="margin: 0 0 20px 0; font-size: 12px; text-align: center; line-height: 1.5;">
            Curated records delivered to your door every month
          </p>
          <div style="
            background: #E74C3C;
            color: white;
            padding: 10px 20px;
            border-radius: 5px;
            font-weight: bold;
            font-size: 14px;
            margin-bottom: 20px;
          ">
            $29.99/mo
          </div>
          <div style="
            font-size: 11px;
            text-align: center;
            opacity: 0.8;
            line-height: 1.4;
          ">
            ✓ Free shipping<br/>
            ✓ Exclusive releases<br/>
            ✓ Cancel anytime
          </div>
        </div>
      `,
      href: 'https://example.com/vinyl-club',
      target: '_blank',
      showLabel: false,
    },
  ]

  for (const ad of advertisements) {
    await payload.create({
      collection: 'advertisements',
      data: ad,
    })
    console.log(`  ✓ ${ad.name}`)
  }
}

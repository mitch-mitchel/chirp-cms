module.exports = {
  apps: [{
   name: 'chirp-poller',
   script: 'npx',
   args: 'tsx scripts/run-playlist-poller.ts',
   env: {
    PAYLOAD_CONFIG_PATH: 'payload.config.ts',
    DATABASE_URI: 'postgresql://chirp:chirp_dev_password@localhost:5432/chirp_cms'
   }
  }]
 }

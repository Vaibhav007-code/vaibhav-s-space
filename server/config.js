module.exports = {
  PORT: process.env.PORT || 3000,
  ADMIN_SECRET: process.env.ADMIN_SECRET || 'vaibhav-voice-space-2024', // Change this in production!
  MAX_AUDIO_SIZE: 50 * 1024 * 1024, // 50MB
  ALLOWED_AUDIO_FORMATS: ['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/x-m4a'],
  DATA_FILE: './server/storage/data.json',
  AUDIO_DIR: './server/storage/audio/'
};

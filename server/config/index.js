require('dotenv').config();

module.exports = {
  port: process.env.PORT || 5000,
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hospital_management',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-do-not-use-in-prod',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  clientUrls: (process.env.CLIENT_URL || 'http://localhost:5173')
    .split(',')
    .map((u) => u.trim()),
  sessionTimeoutMs: process.env.SESSION_TIMEOUT_MINUTES
    ? Number(process.env.SESSION_TIMEOUT_MINUTES) * 60 * 1000
    : 8 * 60 * 60 * 1000
};
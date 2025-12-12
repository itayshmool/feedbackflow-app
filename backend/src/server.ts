// backend/src/server.ts
/**
 * @deprecated NOT USED IN PRODUCTION
 * 
 * This file is dead code. Production uses real-database-server.ts directly.
 * 
 * Entry points:
 * - npm run dev  → src/real-database-server.ts
 * - npm start    → dist/real-database-server.js
 * 
 * This file exists but is never executed by any npm script.
 * Safe to remove, but kept for reference.
 */

import 'dotenv/config'
import app from './app.js'
// @ts-ignore
import { Pool } from 'pg'

const PORT = process.env.PORT || 5000

// Initialize database connection
const db = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://user:pass@localhost:5432/feedbackflow'
})

// Test database connection
db.connect()
  .then(() => {
    console.log('✅ Database connected successfully')
  })
  .catch((error) => {
    console.error('❌ Database connection failed:', error.message)
    console.log('ℹ️  Using mock data for development')
  })

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`)
  console.log(`📊 Health check: http://localhost:${PORT}/health`)
  console.log(`🔐 Auth endpoint: http://localhost:${PORT}/api/v1/auth/login/mock`)
  console.log(`📝 API docs: http://localhost:${PORT}/api/v1`)
})

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully')
  db.end()
  process.exit(0)
})

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully')
  db.end()
  process.exit(0)
})
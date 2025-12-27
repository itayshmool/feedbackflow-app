#!/usr/bin/env node
/**
 * Seed Quotes Script
 * 
 * Seeds the daily_quotes table with curated growth quotes.
 * Usage: node scripts/seed-quotes.js <DATABASE_URL>
 * 
 * Example:
 *   node scripts/seed-quotes.js postgresql://user:pass@host/db
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function seedQuotes() {
  const databaseUrl = process.argv[2];
  
  if (!databaseUrl) {
    console.error('❌ Usage: node scripts/seed-quotes.js <DATABASE_URL>');
    console.error('   Example: node scripts/seed-quotes.js postgresql://user:pass@host/db');
    process.exit(1);
  }

  console.log('🔗 Connecting to database...');
  
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    // Test connection
    await pool.query('SELECT NOW()');
    console.log('✅ Connected to database');

    // Drop and recreate the table with new schema (pool-based, no generated_date needed)
    console.log('📋 Recreating daily_quotes table with new schema...');
    
    // Drop old table
    await pool.query('DROP TABLE IF EXISTS daily_quotes');
    
    // Create new table optimized for quote pool approach
    await pool.query(`
      CREATE TABLE daily_quotes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        quote TEXT NOT NULL,
        author VARCHAR(255) NOT NULL,
        author_title VARCHAR(255) NOT NULL,
        theme VARCHAR(100) DEFAULT 'growth',
        used_on DATE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Create indexes
    await pool.query(`CREATE INDEX idx_daily_quotes_used ON daily_quotes(used_on)`);
    await pool.query(`CREATE INDEX idx_daily_quotes_id ON daily_quotes(id)`);
    
    console.log('✅ Table recreated with new schema');

    // Load quotes from JSON
    const quotesPath = path.join(__dirname, '../database/seeds/quotes.json');
    const quotesData = JSON.parse(fs.readFileSync(quotesPath, 'utf8'));
    console.log(`📖 Loaded ${quotesData.length} quotes from JSON`);

    // Insert quotes
    console.log('📝 Inserting quotes...');
    let inserted = 0;

    for (const q of quotesData) {
      await pool.query(
        `INSERT INTO daily_quotes (quote, author, author_title, theme) VALUES ($1, $2, $3, $4)`,
        [q.quote, q.author, q.authorTitle, 'growth']
      );
      inserted++;
      
      // Progress indicator every 20 quotes
      if (inserted % 20 === 0) {
        process.stdout.write(`   Inserted ${inserted}/${quotesData.length}\r`);
      }
    }

    console.log(`\n✅ Successfully inserted ${inserted} quotes!`);

    // Verify
    const finalResult = await pool.query('SELECT COUNT(*) as count FROM daily_quotes');
    console.log(`📊 Final quote count: ${finalResult.rows[0].count}`);

    // Show a sample quote
    const sampleResult = await pool.query('SELECT quote, author FROM daily_quotes ORDER BY RANDOM() LIMIT 1');
    if (sampleResult.rows.length > 0) {
      console.log(`\n💬 Sample quote: "${sampleResult.rows[0].quote}" - ${sampleResult.rows[0].author}`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
    console.log('\n🔌 Database connection closed');
  }
}

seedQuotes();


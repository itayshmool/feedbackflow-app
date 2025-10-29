import { Pool, PoolClient, QueryResult } from 'pg';

// Database configuration
const dbConfig = {
  host: 'localhost',
  port: 5432,
  database: 'feedbackflow',
  user: process.env.DB_USER || 'itays', // Use your macOS username
  password: process.env.DB_PASSWORD || '', // Empty for local development
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
};

// Create a connection pool
const pool = new Pool(dbConfig);

// Test the connection
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle client', err);
  process.exit(-1);
});

// Query function that returns a promise
export const query = async (text: string, params?: any[]): Promise<QueryResult> => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('📊 Executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('❌ Database query error:', error);
    throw error;
  }
};

// Get a client from the pool
export const getClient = async (): Promise<PoolClient> => {
  return await pool.connect();
};

// Close the pool
export const closePool = async (): Promise<void> => {
  await pool.end();
};

// Export the pool for direct access if needed
export { pool };

// Test database connection
export const testConnection = async (): Promise<boolean> => {
  try {
    const result = await query('SELECT NOW()');
    console.log('✅ Database connection test successful:', result.rows[0]);
    return true;
  } catch (error) {
    console.error('❌ Database connection test failed:', error);
    return false;
  }
};

export default {
  query,
  getClient,
  closePool,
  pool,
  testConnection
};


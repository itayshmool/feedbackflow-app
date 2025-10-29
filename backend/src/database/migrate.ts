import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool, query } from '../config/mock-database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface Migration {
  id: string;
  name: string;
  filename: string;
  executed_at?: Date;
}

class MigrationManager {
  private migrationsPath: string;

  constructor() {
    this.migrationsPath = path.join(__dirname, 'migrations');
  }

  // Create migrations table if it doesn't exist
  private async createMigrationsTable(): Promise<void> {
    await query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        filename VARCHAR(255) NOT NULL,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
  }

  // Get list of migration files
  private getMigrationFiles(): string[] {
    if (!fs.existsSync(this.migrationsPath)) {
      return [];
    }
    
    return fs.readdirSync(this.migrationsPath)
      .filter(file => file.endsWith('.sql'))
      .sort();
  }

  // Get executed migrations from database
  private async getExecutedMigrations(): Promise<Migration[]> {
    const result = await query('SELECT * FROM migrations ORDER BY id');
    return result.rows;
  }

  // Parse migration filename to get ID and name
  private parseMigrationFile(filename: string): { id: string; name: string } {
    const match = filename.match(/^(\d+)_(.+)\.sql$/);
    if (!match) {
      throw new Error(`Invalid migration filename: ${filename}`);
    }
    
    return {
      id: match[1],
      name: match[2].replace(/_/g, ' ')
    };
  }

  // Execute a single migration
  private async executeMigration(filename: string): Promise<void> {
    const filePath = path.join(this.migrationsPath, filename);
    const sql = fs.readFileSync(filePath, 'utf8');
    
    console.log(`Executing migration: ${filename}`);
    
    try {
      // Split SQL by semicolons and execute each statement
      const statements = sql
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0);
      
      for (const statement of statements) {
        if (statement.trim()) {
          await query(statement);
        }
      }
      
      const { id, name } = this.parseMigrationFile(filename);
      await query(
        'INSERT INTO migrations (id, name, filename) VALUES ($1, $2, $3)',
        [id, name, filename]
      );
      
      console.log(`✅ Migration ${filename} executed successfully`);
    } catch (error) {
      console.error(`❌ Migration ${filename} failed:`, error);
      throw error;
    }
  }

  // Run all pending migrations
  public async migrate(): Promise<void> {
    console.log('🔄 Starting database migrations...');
    
    try {
      await this.createMigrationsTable();
      
      const migrationFiles = this.getMigrationFiles();
      const executedMigrations = await this.getExecutedMigrations();
      const executedFilenames = new Set(executedMigrations.map(m => m.filename));
      
      const pendingMigrations = migrationFiles.filter(
        file => !executedFilenames.has(file)
      );
      
      if (pendingMigrations.length === 0) {
        console.log('✅ No pending migrations');
        return;
      }
      
      console.log(`Found ${pendingMigrations.length} pending migrations`);
      
      for (const filename of pendingMigrations) {
        await this.executeMigration(filename);
      }
      
      console.log('✅ All migrations completed successfully');
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  }

  // Rollback last migration (basic implementation)
  public async rollback(): Promise<void> {
    console.log('🔄 Rolling back last migration...');
    
    try {
      const executedMigrations = await this.getExecutedMigrations();
      
      if (executedMigrations.length === 0) {
        console.log('No migrations to rollback');
        return;
      }
      
      const lastMigration = executedMigrations[executedMigrations.length - 1];
      
      // Note: This is a basic implementation
      // In a real application, you'd want to implement proper rollback scripts
      console.log(`⚠️  Rollback for ${lastMigration.filename} not implemented`);
      console.log('Manual rollback may be required');
    } catch (error) {
      console.error('❌ Rollback failed:', error);
      throw error;
    }
  }

  // Get migration status
  public async status(): Promise<void> {
    console.log('📊 Migration Status:');
    
    try {
      await this.createMigrationsTable();
      
      const migrationFiles = this.getMigrationFiles();
      const executedMigrations = await this.getExecutedMigrations();
      const executedFilenames = new Set(executedMigrations.map(m => m.filename));
      
      console.log('\nExecuted migrations:');
      for (const migration of executedMigrations) {
        console.log(`  ✅ ${migration.filename} - ${migration.name} (${migration.executed_at})`);
      }
      
      console.log('\nPending migrations:');
      const pendingMigrations = migrationFiles.filter(
        file => !executedFilenames.has(file)
      );
      
      if (pendingMigrations.length === 0) {
        console.log('  No pending migrations');
      } else {
        for (const filename of pendingMigrations) {
          const { name } = this.parseMigrationFile(filename);
          console.log(`  ⏳ ${filename} - ${name}`);
        }
      }
    } catch (error) {
      console.error('❌ Failed to get migration status:', error);
      throw error;
    }
  }
}

// CLI interface - removed for ES module compatibility
// Use the test script instead for testing migrations

export default MigrationManager;

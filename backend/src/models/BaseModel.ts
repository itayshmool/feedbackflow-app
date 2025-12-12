import { pool, query } from '../config/real-database.js';
import { 
  validateSortColumn, 
  validateSortOrder, 
  isValidFieldName,
  validateWhereColumns 
} from '../shared/utils/sql-security.js';

export interface BaseEntity {
  id: string;
  created_at: Date;
  updated_at: Date;
}

export interface PaginationOptions {
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export abstract class BaseModel<T extends BaseEntity> {
  protected tableName: string;
  protected primaryKey: string = 'id';

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  // Field mapping from camelCase to snake_case
  protected mapFieldsToDb(data: Partial<T>): Record<string, any> {
    const mapped: Record<string, any> = {};
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        // Convert camelCase to snake_case
        const dbKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        mapped[dbKey] = value;
      }
    });
    return mapped;
  }

  // Find by ID
  async findById(id: string): Promise<T | null> {
    const result = await query(
      `SELECT * FROM ${this.tableName} WHERE ${this.primaryKey} = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  // Find all with pagination
  async findAll(options: PaginationOptions = {}): Promise<PaginatedResult<T>> {
    const {
      limit = 10,
      offset = 0,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = options;

    // SECURITY: Validate sort parameters to prevent SQL injection
    const safeSortBy = validateSortColumn(this.tableName, sortBy);
    const safeSortOrder = validateSortOrder(sortOrder);

    // Get total count
    const countResult = await query(`SELECT COUNT(*) FROM ${this.tableName}`);
    const total = parseInt(countResult.rows[0].count);

    // Get paginated data with validated ORDER BY
    const result = await query(
      `SELECT * FROM ${this.tableName} 
       ORDER BY ${safeSortBy} ${safeSortOrder} 
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    return {
      data: result.rows,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    };
  }

  // Find with conditions
  async findWhere(
    conditions: Record<string, any>,
    options: PaginationOptions = {}
  ): Promise<PaginatedResult<T>> {
    const {
      limit = 10,
      offset = 0,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = options;

    // SECURITY: Validate sort parameters to prevent SQL injection
    const safeSortBy = validateSortColumn(this.tableName, sortBy);
    const safeSortOrder = validateSortOrder(sortOrder);

    // SECURITY: Validate WHERE column names
    if (!validateWhereColumns(conditions, this.tableName)) {
      throw new Error('Invalid column names in query conditions');
    }

    // Only use keys that pass field name validation
    const safeKeys = Object.keys(conditions).filter(isValidFieldName);
    const hasConditions = safeKeys.length > 0;
    
    const whereClause = hasConditions 
      ? safeKeys.map((key, index) => `${key} = $${index + 1}`).join(' AND ')
      : '1=1'; // Always true condition when no filters

    const values = safeKeys.map(key => conditions[key]);

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) FROM ${this.tableName} WHERE ${whereClause}`,
      values
    );
    const total = parseInt(countResult.rows[0].count);

    // Get paginated data with validated ORDER BY
    const result = await query(
      `SELECT * FROM ${this.tableName} 
       WHERE ${whereClause}
       ORDER BY ${safeSortBy} ${safeSortOrder} 
       LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, limit, offset]
    );

    return {
      data: result.rows,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    };
  }

  // Create new record
  async create(data: Partial<T>): Promise<T> {
    // SECURITY: Filter to valid field names only to prevent SQL injection
    const fields = Object.keys(data).filter(key => 
      key !== 'id' && 
      key !== 'created_at' && 
      key !== 'updated_at' &&
      isValidFieldName(key)
    );
    
    if (fields.length === 0) {
      throw new Error('No valid fields provided for insert');
    }
    
    const values = fields.map(key => data[key as keyof T]);
    const placeholders = fields.map((_, index) => `$${index + 1}`).join(', ');

    const result = await query(
      `INSERT INTO ${this.tableName} (${fields.join(', ')}) 
       VALUES (${placeholders}) 
       RETURNING *`,
      values
    );

    return result.rows[0];
  }

  // Update record
  async update(id: string, data: Partial<T>): Promise<T | null> {
    const mappedData = this.mapFieldsToDb(data);
    
    // SECURITY: Filter to valid field names only to prevent SQL injection
    const fields = Object.keys(mappedData).filter(key => 
      key !== 'id' && 
      key !== 'created_at' && 
      key !== 'updated_at' &&
      isValidFieldName(key)
    );
    
    if (fields.length === 0) {
      // No valid fields to update, return existing record
      return this.findById(id);
    }
    
    const values = fields.map(key => mappedData[key]);
    const setClause = fields.map((field, index) => `${field} = $${index + 1}`).join(', ');

    const result = await query(
      `UPDATE ${this.tableName} 
       SET ${setClause}, updated_at = NOW() 
       WHERE ${this.primaryKey} = $${fields.length + 1} 
       RETURNING *`,
      [...values, id]
    );

    return result.rows[0] || null;
  }

  // Delete record
  async delete(id: string): Promise<boolean> {
    const result = await query(
      `DELETE FROM ${this.tableName} WHERE ${this.primaryKey} = $1`,
      [id]
    );

    return (result.rowCount || 0) > 0;
  }

  // Check if record exists
  async exists(id: string): Promise<boolean> {
    const result = await query(
      `SELECT 1 FROM ${this.tableName} WHERE ${this.primaryKey} = $1`,
      [id]
    );

    return result.rows.length > 0;
  }

  // Count records
  async count(conditions: Record<string, any> = {}): Promise<number> {
    if (Object.keys(conditions).length === 0) {
      const result = await query(`SELECT COUNT(*) FROM ${this.tableName}`);
      return parseInt(result.rows[0].count);
    }

    // SECURITY: Validate and filter column names
    const safeKeys = Object.keys(conditions).filter(isValidFieldName);
    
    if (safeKeys.length === 0) {
      // No valid keys, return total count
      const result = await query(`SELECT COUNT(*) FROM ${this.tableName}`);
      return parseInt(result.rows[0].count);
    }

    const whereClause = safeKeys
      .map((key, index) => `${key} = $${index + 1}`)
      .join(' AND ');

    const values = safeKeys.map(key => conditions[key]);

    const result = await query(
      `SELECT COUNT(*) FROM ${this.tableName} WHERE ${whereClause}`,
      values
    );

    return parseInt(result.rows[0].count);
  }

  // Execute raw query
  async rawQuery(sql: string, params: any[] = []): Promise<any> {
    return await query(sql, params);
  }

  // Transaction helper
  async transaction<T>(callback: (model: this) => Promise<T>): Promise<T> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Create a new instance with the transaction client
      const modelWithTransaction = Object.create(this);
      modelWithTransaction.query = (sql: string, params: any[]) => client.query(sql, params);
      
      const result = await callback(modelWithTransaction);
      
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

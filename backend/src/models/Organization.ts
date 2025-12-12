import { BaseModel, BaseEntity, PaginationOptions, PaginatedResult } from './BaseModel.js';
import { query } from '../config/real-database.js';
import { validateSortColumn, validateSortOrder } from '../shared/utils/sql-security.js';

export interface Organization extends BaseEntity {
  name: string;
  slug: string;
  description?: string;
  contact_email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  website?: string;
  logo_url?: string;
  is_active: boolean;
  status: 'active' | 'inactive' | 'suspended' | 'pending';
  subscription_plan: 'free' | 'basic' | 'professional' | 'enterprise';
  plan_start_date?: Date;
  plan_end_date?: Date;
  max_users: number;
  max_cycles: number;
  storage_limit_gb: number;
  feature_flags: Record<string, boolean>;
  settings: {
    timezone: string;
    language: string;
    dateFormat: string;
    currency: string;
    workingDays: number[];
    workingHours: {
      start: string;
      end: string;
    };
    feedbackSettings: {
      allowAnonymous: boolean;
      requireManagerApproval: boolean;
      autoReminders: boolean;
      reminderFrequency: number;
    };
    notificationPreferences: {
      email: boolean;
      inApp: boolean;
      slack: boolean;
    };
    integrationSettings: Record<string, any>;
  };
}

export interface CreateOrganizationData {
  name: string;
  slug: string;
  description?: string;
  contact_email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  website?: string;
  logo_url?: string;
  subscription_plan: 'free' | 'basic' | 'professional' | 'enterprise';
  max_users: number;
  max_cycles: number;
  storage_limit_gb: number;
  feature_flags?: Record<string, boolean>;
  settings?: Partial<Organization['settings']>;
}

export interface UpdateOrganizationData {
  name?: string;
  description?: string;
  contact_email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  website?: string;
  logo_url?: string;
  is_active?: boolean;
  status?: 'active' | 'inactive' | 'suspended' | 'pending';
  subscription_plan?: 'free' | 'basic' | 'professional' | 'enterprise';
  max_users?: number;
  max_cycles?: number;
  storage_limit_gb?: number;
  feature_flags?: Record<string, boolean>;
  settings?: Organization['settings'];
}

export interface OrganizationFilters extends PaginationOptions {
  status?: string;
  subscription_plan?: string;
  is_active?: boolean;
  search?: string;
}

export interface OrganizationStats {
  total_organizations: number;
  active_organizations: number;
  by_plan: Record<string, number>;
  average_users_per_organization: number;
  total_departments: number;
  total_teams: number;
  total_users: number;
}

export class OrganizationModel extends BaseModel<Organization> {
  constructor() {
    super('organizations');
  }

  // Find by slug
  async findBySlug(slug: string): Promise<Organization | null> {
    const result = await query(
      'SELECT * FROM organizations WHERE slug = $1',
      [slug]
    );
    return result.rows[0] || null;
  }

  // Check if slug is available
  async isSlugAvailable(slug: string, excludeId?: string): Promise<boolean> {
    let queryText = 'SELECT 1 FROM organizations WHERE slug = $1';
    const params: any[] = [slug];

    if (excludeId) {
      queryText += ' AND id != $2';
      params.push(excludeId);
    }

    const result = await query(queryText, params);
    return result.rows.length === 0;
  }

  // Search organizations
  async search(searchQuery: string, filters: OrganizationFilters = {}): Promise<PaginatedResult<Organization>> {
    const {
      limit = 10,
      offset = 0,
      sortBy = 'created_at',
      sortOrder = 'desc',
      status,
      subscription_plan,
      is_active,
      search
    } = filters;

    // SECURITY: Validate sort parameters to prevent SQL injection
    const safeSortBy = validateSortColumn('organizations', sortBy);
    const safeSortOrder = validateSortOrder(sortOrder);

    let whereConditions: string[] = [];
    let params: any[] = [];
    let paramIndex = 1;

    // Add search condition
    if (searchQuery) {
      whereConditions.push(`(
        name ILIKE $${paramIndex} OR 
        slug ILIKE $${paramIndex} OR 
        contact_email ILIKE $${paramIndex} OR
        description ILIKE $${paramIndex}
      )`);
      params.push(`%${searchQuery}%`);
      paramIndex++;
    }

    // Add filter conditions
    if (status) {
      whereConditions.push(`status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    if (subscription_plan) {
      whereConditions.push(`subscription_plan = $${paramIndex}`);
      params.push(subscription_plan);
      paramIndex++;
    }

    if (is_active !== undefined) {
      whereConditions.push(`is_active = $${paramIndex}`);
      params.push(is_active);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) FROM organizations ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    // Get paginated data with validated ORDER BY
    const result = await query(
      `SELECT * FROM organizations 
       ${whereClause}
       ORDER BY ${safeSortBy} ${safeSortOrder} 
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
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

  // Get organization statistics
  async getStats(): Promise<OrganizationStats> {
    const result = await query(`
      SELECT 
        COUNT(*) as total_organizations,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active_organizations,
        COUNT(CASE WHEN subscription_plan = 'free' THEN 1 END) as free_count,
        COUNT(CASE WHEN subscription_plan = 'basic' THEN 1 END) as basic_count,
        COUNT(CASE WHEN subscription_plan = 'professional' THEN 1 END) as professional_count,
        COUNT(CASE WHEN subscription_plan = 'enterprise' THEN 1 END) as enterprise_count,
        COALESCE(AVG(user_count), 0) as average_users_per_organization,
        (SELECT COUNT(*) FROM departments) as total_departments,
        (SELECT COUNT(*) FROM teams) as total_teams,
        (SELECT COUNT(*) FROM users WHERE is_active = true) as total_users
      FROM organizations
      LEFT JOIN (
        SELECT organization_id, COUNT(*) as user_count
        FROM users
        WHERE is_active = true
        GROUP BY organization_id
      ) user_stats ON organizations.id = user_stats.organization_id
    `);

    const stats = result.rows[0];

    return {
      total_organizations: parseInt(stats.total_organizations),
      active_organizations: parseInt(stats.active_organizations),
      by_plan: {
        free: parseInt(stats.free_count),
        basic: parseInt(stats.basic_count),
        professional: parseInt(stats.professional_count),
        enterprise: parseInt(stats.enterprise_count)
      },
      average_users_per_organization: parseFloat(stats.average_users_per_organization),
      total_departments: parseInt(stats.total_departments),
      total_teams: parseInt(stats.total_teams),
      total_users: parseInt(stats.total_users)
    };
  }

  // Get organization with members
  async findByIdWithMembers(id: string): Promise<Organization & { members: any[] } | null> {
    const result = await query(`
      SELECT 
        o.*,
        json_agg(
          json_build_object(
            'id', om.id,
            'user_id', om.user_id,
            'user_name', u.name,
            'user_email', u.email,
            'job_title', om.job_title,
            'employee_id', om.employee_id,
            'hire_date', om.hire_date,
            'is_active', om.is_active,
            'joined_at', om.joined_at
          )
        ) as members
      FROM organizations o
      LEFT JOIN organization_members om ON o.id = om.organization_id
      LEFT JOIN users u ON om.user_id = u.id
      WHERE o.id = $1
      GROUP BY o.id
    `, [id]);

    return result.rows[0] || null;
  }

  // Create organization with default settings
  async createWithDefaults(data: CreateOrganizationData): Promise<Organization> {
    const defaultSettings = {
      timezone: 'UTC',
      language: 'en',
      dateFormat: 'MM/DD/YYYY',
      currency: 'USD',
      workingDays: [1, 2, 3, 4, 5],
      workingHours: {
        start: '09:00',
        end: '17:00'
      },
      feedbackSettings: {
        allowAnonymous: false,
        requireManagerApproval: true,
        autoReminders: true,
        reminderFrequency: 7
      },
      notificationPreferences: {
        email: true,
        inApp: true,
        slack: false
      },
      integrationSettings: {}
    };

    const organizationData = {
      ...data,
      is_active: true,
      status: 'active' as const,
      feature_flags: data.feature_flags || {},
      settings: { ...defaultSettings, ...data.settings }
    };

    return await this.create(organizationData);
  }

  // Update organization status
  async updateStatus(id: string, status: Organization['status']): Promise<Organization | null> {
    return await this.update(id, { status });
  }

  // Update subscription plan
  async updateSubscriptionPlan(
    id: string, 
    plan: Organization['subscription_plan'],
    startDate?: Date,
    endDate?: Date
  ): Promise<Organization | null> {
    const updateData: any = { subscription_plan: plan };
    
    if (startDate) updateData.plan_start_date = startDate;
    if (endDate) updateData.plan_end_date = endDate;

    return await this.update(id, updateData);
  }

  // Get organizations by subscription plan
  async findBySubscriptionPlan(plan: Organization['subscription_plan']): Promise<Organization[]> {
    const result = await query(
      'SELECT * FROM organizations WHERE subscription_plan = $1 ORDER BY created_at DESC',
      [plan]
    );
    return result.rows;
  }

  // Get active organizations
  async findActive(): Promise<Organization[]> {
    const result = await query(
      'SELECT * FROM organizations WHERE is_active = true ORDER BY created_at DESC'
    );
    return result.rows;
  }

  // Update organization
  async update(id: string, data: UpdateOrganizationData): Promise<Organization | null> {
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    // Map of frontend field names to database column names
    const fieldMap: Record<string, string> = {
      name: 'name',
      slug: 'slug',
      description: 'description',
      contactEmail: 'contact_email',
      phone: 'phone',
      address: 'address',
      city: 'city',
      state: 'state',
      zipCode: 'zip_code',
      country: 'country',
      website: 'website',
      logoUrl: 'logo_url',
      subscriptionPlan: 'subscription_plan',
      maxUsers: 'max_users',
      maxCycles: 'max_cycles',
      storageLimitGb: 'storage_limit_gb',
      featureFlags: 'feature_flags',
      settings: 'settings',
      isActive: 'is_active',
      status: 'status'
    };

    // Build dynamic update query
    for (const [frontendKey, dbColumn] of Object.entries(fieldMap)) {
      const value = (data as any)[frontendKey];
      if (value !== undefined) {
        updateFields.push(`${dbColumn} = $${paramIndex}`);
        
        // Handle JSON fields
        if (dbColumn === 'feature_flags' || dbColumn === 'settings') {
          values.push(JSON.stringify(value));
        } else {
          values.push(value);
        }
        paramIndex++;
      }
    }

    // If no fields to update, return existing organization
    if (updateFields.length === 0) {
      return this.findById(id);
    }

    // Add updated_at timestamp
    updateFields.push(`updated_at = $${paramIndex}`);
    values.push(new Date());
    paramIndex++;

    // Add id as last parameter
    values.push(id);

    const queryText = `
      UPDATE organizations 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await query(queryText, values);
    return result.rows[0] || null;
  }

  // Soft delete (deactivate) organization
  async softDelete(id: string): Promise<Organization | null> {
    return await this.update(id, { 
      is_active: false, 
      status: 'inactive' 
    });
  }
}

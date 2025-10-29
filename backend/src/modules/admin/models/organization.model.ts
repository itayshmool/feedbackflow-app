import { Pool, PoolClient } from 'pg';
import {
  Organization,
  OrganizationModel,
  CreateOrganizationRequest,
  UpdateOrganizationRequest,
  OrganizationStats,
  OrganizationStatus,
  SubscriptionPlan,
  OrganizationSettings,
} from '../types/organization.types';
import { NotFoundError, ValidationError } from '../../../shared/utils/errors.js';

export class OrganizationModelClass {
  private db: Pool;

  constructor(db: Pool) {
    this.db = db;
  }

  private mapDbToOrganization(dbRow: OrganizationModel): Organization {
    return {
      id: dbRow.organization_id,
      name: dbRow.name,
      slug: dbRow.slug,
      description: dbRow.description,
      contactEmail: dbRow.contact_email,
      phone: dbRow.phone,
      address: dbRow.address,
      city: dbRow.city,
      state: dbRow.state,
      zipCode: dbRow.zip_code,
      country: dbRow.country,
      website: dbRow.website,
      logoUrl: dbRow.logo_url,
      isActive: dbRow.is_active,
      status: dbRow.status as OrganizationStatus,
      subscriptionPlan: dbRow.subscription_plan as SubscriptionPlan,
      planStartDate: dbRow.plan_start_date,
      planEndDate: dbRow.plan_end_date,
      maxUsers: dbRow.max_users,
      maxCycles: dbRow.max_cycles,
      storageLimitGb: dbRow.storage_limit_gb,
      featureFlags: dbRow.feature_flags,
      settings: dbRow.settings,
      createdAt: dbRow.created_at,
      updatedAt: dbRow.updated_at,
    };
  }

  private mapOrganizationToDb(org: Partial<Organization> | UpdateOrganizationRequest): Partial<OrganizationModel> {
    const result: Partial<OrganizationModel> = {};
    
    if (org.name !== undefined) result.name = org.name;
    if ('slug' in org && org.slug !== undefined) result.slug = org.slug;
    if (org.description !== undefined) result.description = org.description;
    if (org.contactEmail !== undefined) result.contact_email = org.contactEmail;
    if (org.phone !== undefined) result.phone = org.phone;
    if (org.address !== undefined) result.address = org.address;
    if (org.city !== undefined) result.city = org.city;
    if (org.state !== undefined) result.state = org.state;
    if (org.zipCode !== undefined) result.zip_code = org.zipCode;
    if (org.country !== undefined) result.country = org.country;
    if (org.website !== undefined) result.website = org.website;
    if (org.logoUrl !== undefined) result.logo_url = org.logoUrl;
    if (org.isActive !== undefined) result.is_active = org.isActive;
    if (org.status !== undefined) result.status = org.status;
    if (org.subscriptionPlan !== undefined) result.subscription_plan = org.subscriptionPlan;
    if ('planStartDate' in org && org.planStartDate !== undefined) result.plan_start_date = org.planStartDate;
    if ('planEndDate' in org && org.planEndDate !== undefined) result.plan_end_date = org.planEndDate;
    if (org.maxUsers !== undefined) result.max_users = org.maxUsers;
    if (org.maxCycles !== undefined) result.max_cycles = org.maxCycles;
    if (org.storageLimitGb !== undefined) result.storage_limit_gb = org.storageLimitGb;
    if (org.featureFlags !== undefined) result.feature_flags = org.featureFlags;
    if (org.settings !== undefined) {
      // Handle both OrganizationSettings and Partial<OrganizationSettings>
      const settings = org.settings as any;
      result.settings = settings;
    }
    
    return result;
  }

  async createOrganization(
    orgData: CreateOrganizationRequest,
    client?: PoolClient
  ): Promise<Organization> {
    const db = client || this.db;
    const organizationId = `org_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;

    // Default settings if not provided
    const defaultSettings: OrganizationSettings = {
      timezone: 'UTC',
      language: 'en',
      dateFormat: 'MM/DD/YYYY',
      currency: 'USD',
      workingDays: [1, 2, 3, 4, 5], // Monday to Friday
      workingHours: {
        start: '09:00',
        end: '17:00',
      },
      feedbackSettings: {
        allowAnonymous: false,
        requireManagerApproval: true,
        autoCloseCycles: false,
        reminderFrequency: 7,
      },
      notificationSettings: {
        emailNotifications: true,
        inAppNotifications: true,
        smsNotifications: false,
        pushNotifications: true,
      },
      securitySettings: {
        requireMFA: false,
        sessionTimeout: 480, // 8 hours
        passwordPolicy: {
          minLength: 8,
          requireUppercase: true,
          requireLowercase: true,
          requireNumbers: true,
          requireSpecialChars: false,
        },
      },
    };

    const query = `
      INSERT INTO organizations (
        id, organization_id, name, slug, description, contact_email, phone,
        address, city, state, zip_code, country, website, logo_url,
        is_active, status, subscription_plan, plan_start_date, plan_end_date,
        max_users, max_cycles, storage_limit_gb, feature_flags, settings,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
        $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, NOW(), NOW()
      )
      RETURNING *
    `;

    const values = [
      organizationId,
      organizationId,
      orgData.name,
      orgData.slug,
      orgData.description || null,
      orgData.contactEmail,
      orgData.phone || null,
      orgData.address || null,
      orgData.city || null,
      orgData.state || null,
      orgData.zipCode || null,
      orgData.country || null,
      orgData.website || null,
      orgData.logoUrl || null,
      true, // isActive
      OrganizationStatus.ACTIVE,
      orgData.subscriptionPlan,
      new Date(), // planStartDate
      new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // planEndDate (1 year from now)
      orgData.maxUsers,
      orgData.maxCycles,
      orgData.storageLimitGb,
      orgData.featureFlags || {},
      { ...defaultSettings, ...orgData.settings },
    ];

    const result = await db.query(query, values);
    return this.mapDbToOrganization(result.rows[0]);
  }

  async getOrganizationById(
    organizationId: string,
    client?: PoolClient
  ): Promise<Organization | null> {
    const db = client || this.db;
    const query = 'SELECT * FROM organizations WHERE organization_id = $1';
    const result = await db.query(query, [organizationId]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapDbToOrganization(result.rows[0]);
  }

  async getOrganizationBySlug(
    slug: string,
    client?: PoolClient
  ): Promise<Organization | null> {
    const db = client || this.db;
    const query = 'SELECT * FROM organizations WHERE slug = $1';
    const result = await db.query(query, [slug]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapDbToOrganization(result.rows[0]);
  }

  async getOrganizations(
    filters: {
      isActive?: boolean;
      status?: OrganizationStatus;
      subscriptionPlan?: SubscriptionPlan;
      limit?: number;
      offset?: number;
    } = {},
    client?: PoolClient
  ): Promise<Organization[]> {
    const db = client || this.db;
    let query = 'SELECT * FROM organizations WHERE 1=1';
    const values: any[] = [];
    let paramCount = 0;

    if (filters.isActive !== undefined) {
      paramCount++;
      query += ` AND is_active = $${paramCount}`;
      values.push(filters.isActive);
    }

    if (filters.status) {
      paramCount++;
      query += ` AND status = $${paramCount}`;
      values.push(filters.status);
    }

    if (filters.subscriptionPlan) {
      paramCount++;
      query += ` AND subscription_plan = $${paramCount}`;
      values.push(filters.subscriptionPlan);
    }

    query += ' ORDER BY created_at DESC';

    if (filters.limit) {
      paramCount++;
      query += ` LIMIT $${paramCount}`;
      values.push(filters.limit);
    }

    if (filters.offset) {
      paramCount++;
      query += ` OFFSET $${paramCount}`;
      values.push(filters.offset);
    }

    const result = await db.query(query, values);
    return result.rows.map(row => this.mapDbToOrganization(row));
  }

  async updateOrganization(
    organizationId: string,
    updateData: UpdateOrganizationRequest,
    client?: PoolClient
  ): Promise<Organization> {
    const db = client || this.db;
    const existingOrg = await this.getOrganizationById(organizationId, client);
    if (!existingOrg) {
      throw new NotFoundError(`Organization with ID ${organizationId} not found`);
    }

    const updateFields: string[] = [];
    const values: any[] = [];
    let paramCount = 0;

    // Build dynamic update query
    const dbData = this.mapOrganizationToDb(updateData);
    Object.entries(dbData).forEach(([key, value]) => {
      if (value !== undefined) {
        paramCount++;
        updateFields.push(`${key} = $${paramCount}`);
        values.push(value);
      }
    });

    if (updateFields.length === 0) {
      return existingOrg;
    }

    paramCount++;
    updateFields.push(`updated_at = $${paramCount}`);
    values.push(new Date());

    paramCount++;
    values.push(organizationId);

    const query = `
      UPDATE organizations 
      SET ${updateFields.join(', ')}
      WHERE organization_id = $${paramCount}
      RETURNING *
    `;

    const result = await db.query(query, values);
    return this.mapDbToOrganization(result.rows[0]);
  }

  async deleteOrganization(
    organizationId: string,
    client?: PoolClient
  ): Promise<void> {
    const db = client || this.db;
    const existingOrg = await this.getOrganizationById(organizationId, client);
    if (!existingOrg) {
      throw new NotFoundError(`Organization with ID ${organizationId} not found`);
    }

    const query = 'DELETE FROM organizations WHERE id = $1';
    await db.query(query, [organizationId]);
  }

  async checkSlugAvailability(
    slug: string,
    excludeOrganizationId?: string,
    client?: PoolClient
  ): Promise<boolean> {
    const db = client || this.db;
    let query = 'SELECT COUNT(*) FROM organizations WHERE slug = $1';
    const values: any[] = [slug];

    if (excludeOrganizationId) {
      query += ' AND organization_id != $2';
      values.push(excludeOrganizationId);
    }

    const result = await db.query(query, values);
    return parseInt(result.rows[0].count) === 0;
  }

  async getOrganizationStats(client?: PoolClient): Promise<OrganizationStats> {
    const db = client || this.db;

    // Get basic organization counts
    const orgCountQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active,
        COUNT(CASE WHEN is_active = false THEN 1 END) as inactive,
        COUNT(CASE WHEN created_at >= date_trunc('month', CURRENT_DATE) THEN 1 END) as new_this_month
      FROM organizations
    `;

    const orgCountResult = await db.query(orgCountQuery);
    const orgCounts = orgCountResult.rows[0];

    // Get subscription plan distribution
    const planQuery = `
      SELECT subscription_plan, COUNT(*) as count
      FROM organizations
      WHERE is_active = true
      GROUP BY subscription_plan
    `;

    const planResult = await db.query(planQuery);
    const byPlan: Record<string, number> = {};
    planResult.rows.forEach(row => {
      byPlan[row.subscription_plan] = parseInt(row.count);
    });

    // Get average users per organization (placeholder - would need user table)
    const avgUsersQuery = `
      SELECT COALESCE(AVG(max_users), 0) as avg_users
      FROM organizations
      WHERE is_active = true
    `;

    const avgUsersResult = await db.query(avgUsersQuery);
    const averageUsersPerOrg = parseFloat(avgUsersResult.rows[0].avg_users);

    // Get department and team counts (placeholders - would need actual tables)
    const deptCountQuery = 'SELECT COUNT(*) as count FROM departments WHERE is_active = true';
    const teamCountQuery = 'SELECT COUNT(*) as count FROM teams WHERE is_active = true';
    const userCountQuery = 'SELECT COUNT(*) as count FROM users WHERE is_active = true';

    const [deptResult, teamResult, userResult] = await Promise.all([
      db.query(deptCountQuery).catch(() => ({ rows: [{ count: '0' }] })),
      db.query(teamCountQuery).catch(() => ({ rows: [{ count: '0' }] })),
      db.query(userCountQuery).catch(() => ({ rows: [{ count: '0' }] })),
    ]);

    return {
      totalOrganizations: parseInt(orgCounts.total),
      activeOrganizations: parseInt(orgCounts.active),
      inactiveOrganizations: parseInt(orgCounts.inactive),
      newThisMonth: parseInt(orgCounts.new_this_month),
      byPlan: byPlan as Record<SubscriptionPlan, number>,
      averageUsersPerOrg,
      totalDepartments: parseInt(deptResult.rows[0].count),
      totalTeams: parseInt(teamResult.rows[0].count),
      totalUsers: parseInt(userResult.rows[0].count),
    };
  }

  async searchOrganizations(
    searchTerm: string,
    filters: {
      isActive?: boolean;
      limit?: number;
      offset?: number;
    } = {},
    client?: PoolClient
  ): Promise<Organization[]> {
    const db = client || this.db;
    let query = `
      SELECT * FROM organizations 
      WHERE (name ILIKE $1 OR slug ILIKE $1 OR contact_email ILIKE $1)
    `;
    const values: any[] = [`%${searchTerm}%`];
    let paramCount = 1;

    if (filters.isActive !== undefined) {
      paramCount++;
      query += ` AND is_active = $${paramCount}`;
      values.push(filters.isActive);
    }

    query += ' ORDER BY name ASC';

    if (filters.limit) {
      paramCount++;
      query += ` LIMIT $${paramCount}`;
      values.push(filters.limit);
    }

    if (filters.offset) {
      paramCount++;
      query += ` OFFSET $${paramCount}`;
      values.push(filters.offset);
    }

    const result = await db.query(query, values);
    return result.rows.map(row => this.mapDbToOrganization(row));
  }

  async validateOrganizationData(orgData: CreateOrganizationRequest): Promise<void> {
    // Validate required fields
    if (!orgData.name || orgData.name.trim().length === 0) {
      throw new ValidationError('Organization name is required');
    }

    if (!orgData.slug || orgData.slug.trim().length === 0) {
      throw new ValidationError('Organization slug is required');
    }

    if (!orgData.contactEmail || !this.isValidEmail(orgData.contactEmail)) {
      throw new ValidationError('Valid contact email is required');
    }

    // Validate slug format
    if (!/^[a-z0-9-]+$/.test(orgData.slug)) {
      throw new ValidationError('Slug must contain only lowercase letters, numbers, and hyphens');
    }

    // Validate numeric fields
    if (orgData.maxUsers <= 0) {
      throw new ValidationError('Max users must be greater than 0');
    }

    if (orgData.maxCycles <= 0) {
      throw new ValidationError('Max cycles must be greater than 0');
    }

    if (orgData.storageLimitGb <= 0) {
      throw new ValidationError('Storage limit must be greater than 0');
    }

    // Check slug availability
    const isAvailable = await this.checkSlugAvailability(orgData.slug);
    if (!isAvailable) {
      throw new ValidationError('Organization slug is already taken');
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
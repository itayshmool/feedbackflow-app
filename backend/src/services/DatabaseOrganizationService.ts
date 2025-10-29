import { OrganizationModel, CreateOrganizationData, UpdateOrganizationData, OrganizationFilters, OrganizationStats } from '../models/Organization.js';
import { query } from '../config/real-database.js';

export class DatabaseOrganizationService {
  private organizationModel: OrganizationModel;

  constructor() {
    this.organizationModel = new OrganizationModel();
  }

  // Get all organizations with filters
  async getOrganizations(filters: OrganizationFilters = {}) {
    if (filters.search) {
      return await this.organizationModel.search(filters.search, filters);
    }
    
    return await this.organizationModel.findWhere(
      this.buildWhereConditions(filters),
      filters
    );
  }

  // Get organization by ID
  async getOrganizationById(id: string) {
    return await this.organizationModel.findById(id);
  }

  // Get organization by slug
  async getOrganizationBySlug(slug: string) {
    return await this.organizationModel.findBySlug(slug);
  }

  // Create new organization
  async createOrganization(data: CreateOrganizationData) {
    // Check if slug is available
    const isSlugAvailable = await this.organizationModel.isSlugAvailable(data.slug);
    if (!isSlugAvailable) {
      throw new Error('Organization slug is already taken');
    }

    return await this.organizationModel.createWithDefaults(data);
  }

  // Update organization
  async updateOrganization(id: string, data: UpdateOrganizationData) {
    const organization = await this.organizationModel.findById(id);
    if (!organization) {
      throw new Error('Organization not found');
    }

    // Check slug availability if slug is being updated
    if (data.name && data.name !== organization.name) {
      const slug = this.generateSlug(data.name);
      const isSlugAvailable = await this.organizationModel.isSlugAvailable(slug, id);
      if (!isSlugAvailable) {
        throw new Error('Generated slug is already taken');
      }
    }

    return await this.organizationModel.update(id, data);
  }

  // Delete organization
  async deleteOrganization(id: string) {
    const organization = await this.organizationModel.findById(id);
    if (!organization) {
      throw new Error('Organization not found');
    }

    return await this.organizationModel.softDelete(id);
  }

  // Check slug availability
  async checkSlugAvailability(slug: string, excludeId?: string) {
    return await this.organizationModel.isSlugAvailable(slug, excludeId);
  }

  // Get organization statistics
  async getOrganizationStats(): Promise<OrganizationStats> {
    return await this.organizationModel.getStats();
  }

  // Get organization with members
  async getOrganizationWithMembers(id: string) {
    return await this.organizationModel.findByIdWithMembers(id);
  }

  // Update organization status
  async updateOrganizationStatus(id: string, status: 'active' | 'inactive' | 'suspended' | 'pending') {
    return await this.organizationModel.updateStatus(id, status);
  }

  // Update subscription plan
  async updateSubscriptionPlan(
    id: string, 
    plan: 'free' | 'basic' | 'professional' | 'enterprise',
    startDate?: Date,
    endDate?: Date
  ) {
    return await this.organizationModel.updateSubscriptionPlan(id, plan, startDate, endDate);
  }

  // Get organizations by subscription plan
  async getOrganizationsByPlan(plan: 'free' | 'basic' | 'professional' | 'enterprise') {
    return await this.organizationModel.findBySubscriptionPlan(plan);
  }

  // Get active organizations
  async getActiveOrganizations() {
    return await this.organizationModel.findActive();
  }

  // Generate organization chart data
  async getOrganizationChart(organizationId: string) {
    const result = await query(`
      WITH RECURSIVE org_hierarchy AS (
        -- Base case: top-level departments
        SELECT 
          d.id,
          d.name,
          d.type,
          d.parent_department_id,
          d.manager_id,
          u.name as manager_name,
          0 as level,
          ARRAY[d.id] as path
        FROM departments d
        LEFT JOIN users u ON d.manager_id = u.id
        WHERE d.organization_id = $1 AND d.parent_department_id IS NULL
        
        UNION ALL
        
        -- Recursive case: sub-departments
        SELECT 
          d.id,
          d.name,
          d.type,
          d.parent_department_id,
          d.manager_id,
          u.name as manager_name,
          oh.level + 1,
          oh.path || d.id
        FROM departments d
        JOIN org_hierarchy oh ON d.parent_department_id = oh.id
        LEFT JOIN users u ON d.manager_id = u.id
        WHERE d.organization_id = $1
      )
      SELECT 
        oh.*,
        (
          SELECT json_agg(
            json_build_object(
              'id', t.id,
              'name', t.name,
              'type', t.type,
              'team_lead_id', t.team_lead_id,
              'team_lead_name', u2.name,
              'member_count', (
                SELECT COUNT(*) 
                FROM organization_members om 
                WHERE om.team_id = t.id AND om.is_active = true
              )
            )
          )
          FROM teams t
          LEFT JOIN users u2 ON t.team_lead_id = u2.id
          WHERE t.department_id = oh.id AND t.is_active = true
        ) as teams,
        (
          SELECT COUNT(*) 
          FROM organization_members om 
          WHERE om.department_id = oh.id AND om.is_active = true
        ) as member_count
      FROM org_hierarchy oh
      ORDER BY oh.level, oh.name
    `, [organizationId]);

    return result.rows;
  }

  // Bulk operations
  async bulkUpdateOrganizations(ids: string[], updates: UpdateOrganizationData) {
    const results = [];
    
    for (const id of ids) {
      try {
        const result = await this.updateOrganization(id, updates);
        results.push({ id, success: true, data: result });
      } catch (error) {
        results.push({ 
          id, 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }
    
    return results;
  }

  // Export organizations data
  async exportOrganizations(filters: OrganizationFilters = {}) {
    const organizations = await this.getOrganizations({ ...filters, limit: 10000 });
    
    return organizations.data.map(org => ({
      id: org.id,
      name: org.name,
      slug: org.slug,
      description: org.description,
      contact_email: org.contact_email,
      phone: org.phone,
      address: org.address,
      city: org.city,
      state: org.state,
      zip_code: org.zip_code,
      country: org.country,
      website: org.website,
      is_active: org.is_active,
      status: org.status,
      subscription_plan: org.subscription_plan,
      max_users: org.max_users,
      max_cycles: org.max_cycles,
      storage_limit_gb: org.storage_limit_gb,
      created_at: org.created_at,
      updated_at: org.updated_at
    }));
  }

  // Private helper methods
  private buildWhereConditions(filters: OrganizationFilters): Record<string, any> {
    const conditions: Record<string, any> = {};

    if (filters.status) {
      conditions.status = filters.status;
    }

    if (filters.subscription_plan) {
      conditions.subscription_plan = filters.subscription_plan;
    }

    if (filters.is_active !== undefined) {
      conditions.is_active = filters.is_active;
    }

    return conditions;
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }
}

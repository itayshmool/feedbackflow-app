import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import { CreateOrganizationRequest } from '../../modules/admin/types/organization.types.js';
import { UserImportData } from '../../modules/admin/types/user.types.js';

export interface ParsedCSVResult<T> {
  data: T[];
  errors: Array<{ row: number; field: string; error: string }>;
}

export class CSVParser {
  /**
   * Parse CSV file content for organizations
   */
  static parseOrganizations(csvContent: string): ParsedCSVResult<CreateOrganizationRequest> {
    const errors: Array<{ row: number; field: string; error: string }> = [];
    const data: CreateOrganizationRequest[] = [];

    try {
      const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });

      records.forEach((record: any, index: number) => {
        const rowNumber = index + 2; // +2 because of header row and 0-index

        try {
          // Validate required fields
          if (!record.name) {
            errors.push({ row: rowNumber, field: 'name', error: 'Name is required' });
            return;
          }

          if (!record.slug) {
            errors.push({ row: rowNumber, field: 'slug', error: 'Slug is required' });
            return;
          }

          // Parse the organization data
          const org: CreateOrganizationRequest = {
            name: record.name,
            slug: record.slug,
            description: record.description || undefined,
            contactEmail: record.contactEmail,
            phone: record.contactPhone || undefined,
            address: record.address || undefined,
            city: record.city || undefined,
            state: record.state || undefined,
            zipCode: record.zipCode || undefined,
            country: record.country || undefined,
            website: record.website || undefined,
            logoUrl: record.logoUrl || undefined,
            subscriptionPlan: (record.subscriptionPlan || 'basic') as any,
            maxUsers: record.maxUsers ? parseInt(record.maxUsers) : 10,
            maxCycles: record.maxCycles ? parseInt(record.maxCycles) : 10,
            storageLimitGb: record.storageLimitGb ? parseFloat(record.storageLimitGb) : 1,
            featureFlags: record.featureFlags ? JSON.parse(record.featureFlags) : undefined,
            settings: {
              timezone: record.timezone || 'UTC',
              language: record.language || 'en',
              dateFormat: record.dateFormat || 'YYYY-MM-DD',
              currency: record.currency || 'USD',
              workingDays: record.workingDays 
                ? JSON.parse(record.workingDays) 
                : [1, 2, 3, 4, 5],
              workingHours: {
                start: record.workingHoursStart || '09:00',
                end: record.workingHoursEnd || '17:00',
              },
            },
          };

          data.push(org);
        } catch (error) {
          errors.push({
            row: rowNumber,
            field: 'general',
            error: error instanceof Error ? error.message : 'Invalid data format',
          });
        }
      });
    } catch (error) {
      errors.push({
        row: 0,
        field: 'file',
        error: `Failed to parse CSV: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }

    return { data, errors };
  }

  /**
   * Parse CSV file content for users
   */
  static parseUsers(csvContent: string): ParsedCSVResult<UserImportData> {
    const errors: Array<{ row: number; field: string; error: string }> = [];
    const data: UserImportData[] = [];

    try {
      const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });

      records.forEach((record: any, index: number) => {
        const rowNumber = index + 2; // +2 because of header row and 0-index

        try {
          // Validate required fields
          if (!record.email) {
            errors.push({ row: rowNumber, field: 'email', error: 'Email is required' });
            return;
          }

          if (!record.name) {
            errors.push({ row: rowNumber, field: 'name', error: 'Name is required' });
            return;
          }

          // Validate email format
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(record.email)) {
            errors.push({ row: rowNumber, field: 'email', error: 'Invalid email format' });
            return;
          }

          // Parse roles if provided
          let roles: string[] = [];
          if (record.roles) {
            roles = record.roles.split(',').map((role: string) => role.trim()).filter((role: string) => role.length > 0);
          }

          // Parse the user data - using organizationName + organizationSlug for unique identification
          const user: UserImportData = {
            email: record.email,
            name: record.name,
            department: record.department || undefined,
            position: record.position || undefined,
            organizationName: record.organizationName || undefined,
            organizationSlug: record.organizationSlug || undefined, // Added for unique org identification
            roles: roles.length > 0 ? roles : undefined,
          };

          data.push(user);
        } catch (error) {
          errors.push({
            row: rowNumber,
            field: 'general',
            error: error instanceof Error ? error.message : 'Invalid data format',
          });
        }
      });
    } catch (error) {
      errors.push({
        row: 0,
        field: 'file',
        error: `Failed to parse CSV: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }

    return { data, errors };
  }

  /**
   * Generate CSV template for organizations
   */
  static generateOrganizationTemplate(): string {
    const headers = [
      'name',
      'slug',
      'description',
      'contactEmail',
      'contactPhone',
      'address',
      'city',
      'state',
      'zipCode',
      'country',
      'website',
      'logoUrl',
      'subscriptionPlan',
      'maxUsers',
      'maxCycles',
      'storageLimitGb',
      'timezone',
      'language',
      'dateFormat',
      'currency',
      'workingDays',
      'workingHoursStart',
      'workingHoursEnd',
    ];

    const example = [
      'Acme Corporation',
      'acme-corp',
      'A leading technology company',
      'admin@acme.com',
      '+1-555-0123',
      '123 Main St',
      'San Francisco',
      'CA',
      '94102',
      'USA',
      'https://acme.com',
      'https://acme.com/logo.png',
      'professional',
      '100',
      '10',
      '5',
      'America/Los_Angeles',
      'en',
      'YYYY-MM-DD',
      'USD',
      '[1,2,3,4,5]',
      '09:00',
      '17:00',
    ];

    return stringify([headers, example], {
      header: false,
    });
  }

  /**
   * Generate CSV template for users
   */
  static generateUserTemplate(): string {
    const headers = [
      'email',
      'name',
      'department',
      'position',
      'organizationName',
      'organizationSlug',
      'roles',
    ];

    const example = [
      'john.doe@example.com',
      'John Doe',
      'Engineering',
      'Senior Developer',
      'wix.com',
      'premium',
      'employee',
    ];

    return stringify([headers, example], {
      header: false,
    });
  }

  /**
   * Convert organizations to CSV
   */
  static organizationsToCSV(organizations: any[]): string {
    const records = organizations.map(org => ({
      id: org.id,
      name: org.name,
      slug: org.slug,
      description: org.description || '',
      contactEmail: org.contactEmail || '',
      phone: org.phone || '',
      address: org.address || '',
      city: org.city || '',
      state: org.state || '',
      zipCode: org.zipCode || '',
      country: org.country || '',
      website: org.website || '',
      logoUrl: org.logoUrl || '',
      subscriptionPlan: org.subscriptionPlan,
      maxUsers: org.maxUsers,
      maxCycles: org.maxCycles,
      storageLimitGb: org.storageLimitGb,
      timezone: org.settings?.timezone || 'UTC',
      language: org.settings?.language || 'en',
      dateFormat: org.settings?.dateFormat || 'YYYY-MM-DD',
      currency: org.settings?.currency || 'USD',
      workingDays: JSON.stringify(org.settings?.workingDays || [1, 2, 3, 4, 5]),
      workingHoursStart: org.settings?.workingHours?.start || '09:00',
      workingHoursEnd: org.settings?.workingHours?.end || '17:00',
      createdAt: org.createdAt,
      updatedAt: org.updatedAt,
    }));

    return stringify(records, {
      header: true,
    });
  }

  /**
   * Convert users to CSV
   */
  static usersToCSV(users: any[]): string {
    const records = users.map(user => ({
      id: user.id,
      email: user.email,
      name: user.name,
      department: user.department || '',
      position: user.position || '',
      organizationId: user.organizationId || '',
      roles: user.roles?.map((role: any) => role.roleName).join(',') || '',
      isActive: user.isActive,
      emailVerified: user.emailVerified,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }));

    return stringify(records, {
      header: true,
    });
  }

  /**
   * Parse JSON file content
   */
  static parseJSON<T>(jsonContent: string): ParsedCSVResult<T> {
    const errors: Array<{ row: number; field: string; error: string }> = [];
    let data: T[] = [];

    try {
      const parsed = JSON.parse(jsonContent);
      
      if (Array.isArray(parsed)) {
        data = parsed;
      } else if (parsed.data && Array.isArray(parsed.data)) {
        data = parsed.data;
      } else {
        errors.push({
          row: 0,
          field: 'file',
          error: 'JSON file must contain an array of objects or an object with a "data" array property',
        });
      }
    } catch (error) {
      errors.push({
        row: 0,
        field: 'file',
        error: `Failed to parse JSON: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }

    return { data, errors };
  }
}


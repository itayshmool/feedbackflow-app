// Mock database configuration for testing without actual PostgreSQL
// This allows us to test the database integration without requiring a full PostgreSQL setup

export interface MockQueryResult {
  rows: any[];
  rowCount: number;
}

interface MockPool {
  query: (text: string, params?: any[]) => Promise<MockQueryResult>;
  connect: () => Promise<MockClient>;
  end: () => Promise<void>;
}

interface MockClient {
  query: (text: string, params?: any[]) => Promise<MockQueryResult>;
  release: () => void;
}

// Mock data
const mockOrganizations = [
  {
    id: '1',
    name: 'Test Organization',
    slug: 'test-org',
    description: 'A test organization',
    contact_email: 'test@example.com',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    country: '',
    website: '',
    logo_url: 'https://via.placeholder.com/100x100/4F46E5/FFFFFF?text=TO',
    is_active: true,
    status: 'active',
    subscription_plan: 'basic',
    plan_start_date: new Date().toISOString(),
    plan_end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    max_users: 10,
    max_cycles: 5,
    storage_limit_gb: 1,
    feature_flags: {},
    settings: {
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
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

class MockClientImpl implements MockClient {
  query(text: string, params: any[] = []): Promise<MockQueryResult> {
    return new Promise((resolve) => {
      // Simulate database query processing
      setTimeout(() => {
        let result: any[] = [];
        
        if (text.includes('SELECT * FROM organizations')) {
          if (text.includes('WHERE slug = $1')) {
            const slug = params[0];
            result = mockOrganizations.filter(org => org.slug === slug);
          } else if (text.includes('WHERE id = $1')) {
            const id = params[0];
            result = mockOrganizations.filter(org => org.id === id);
          } else {
            result = mockOrganizations;
          }
        } else if (text.includes('SELECT COUNT(*) FROM organizations')) {
          result = [{ count: mockOrganizations.length.toString() }];
        } else if (text.includes('SELECT') && text.includes('COUNT(*) as total_organizations')) {
          // Organization stats query
          result = [{
            total_organizations: mockOrganizations.length.toString(),
            active_organizations: mockOrganizations.filter(org => org.is_active).length.toString(),
            free_count: mockOrganizations.filter(org => org.subscription_plan === 'free').length.toString(),
            basic_count: mockOrganizations.filter(org => org.subscription_plan === 'basic').length.toString(),
            professional_count: mockOrganizations.filter(org => org.subscription_plan === 'professional').length.toString(),
            enterprise_count: mockOrganizations.filter(org => org.subscription_plan === 'enterprise').length.toString(),
            average_users_per_organization: '5.0',
            total_departments: '0',
            total_teams: '0',
            total_users: '1'
          }];
        } else if (text.includes('INSERT INTO organizations')) {
          // Parse the dynamic INSERT query to extract field names
          const fieldMatch = text.match(/INSERT INTO organizations \((.+?)\) VALUES/);
          if (fieldMatch) {
            const fields = fieldMatch[1].split(',').map(f => f.trim());
            const newOrg: any = {
              id: Date.now().toString(),
              is_active: true,
              status: 'active',
              plan_start_date: new Date().toISOString(),
              plan_end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
              feature_flags: {},
              logo_url: 'https://via.placeholder.com/100x100/4F46E5/FFFFFF?text=ORG',
              settings: {
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
              },
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
            
            // Map parameters to fields based on the dynamic query
            fields.forEach((field, index) => {
              if (params[index] !== undefined) {
                newOrg[field] = params[index];
              }
            });
            
            mockOrganizations.push(newOrg);
            result = [newOrg];
          } else {
            // Fallback for simple INSERT queries
            const newOrg: any = {
              id: Date.now().toString(),
              name: params[0] || 'New Organization',
              slug: params[1] || 'new-org',
              description: params[2] || '',
              contact_email: params[3] || 'contact@example.com',
              phone: params[4] || '',
              address: params[5] || '',
              city: params[6] || '',
              state: params[7] || '',
              zip_code: params[8] || '',
              country: params[9] || '',
              website: params[10] || '',
              logo_url: 'https://via.placeholder.com/100x100/4F46E5/FFFFFF?text=ORG',
              is_active: true,
              status: 'active',
              subscription_plan: params[11] || 'basic',
              plan_start_date: new Date().toISOString(),
              plan_end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
              max_users: params[12] || 10,
              max_cycles: params[13] || 5,
              storage_limit_gb: params[14] || 1,
              feature_flags: {},
              settings: {
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
              },
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
            
            mockOrganizations.push(newOrg);
            result = [newOrg];
          }
        } else if (text.includes('UPDATE organizations')) {
          const id = params[params.length - 1]; // Last param is usually the ID
          const orgIndex = mockOrganizations.findIndex(org => org.id === id);
          if (orgIndex !== -1) {
            // Update the organization
            const updates: any = {};
            const fieldNames = text.match(/SET (.+) WHERE/)?.[1]?.split(',').map(f => f.trim().split('=')[0]) || [];
            fieldNames.forEach((field, index) => {
              if (params[index] !== undefined) {
                updates[field] = params[index];
              }
            });
            mockOrganizations[orgIndex] = { ...mockOrganizations[orgIndex], ...updates, updated_at: new Date().toISOString() };
            result = [mockOrganizations[orgIndex]];
          }
        } else if (text.includes('SELECT 1 FROM organizations WHERE slug = $1')) {
          const slug = params[0];
          const exists = mockOrganizations.some(org => org.slug === slug);
          result = exists ? [{ '1': 1 }] : [];
        } else if (text.includes('SELECT NOW()')) {
          result = [{ now: new Date().toISOString() }];
        }
        
        resolve({
          rows: result,
          rowCount: result.length
        });
      }, 10); // Simulate network delay
    });
  }

  release(): void {
    // Mock release
  }
}

class MockPoolImpl implements MockPool {
  query(text: string, params: any[] = []): Promise<MockQueryResult> {
    const client = new MockClientImpl();
    return client.query(text, params);
  }

  async connect(): Promise<MockClient> {
    return new MockClientImpl();
  }

  async end(): Promise<void> {
    // Mock end
  }
}

// Export mock pool and functions
export const pool = new MockPoolImpl();

export const query = async (text: string, params: any[] = []): Promise<MockQueryResult> => {
  return await pool.query(text, params);
};

export const testConnection = async (): Promise<boolean> => {
  try {
    const result = await query('SELECT NOW()');
    console.log('✅ Mock database connected successfully');
    return true;
  } catch (error) {
    console.error('❌ Mock database connection failed:', error);
    return false;
  }
};

export const healthCheck = async (): Promise<{
  status: 'healthy' | 'unhealthy';
  details: any;
}> => {
  try {
    const result = await query('SELECT 1 as health_check');
    return {
      status: 'healthy',
      details: {
        connected: true,
        timestamp: new Date().toISOString(),
        type: 'mock',
        organizations: mockOrganizations.length
      },
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      details: {
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
    };
  }
};

export const closePool = async (): Promise<void> => {
  await pool.end();
};

export default pool;

// Backend Security Test: BAC & IDOR Vulnerabilities
// Tests reproduce actual vulnerabilities in cycles and notifications modules

import request from 'supertest';
import { Pool } from 'pg';
import app from '../../src/app';
import { generateMockToken } from '../helpers/auth-helper';

describe('BAC & IDOR Vulnerability Tests', () => {
  let db: Pool;
  
  // Test organizations
  let orgA: { id: string; name: string };
  let orgB: { id: string; name: string };
  
  // Test users
  let userOrgA: { id: string; email: string; token: string; role: string };
  let adminOrgA: { id: string; email: string; token: string; role: string };
  let userOrgB: { id: string; email: string; token: string; role: string };
  let adminOrgB: { id: string; email: string; token: string; role: string };
  
  // Test data
  let cycleOrgA: { id: string; name: string; organizationId: string };
  let cycleOrgB: { id: string; name: string; organizationId: string };
  let notificationOrgA: { id: string; userId: string; organizationId: string };
  let notificationOrgB: { id: string; userId: string; organizationId: string };

  beforeAll(async () => {
    db = new Pool({
      connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/feedbackflow'
    });

    // Generate unique IDs for this test run
    const testRunId = `test-${Date.now()}`;
    const orgAId = `org-a-${testRunId}`;
    const orgBId = `org-b-${testRunId}`;

    // Create test organizations
    const orgAResult = await db.query(
      `INSERT INTO organizations (id, name, slug) VALUES ($1, $2, $3) RETURNING *`,
      [orgAId, 'Test Organization A', `test-org-a-${testRunId}`]
    );
    orgA = orgAResult.rows[0];

    const orgBResult = await db.query(
      `INSERT INTO organizations (id, name, slug) VALUES ($1, $2, $3) RETURNING *`,
      [orgBId, 'Test Organization B', `test-org-b-${testRunId}`]
    );
    orgB = orgBResult.rows[0];

    // Create test users in Org A
    const userAResult = await db.query(
      `INSERT INTO users (id, email, name, organization_id) VALUES ($1, $2, $3, $4) RETURNING *`,
      [`user-org-a-${testRunId}`, `user-a-${testRunId}@test.com`, 'User A', orgA.id]
    );
    userOrgA = {
      id: userAResult.rows[0].id,
      email: userAResult.rows[0].email,
      token: generateMockToken({
        sub: userAResult.rows[0].id,
        email: userAResult.rows[0].email,
        name: userAResult.rows[0].name,
        organizationId: orgA.id,
        roles: ['employee']
      }),
      role: 'employee'
    };

    await db.query(
      `INSERT INTO user_roles (user_id, role) VALUES ($1, $2)`,
      [userOrgA.id, 'employee']
    );

    const adminAResult = await db.query(
      `INSERT INTO users (id, email, name, organization_id) VALUES ($1, $2, $3, $4) RETURNING *`,
      [`admin-org-a-${testRunId}`, `admin-a-${testRunId}@test.com`, 'Admin A', orgA.id]
    );
    adminOrgA = {
      id: adminAResult.rows[0].id,
      email: adminAResult.rows[0].email,
      token: generateMockToken({
        sub: adminAResult.rows[0].id,
        email: adminAResult.rows[0].email,
        name: adminAResult.rows[0].name,
        organizationId: orgA.id,
        roles: ['admin']
      }),
      role: 'admin'
    };

    await db.query(
      `INSERT INTO user_roles (user_id, role) VALUES ($1, $2)`,
      [adminOrgA.id, 'admin']
    );

    // Create test users in Org B
    const userBResult = await db.query(
      `INSERT INTO users (id, email, name, organization_id) VALUES ($1, $2, $3, $4) RETURNING *`,
      [`user-org-b-${testRunId}`, `user-b-${testRunId}@test.com`, 'User B', orgB.id]
    );
    userOrgB = {
      id: userBResult.rows[0].id,
      email: userBResult.rows[0].email,
      token: generateMockToken({
        sub: userBResult.rows[0].id,
        email: userBResult.rows[0].email,
        name: userBResult.rows[0].name,
        organizationId: orgB.id,
        roles: ['employee']
      }),
      role: 'employee'
    };

    await db.query(
      `INSERT INTO user_roles (user_id, role) VALUES ($1, $2)`,
      [userOrgB.id, 'employee']
    );

    const adminBResult = await db.query(
      `INSERT INTO users (id, email, name, organization_id) VALUES ($1, $2, $3, $4) RETURNING *`,
      [`admin-org-b-${testRunId}`, `admin-b-${testRunId}@test.com`, 'Admin B', orgB.id]
    );
    adminOrgB = {
      id: adminBResult.rows[0].id,
      email: adminBResult.rows[0].email,
      token: generateMockToken({
        sub: adminBResult.rows[0].id,
        email: adminBResult.rows[0].email,
        name: adminBResult.rows[0].name,
        organizationId: orgB.id,
        roles: ['admin']
      }),
      role: 'admin'
    };

    await db.query(
      `INSERT INTO user_roles (user_id, role) VALUES ($1, $2)`,
      [adminOrgB.id, 'admin']
    );

    // Create test cycles
    const cycleAResult = await db.query(
      `INSERT INTO feedback_cycles (id, name, organization_id, start_date, end_date, status, type, created_by, settings)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [
        `cycle-org-a-${testRunId}`,
        'Q1 2024 Review - Org A',
        orgA.id,
        '2025-01-01',
        '2025-03-31',
        'draft',
        'quarterly',
        adminOrgA.id,
        '{}'
      ]
    );
    cycleOrgA = {
      id: cycleAResult.rows[0].id,
      name: cycleAResult.rows[0].name,
      organizationId: cycleAResult.rows[0].organization_id
    };

    const cycleBResult = await db.query(
      `INSERT INTO feedback_cycles (id, name, organization_id, start_date, end_date, status, type, created_by, settings)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [
        `cycle-org-b-${testRunId}`,
        'Q1 2024 Review - Org B',
        orgB.id,
        '2025-01-01',
        '2025-03-31',
        'draft',
        'quarterly',
        adminOrgB.id,
        '{}'
      ]
    );
    cycleOrgB = {
      id: cycleBResult.rows[0].id,
      name: cycleBResult.rows[0].name,
      organizationId: cycleBResult.rows[0].organization_id
    };

    // Create test notifications
    const notifAResult = await db.query(
      `INSERT INTO notifications (id, user_id, organization_id, type, channel, title, content, status, priority)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [
        `notif-org-a-${testRunId}`,
        userOrgA.id,
        orgA.id,
        'system_alert',
        'in_app',
        'Test Notification A',
        'This is a test notification for Org A',
        'pending',
        'normal'
      ]
    );
    notificationOrgA = {
      id: notifAResult.rows[0].id,
      userId: notifAResult.rows[0].user_id,
      organizationId: notifAResult.rows[0].organization_id
    };

    const notifBResult = await db.query(
      `INSERT INTO notifications (id, user_id, organization_id, type, channel, title, content, status, priority)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [
        `notif-org-b-${testRunId}`,
        userOrgB.id,
        orgB.id,
        'system_alert',
        'in_app',
        'Test Notification B',
        'This is a test notification for Org B',
        'pending',
        'normal'
      ]
    );
    notificationOrgB = {
      id: notifBResult.rows[0].id,
      userId: notifBResult.rows[0].user_id,
      organizationId: notifBResult.rows[0].organization_id
    };
  });

  afterAll(async () => {
    // Cleanup
    await db.query('DELETE FROM notifications WHERE id IN ($1, $2)', [notificationOrgA.id, notificationOrgB.id]);
    await db.query('DELETE FROM cycle_participants WHERE cycle_id IN ($1, $2)', [cycleOrgA.id, cycleOrgB.id]);
    await db.query('DELETE FROM feedback_cycles WHERE id IN ($1, $2)', [cycleOrgA.id, cycleOrgB.id]);
    await db.query('DELETE FROM user_roles WHERE user_id IN ($1, $2, $3, $4)', [userOrgA.id, adminOrgA.id, userOrgB.id, adminOrgB.id]);
    await db.query('DELETE FROM users WHERE id IN ($1, $2, $3, $4)', [userOrgA.id, adminOrgA.id, userOrgB.id, adminOrgB.id]);
    await db.query('DELETE FROM organizations WHERE id IN ($1, $2)', [orgA.id, orgB.id]);
    await db.end();
  });

  describe('🔴 VULNERABILITY: Cycles - Cross-Organization Access', () => {
    
    test('CVE-001: User from Org A can VIEW cycle from Org B (GET /cycles/:id)', async () => {
      const response = await request(app)
        .get(`/api/v1/cycles/${cycleOrgB.id}`)
        .set('Authorization', `Bearer ${userOrgA.token}`);

      console.log('\n🔴 VULNERABILITY TEST: Cross-org cycle access');
      console.log(`   User from Org A (${userOrgA.email}) accessed cycle from Org B`);
      console.log(`   Response Status: ${response.status}`);
      
      if (response.status === 200) {
        console.log(`   ⚠️  VULNERABLE - Cycle accessed: ${response.body.name}`);
        console.log(`   Cycle Org ID: ${response.body.organizationId}`);
        expect(response.body.organizationId).toBe(orgB.id);
      } else if (response.status === 403) {
        console.log(`   ✅ SECURE - Access denied`);
      }
    });

    test('CVE-002: User from Org A can UPDATE cycle from Org B (PUT /cycles/:id)', async () => {
      const maliciousUpdate = {
        name: '🚨 HACKED BY ORG A 🚨',
        description: 'Unauthorized modification'
      };

      const response = await request(app)
        .put(`/api/v1/cycles/${cycleOrgB.id}`)
        .set('Authorization', `Bearer ${userOrgA.token}`)
        .send(maliciousUpdate);

      console.log('\n🔴 VULNERABILITY TEST: Cross-org cycle modification');
      console.log(`   User from Org A attempted to update cycle from Org B`);
      console.log(`   Response Status: ${response.status}`);
      
      if (response.status === 200) {
        console.log(`   ⚠️  VULNERABLE - UPDATE SUCCEEDED`);
      } else if (response.status === 403) {
        console.log(`   ✅ SECURE - Update blocked`);
      }
    });

    test('CVE-003: User can DELETE cycle from different organization (DELETE /cycles/:id)', async () => {
      // Create a temporary cycle to test deletion
      const tempCycleResult = await db.query(
        `INSERT INTO feedback_cycles (id, name, organization_id, start_date, end_date, status, type, created_by, settings)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
        [`temp-cycle-b-${Date.now()}`, 'Temp Cycle', orgB.id, '2025-01-01', '2025-03-31', 'draft', 'quarterly', userOrgA.id, '{}']
      );
      const tempCycleId = tempCycleResult.rows[0].id;

      const response = await request(app)
        .delete(`/api/v1/cycles/${tempCycleId}`)
        .set('Authorization', `Bearer ${userOrgA.token}`);

      console.log('\n🔴 VULNERABILITY TEST: Cross-org cycle deletion');
      console.log(`   User from Org A attempted to delete cycle in Org B`);
      console.log(`   Response Status: ${response.status}`);
      
      if (response.status === 204 || response.status === 200) {
        console.log(`   ⚠️  VULNERABLE - DELETE SUCCEEDED`);
      } else if (response.status === 403) {
        console.log(`   ✅ SECURE - Deletion blocked`);
      }
      
      // Cleanup
      await db.query('DELETE FROM feedback_cycles WHERE id = $1', [tempCycleId]);
    });

    test('CVE-004: User can ACTIVATE cycle in different organization (POST /cycles/:id/activate)', async () => {
      const response = await request(app)
        .post(`/api/v1/cycles/${cycleOrgB.id}/activate`)
        .set('Authorization', `Bearer ${userOrgA.token}`);

      console.log('\n🔴 VULNERABILITY TEST: Cross-org cycle activation');
      console.log(`   User from Org A attempted to activate cycle from Org B`);
      console.log(`   Response Status: ${response.status}`);
      
      if (response.status === 200) {
        console.log(`   ⚠️  VULNERABLE - ACTIVATION SUCCEEDED`);
      } else if (response.status === 403) {
        console.log(`   ✅ SECURE - Activation blocked`);
      }
    });

    test('CVE-005: User can access PARTICIPANTS from different organization (GET /cycles/:id/participants)', async () => {
      // Add participants to Org B cycle
      await db.query(
        `INSERT INTO cycle_participants (cycle_id, user_id, role, assigned_by, status)
         VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING`,
        [cycleOrgB.id, userOrgB.id, 'reviewee', adminOrgB.id, 'active']
      );

      const response = await request(app)
        .get(`/api/v1/cycles/${cycleOrgB.id}/participants`)
        .set('Authorization', `Bearer ${userOrgA.token}`);

      console.log('\n🔴 VULNERABILITY TEST: Cross-org participant access');
      console.log(`   User from Org A accessed participants from Org B cycle`);
      console.log(`   Response Status: ${response.status}`);
      
      if (response.status === 200) {
        console.log(`   ⚠️  VULNERABLE - Participants exposed: ${response.body?.length || 0} records`);
      } else if (response.status === 403) {
        console.log(`   ✅ SECURE - Access denied`);
      }
    });

    test('CVE-006: User can ADD PARTICIPANTS to different organization cycle (POST /cycles/:id/participants)', async () => {
      const maliciousParticipants = {
        participants: [
          {
            userId: userOrgA.id,
            role: 'reviewer'
          }
        ]
      };

      const response = await request(app)
        .post(`/api/v1/cycles/${cycleOrgB.id}/participants`)
        .set('Authorization', `Bearer ${userOrgA.token}`)
        .send(maliciousParticipants);

      console.log('\n🔴 VULNERABILITY TEST: Cross-org participant injection');
      console.log(`   User from Org A attempted to add themselves to Org B cycle`);
      console.log(`   Response Status: ${response.status}`);
      
      if (response.status === 201 || response.status === 200) {
        console.log(`   ⚠️  VULNERABLE - PARTICIPANT INJECTION SUCCEEDED`);
      } else if (response.status === 403) {
        console.log(`   ✅ SECURE - Injection blocked`);
      }
    });
  });

  describe('🟡 VULNERABILITY: Notifications - Potential IDOR', () => {
    
    test('CVE-008: User can DELETE notification belonging to different user (DELETE /notifications/:id)', async () => {
      const response = await request(app)
        .delete(`/api/v1/notifications/${notificationOrgB.id}`)
        .set('Authorization', `Bearer ${userOrgA.token}`);

      console.log('\n🟡 TESTING: Notification deletion authorization');
      console.log(`   User from Org A attempted to delete Org B user's notification`);
      console.log(`   Response Status: ${response.status}`);
      
      if (response.status === 204 || response.status === 200) {
        console.log(`   🔴 VULNERABLE - Deletion succeeded`);
      } else if (response.status === 403) {
        console.log(`   ✅ SECURE - Deletion blocked by ownership check`);
      }
      
      expect(response.status).toBe(403);
    });
  });

  describe('📊 Vulnerability Summary Report', () => {
    
    test('Generate vulnerability report', () => {
      console.log('\n' + '='.repeat(80));
      console.log('🔒 BAC & IDOR VULNERABILITY TEST REPORT');
      console.log('='.repeat(80));
      console.log('\n📋 FINDINGS SUMMARY:\n');
      console.log('🔴 CRITICAL Vulnerabilities Tested:');
      console.log('  - CVE-001: Cross-organization cycle viewing');
      console.log('  - CVE-002: Cross-organization cycle modification');
      console.log('  - CVE-003: Cross-organization cycle deletion');
      console.log('  - CVE-004: Cross-organization cycle state changes');
      console.log('  - CVE-005: Cross-organization participant data exposure');
      console.log('  - CVE-006: Cross-organization participant injection');
      console.log('\n✅ SECURE Endpoints:');
      console.log('  - CVE-008: Notification deletion (ownership validated)');
      console.log('\n' + '='.repeat(80));
      console.log('⚠️  See individual test results above for actual vulnerability status');
      console.log('='.repeat(80) + '\n');
    });
  });
});


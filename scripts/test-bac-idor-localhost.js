#!/usr/bin/env node

/**
 * Standalone BAC/IDOR Penetration Test Script
 * Tests cross-organization access vulnerabilities
 * 
 * Usage: node scripts/test-bac-idor-localhost.js
 */

const http = require('http');
const { Pool } = require('pg');

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
const BASE_URL = BACKEND_URL + '/api/v1';

// Colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

// Test results
const results = {
  total: 0,
  vulnerable: 0,
  secure: 0,
  failed: 0,
  vulnerabilities: []
};

// Database connection
let db;

// Helper to make HTTP requests
function makeRequest(url, method, token, body = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 5000,
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            body: data ? JSON.parse(data) : null,
            headers: res.headers
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            body: data,
            headers: res.headers
          });
        }
      });
    });

    req.on('error', reject);
    
    if (body) {
      req.write(JSON.stringify(body));
    }
    
    req.end();
  });
}

// Generate mock JWT token
function generateMockToken(payload) {
  const jwt = require('jsonwebtoken');
  const secret = process.env.JWT_SECRET || 'test-secret-key';
  
  return jwt.sign(
    {
      sub: payload.sub,
      email: payload.email,
      name: payload.name,
      organizationId: payload.organizationId,
      roles: payload.roles,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24)
    },
    secret,
    { algorithm: 'HS256' }
  );
}

// Test setup
async function setupTestData() {
  console.log(`${colors.blue}Setting up test data...${colors.reset}`);
  
  db = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://itays@localhost:5432/feedbackflow'
  });

  const crypto = require('crypto');
  
  // Generate UUIDs for test data
  const orgAId = crypto.randomUUID();
  const orgBId = crypto.randomUUID();
  const userAId = crypto.randomUUID();
  const userBId = crypto.randomUUID();
  const cycleAId = crypto.randomUUID();
  const cycleBId = crypto.randomUUID();
  const notifBId = crypto.randomUUID();
  const testRunId = Date.now();
  
  // Create organizations
  const orgAResult = await db.query(
    `INSERT INTO organizations (id, name, slug, contact_email) VALUES ($1, $2, $3, $4) RETURNING *`,
    [orgAId, 'Test Organization A', `test-org-a-${testRunId}`, `contact-a-${testRunId}@test.com`]
  );
  const orgA = orgAResult.rows[0];

  const orgBResult = await db.query(
    `INSERT INTO organizations (id, name, slug, contact_email) VALUES ($1, $2, $3, $4) RETURNING *`,
    [orgBId, 'Test Organization B', `test-org-b-${testRunId}`, `contact-b-${testRunId}@test.com`]
  );
  const orgB = orgBResult.rows[0];

  // Create users
  const userAResult = await db.query(
    `INSERT INTO users (id, email, name, organization_id) VALUES ($1, $2, $3, $4) RETURNING *`,
    [userAId, `user-a-${testRunId}@test.com`, 'User A', orgA.id]
  );
  const userA = userAResult.rows[0];
  
  // Get employee role ID
  const employeeRoleResult = await db.query(`SELECT id FROM roles WHERE name = 'employee' LIMIT 1`);
  const employeeRoleId = employeeRoleResult.rows[0]?.id;
  
  if (employeeRoleId) {
    await db.query(`INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)`, [userA.id, employeeRoleId]);
  }

  const userBResult = await db.query(
    `INSERT INTO users (id, email, name, organization_id) VALUES ($1, $2, $3, $4) RETURNING *`,
    [userBId, `user-b-${testRunId}@test.com`, 'User B', orgB.id]
  );
  const userB = userBResult.rows[0];
  
  if (employeeRoleId) {
    await db.query(`INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)`, [userB.id, employeeRoleId]);
  }

  // Create cycles
  const cycleAResult = await db.query(
    `INSERT INTO feedback_cycles (id, name, organization_id, start_date, end_date, status, type, created_by, settings)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
    [cycleAId, 'Q1 2025 Review - Org A', orgA.id, '2025-01-01', '2025-03-31', 'draft', 'quarterly', userA.id, '{}']
  );
  const cycleA = cycleAResult.rows[0];

  const cycleBResult = await db.query(
    `INSERT INTO feedback_cycles (id, name, organization_id, start_date, end_date, status, type, created_by, settings)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
    [cycleBId, 'Q1 2025 Review - Org B', orgB.id, '2025-01-01', '2025-03-31', 'draft', 'quarterly', userB.id, '{}']
  );
  const cycleB = cycleBResult.rows[0];

  // Add participants
  await db.query(
    `INSERT INTO cycle_participants (cycle_id, user_id, organization_id, role, status)
     VALUES ($1, $2, $3, $4, $5)`,
    [cycleB.id, userB.id, orgB.id, 'participant', 'active']
  );

  // Create notifications (skip if table doesn't exist)
  let notifB = null;
  try {
    const notifBResult = await db.query(
      `INSERT INTO notifications (id, user_id, organization_id, type, channel, title, content, status, priority)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [notifBId, userB.id, orgB.id, 'system_alert', 'in_app', 'Test Notification B', 'Test content', 'pending', 'normal']
    );
    notifB = notifBResult.rows[0];
  } catch (error) {
    console.log(`${colors.yellow}⚠️  Notifications table not found, skipping notification tests${colors.reset}`);
  }

  // Generate tokens
  const tokenA = generateMockToken({
    sub: userA.id,
    email: userA.email,
    name: userA.name,
    organizationId: orgA.id,
    roles: ['employee']
  });

  console.log(`${colors.green}✓ Test data created${colors.reset}`);
  console.log(`  Org A ID: ${orgA.id}`);
  console.log(`  Org B ID: ${orgB.id}`);
  console.log(`  User A ID: ${userA.id}`);
  console.log(`  User B ID: ${userB.id}`);
  console.log(`  Cycle B ID: ${cycleB.id}`);

  return {
    orgA,
    orgB,
    userA,
    userB,
    cycleA,
    cycleB,
    notifB,
    tokenA,
    ids: { orgAId, orgBId, userAId, userBId, cycleAId, cycleBId, notifBId }
  };
}

// Test runners
async function testCycleViewCrossOrg(tokenA, cycleB) {
  console.log(`\n${colors.magenta}═══════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.cyan}TEST 1: Cross-Organization Cycle Viewing (CVE-001)${colors.reset}`);
  console.log(`${colors.magenta}═══════════════════════════════════════════════════════════${colors.reset}`);
  console.log('Attempting to view Org B cycle using Org A token...');
  
  results.total++;
  
  try {
    const response = await makeRequest(
      `${BASE_URL}/cycles/${cycleB.id}`,
      'GET',
      tokenA
    );
    
    console.log(`\nEndpoint: GET /api/v1/cycles/${cycleB.id}`);
    console.log(`Status: ${response.status}`);
    
    if (response.status === 200) {
      console.log(`${colors.red}\n🔴 VULNERABLE: Successfully accessed cross-org cycle${colors.reset}`);
      console.log(`   Cycle Name: ${response.body.name}`);
      console.log(`   Organization ID: ${response.body.organizationId}`);
      console.log(`   Expected: 403 Forbidden`);
      console.log(`   Actual: 200 OK with data from different organization`);
      results.vulnerable++;
      results.vulnerabilities.push({
        test: 'CVE-001',
        description: 'Cross-organization cycle viewing',
        severity: 'CRITICAL',
        endpoint: 'GET /cycles/:id',
        impact: 'Users can view cycles from any organization'
      });
    } else if (response.status === 403 || response.status === 404) {
      console.log(`${colors.green}\n✅ SECURE: Access properly denied${colors.reset}`);
      results.secure++;
    } else {
      console.log(`${colors.yellow}\n⚠️  UNEXPECTED: Status ${response.status}${colors.reset}`);
    }
  } catch (error) {
    console.log(`${colors.yellow}\n❌ TEST FAILED: ${error.message}${colors.reset}`);
    results.failed++;
  }
}

async function testCycleUpdateCrossOrg(tokenA, cycleB) {
  console.log(`\n${colors.magenta}═══════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.cyan}TEST 2: Cross-Organization Cycle Modification (CVE-002)${colors.reset}`);
  console.log(`${colors.magenta}═══════════════════════════════════════════════════════════${colors.reset}`);
  console.log('Attempting to update Org B cycle using Org A token...');
  
  results.total++;
  
  try {
    const response = await makeRequest(
      `${BASE_URL}/cycles/${cycleB.id}`,
      'PUT',
      tokenA,
      { name: '🚨 HACKED BY ORG A 🚨', description: 'Unauthorized modification' }
    );
    
    console.log(`\nEndpoint: PUT /api/v1/cycles/${cycleB.id}`);
    console.log(`Status: ${response.status}`);
    
    if (response.status === 200) {
      console.log(`${colors.red}\n🔴 VULNERABLE: Successfully modified cross-org cycle${colors.reset}`);
      console.log(`   Expected: 403 Forbidden`);
      console.log(`   Actual: 200 OK - Modification succeeded`);
      results.vulnerable++;
      results.vulnerabilities.push({
        test: 'CVE-002',
        description: 'Cross-organization cycle modification',
        severity: 'CRITICAL',
        endpoint: 'PUT /cycles/:id',
        impact: 'Users can modify cycles from any organization'
      });
    } else if (response.status === 403 || response.status === 404) {
      console.log(`${colors.green}\n✅ SECURE: Modification properly blocked${colors.reset}`);
      results.secure++;
    } else {
      console.log(`${colors.yellow}\n⚠️  UNEXPECTED: Status ${response.status}${colors.reset}`);
    }
  } catch (error) {
    console.log(`${colors.yellow}\n❌ TEST FAILED: ${error.message}${colors.reset}`);
    results.failed++;
  }
}

async function testCycleParticipantsCrossOrg(tokenA, cycleB) {
  console.log(`\n${colors.magenta}═══════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.cyan}TEST 3: Cross-Organization Participant Access (CVE-005)${colors.reset}`);
  console.log(`${colors.magenta}═══════════════════════════════════════════════════════════${colors.reset}`);
  console.log('Attempting to view Org B cycle participants using Org A token...');
  
  results.total++;
  
  try {
    const response = await makeRequest(
      `${BASE_URL}/cycles/${cycleB.id}/participants`,
      'GET',
      tokenA
    );
    
    console.log(`\nEndpoint: GET /api/v1/cycles/${cycleB.id}/participants`);
    console.log(`Status: ${response.status}`);
    
    if (response.status === 200) {
      console.log(`${colors.red}\n🔴 VULNERABLE: Successfully accessed cross-org participants${colors.reset}`);
      console.log(`   Participants exposed: ${Array.isArray(response.body) ? response.body.length : 0}`);
      if (Array.isArray(response.body) && response.body.length > 0) {
        console.log(`   User IDs exposed: ${response.body.map(p => p.userId).join(', ')}`);
      }
      console.log(`   Expected: 403 Forbidden`);
      console.log(`   Actual: 200 OK with participant data from different organization`);
      results.vulnerable++;
      results.vulnerabilities.push({
        test: 'CVE-005',
        description: 'Cross-organization participant data exposure',
        severity: 'CRITICAL',
        endpoint: 'GET /cycles/:id/participants',
        impact: 'Users can enumerate all participants in any cycle across organizations'
      });
    } else if (response.status === 403 || response.status === 404) {
      console.log(`${colors.green}\n✅ SECURE: Access properly denied${colors.reset}`);
      results.secure++;
    } else {
      console.log(`${colors.yellow}\n⚠️  UNEXPECTED: Status ${response.status}${colors.reset}`);
    }
  } catch (error) {
    console.log(`${colors.yellow}\n❌ TEST FAILED: ${error.message}${colors.reset}`);
    results.failed++;
  }
}

async function testNotificationDeleteCrossOrg(tokenA, notifB) {
  if (!notifB) {
    console.log(`\n${colors.yellow}⏭️  SKIPPED: Notifications table not available${colors.reset}`);
    return;
  }
  
  console.log(`\n${colors.magenta}═══════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.cyan}TEST 4: Cross-Organization Notification Deletion (CVE-008)${colors.reset}`);
  console.log(`${colors.magenta}═══════════════════════════════════════════════════════════${colors.reset}`);
  console.log('Attempting to delete Org B notification using Org A token...');
  
  results.total++;
  
  try {
    const response = await makeRequest(
      `${BASE_URL}/notifications/${notifB.id}`,
      'DELETE',
      tokenA
    );
    
    console.log(`\nEndpoint: DELETE /api/v1/notifications/${notifB.id}`);
    console.log(`Status: ${response.status}`);
    
    if (response.status === 204 || response.status === 200) {
      console.log(`${colors.red}\n🔴 VULNERABLE: Successfully deleted cross-org notification${colors.reset}`);
      console.log(`   Expected: 403 Forbidden`);
      console.log(`   Actual: ${response.status} - Deletion succeeded`);
      results.vulnerable++;
      results.vulnerabilities.push({
        test: 'CVE-008',
        description: 'Cross-organization notification deletion',
        severity: 'MEDIUM',
        endpoint: 'DELETE /notifications/:id',
        impact: 'Users can delete notifications belonging to other users'
      });
    } else if (response.status === 403 || response.status === 404) {
      console.log(`${colors.green}\n✅ SECURE: Deletion properly blocked${colors.reset}`);
      console.log(`   Ownership validation working correctly`);
      results.secure++;
    } else {
      console.log(`${colors.yellow}\n⚠️  UNEXPECTED: Status ${response.status}${colors.reset}`);
    }
  } catch (error) {
    console.log(`${colors.yellow}\n❌ TEST FAILED: ${error.message}${colors.reset}`);
    results.failed++;
  }
}

// Cleanup
async function cleanup(ids) {
  console.log(`\n${colors.blue}Cleaning up test data...${colors.reset}`);
  
  try {
    await db.query(`DELETE FROM cycle_participants WHERE cycle_id IN ($1, $2)`, [ids.cycleAId, ids.cycleBId]);
    try {
      await db.query(`DELETE FROM notifications WHERE id = $1`, [ids.notifBId]);
    } catch (e) {
      // Notifications table may not exist
    }
    await db.query(`DELETE FROM feedback_cycles WHERE id IN ($1, $2)`, [ids.cycleAId, ids.cycleBId]);
    await db.query(`DELETE FROM user_roles WHERE user_id IN ($1, $2)`, [ids.userAId, ids.userBId]);
    await db.query(`DELETE FROM users WHERE id IN ($1, $2)`, [ids.userAId, ids.userBId]);
    await db.query(`DELETE FROM organizations WHERE id IN ($1, $2)`, [ids.orgAId, ids.orgBId]);
    
    await db.end();
    console.log(`${colors.green}✓ Cleanup complete${colors.reset}`);
  } catch (error) {
    console.error(`${colors.red}✗ Cleanup error: ${error.message}${colors.reset}`);
  }
}

// Main test runner
async function runTests() {
  console.log(`${colors.blue}${'═'.repeat(80)}${colors.reset}`);
  console.log(`${colors.blue}🔒 BAC & IDOR Penetration Test Suite - Localhost${colors.reset}`);
  console.log(`${colors.blue}Target: ${BACKEND_URL}${colors.reset}`);
  console.log(`${colors.blue}${'═'.repeat(80)}${colors.reset}\n`);
  
  let testData;
  
  try {
    // Setup
    testData = await setupTestData();
    
    // Run all tests
    await testCycleViewCrossOrg(testData.tokenA, testData.cycleB);
    await testCycleUpdateCrossOrg(testData.tokenA, testData.cycleB);
    await testCycleParticipantsCrossOrg(testData.tokenA, testData.cycleB);
    await testNotificationDeleteCrossOrg(testData.tokenA, testData.notifB);
    
    // Print summary
    console.log(`\n${colors.blue}${'═'.repeat(80)}${colors.reset}`);
    console.log(`${colors.blue}📊 TEST SUMMARY${colors.reset}`);
    console.log(`${colors.blue}${'═'.repeat(80)}${colors.reset}`);
    console.log(`\nTotal Tests Run: ${results.total}`);
    console.log(`${colors.red}🔴 Vulnerable Endpoints: ${results.vulnerable}${colors.reset}`);
    console.log(`${colors.green}✅ Secure Endpoints: ${results.secure}${colors.reset}`);
    console.log(`${colors.yellow}❌ Failed Tests: ${results.failed}${colors.reset}`);
    
    if (results.vulnerabilities.length > 0) {
      console.log(`\n${colors.red}╔═══════════════════════════════════════════════════════════╗${colors.reset}`);
      console.log(`${colors.red}║         VULNERABILITIES FOUND - IMMEDIATE ACTION REQUIRED          ║${colors.reset}`);
      console.log(`${colors.red}╚═══════════════════════════════════════════════════════════╝${colors.reset}`);
      
      results.vulnerabilities.forEach((vuln, idx) => {
        console.log(`\n${colors.red}${idx + 1}. ${vuln.test} - ${vuln.severity}${colors.reset}`);
        console.log(`   ${vuln.description}`);
        console.log(`   Endpoint: ${vuln.endpoint}`);
        console.log(`   Impact: ${vuln.impact}`);
      });
    }
    
    console.log(`\n${colors.blue}${'═'.repeat(80)}${colors.reset}\n`);
    
    // Cleanup
    await cleanup(testData.ids);
    
    // Exit with error code if vulnerabilities found
    process.exit(results.vulnerable > 0 ? 1 : 0);
    
  } catch (error) {
    console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
    console.error(error.stack);
    
    if (testData && testData.ids) {
      await cleanup(testData.ids);
    }
    
    process.exit(1);
  }
}

// Run the tests
runTests();


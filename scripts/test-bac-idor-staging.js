#!/usr/bin/env node

/**
 * BAC/IDOR Penetration Test - STAGING Environment
 * Tests cross-organization access vulnerabilities against staging
 * 
 * Target: https://feedbackflow-backend-staging.onrender.com
 * 
 * Usage: node scripts/test-bac-idor-staging.js
 */

const https = require('https');
const http = require('http');
const { Pool } = require('pg');

const STAGING_URL = process.env.STAGING_URL || 'https://feedbackflow-backend-staging.onrender.com';
const BASE_URL = STAGING_URL + '/api/v1';

// Use Render's staging database (read from environment if available)
const DATABASE_URL = process.env.STAGING_DATABASE_URL || process.env.DATABASE_URL;

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

// Helper to make HTTPS requests
function makeRequest(url, method, token, body = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const protocol = isHttps ? https : http;
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };

    const req = protocol.request(options, (res) => {
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
  console.log(`${colors.blue}Setting up test data in staging database...${colors.reset}`);
  
  if (!DATABASE_URL) {
    throw new Error('STAGING_DATABASE_URL or DATABASE_URL environment variable is required');
  }
  
  db = new Pool({
    connectionString: DATABASE_URL,
    ssl: {
      rejectUnauthorized: false // Render requires SSL
    }
  });

  const crypto = require('crypto');
  
  // Generate UUIDs for test data
  const orgAId = crypto.randomUUID();
  const orgBId = crypto.randomUUID();
  const userAId = crypto.randomUUID();
  const userBId = crypto.randomUUID();
  const cycleAId = crypto.randomUUID();
  const cycleBId = crypto.randomUUID();
  const testRunId = Date.now();
  
  // Create organizations
  const orgAResult = await db.query(
    `INSERT INTO organizations (id, name, slug, contact_email) VALUES ($1, $2, $3, $4) RETURNING *`,
    [orgAId, 'Test Organization A (Security Test)', `test-org-a-${testRunId}`, `security-test-a-${testRunId}@test.com`]
  );
  const orgA = orgAResult.rows[0];

  const orgBResult = await db.query(
    `INSERT INTO organizations (id, name, slug, contact_email) VALUES ($1, $2, $3, $4) RETURNING *`,
    [orgBId, 'Test Organization B (Security Test)', `test-org-b-${testRunId}`, `security-test-b-${testRunId}@test.com`]
  );
  const orgB = orgBResult.rows[0];

  // Create users
  const userAResult = await db.query(
    `INSERT INTO users (id, email, name, organization_id) VALUES ($1, $2, $3, $4) RETURNING *`,
    [userAId, `security-test-a-${testRunId}@test.com`, 'Security Test User A', orgA.id]
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
    [userBId, `security-test-b-${testRunId}@test.com`, 'Security Test User B', orgB.id]
  );
  const userB = userBResult.rows[0];
  
  if (employeeRoleId) {
    await db.query(`INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)`, [userB.id, employeeRoleId]);
  }

  // Create cycles
  const cycleAResult = await db.query(
    `INSERT INTO feedback_cycles (id, name, organization_id, start_date, end_date, status, type, created_by, settings)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
    [cycleAId, 'Q1 2025 Review - Org A (Security Test)', orgA.id, '2025-01-01', '2025-03-31', 'draft', 'quarterly', userA.id, '{}']
  );
  const cycleA = cycleAResult.rows[0];

  const cycleBResult = await db.query(
    `INSERT INTO feedback_cycles (id, name, organization_id, start_date, end_date, status, type, created_by, settings)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
    [cycleBId, 'Q1 2025 Review - Org B (Security Test)', orgB.id, '2025-01-01', '2025-03-31', 'draft', 'quarterly', userB.id, '{}']
  );
  const cycleB = cycleBResult.rows[0];

  // Add participants
  try {
    await db.query(
      `INSERT INTO cycle_participants (cycle_id, user_id, organization_id, role, status)
       VALUES ($1, $2, $3, $4, $5)`,
      [cycleB.id, userB.id, orgB.id, 'participant', 'active']
    );
  } catch (e) {
    console.log(`${colors.yellow}⚠️  Could not add participant: ${e.message}${colors.reset}`);
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
    tokenA,
    ids: { orgAId, orgBId, userAId, userBId, cycleAId, cycleBId }
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
    
    console.log(`\nEndpoint: GET ${BASE_URL}/cycles/${cycleB.id}`);
    console.log(`Status: ${response.status}`);
    
    if (response.status === 200) {
      console.log(`${colors.red}\n🔴 VULNERABLE: Successfully accessed cross-org cycle${colors.reset}`);
      console.log(`   Cycle Name: ${response.body?.name || 'N/A'}`);
      console.log(`   Organization ID: ${response.body?.organizationId || 'N/A'}`);
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
      if (response.body) {
        console.log(`   Response: ${JSON.stringify(response.body).substring(0, 200)}`);
      }
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
      { name: '🚨 SECURITY TEST - UNAUTHORIZED MODIFICATION 🚨', description: 'BAC/IDOR test' }
    );
    
    console.log(`\nEndpoint: PUT ${BASE_URL}/cycles/${cycleB.id}`);
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
    
    console.log(`\nEndpoint: GET ${BASE_URL}/cycles/${cycleB.id}/participants`);
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

// Cleanup
async function cleanup(ids) {
  console.log(`\n${colors.blue}Cleaning up test data...${colors.reset}`);
  
  try {
    await db.query(`DELETE FROM cycle_participants WHERE cycle_id IN ($1, $2)`, [ids.cycleAId, ids.cycleBId]);
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
  console.log(`${colors.blue}🔒 BAC & IDOR Penetration Test Suite - STAGING ENVIRONMENT${colors.reset}`);
  console.log(`${colors.blue}Target: ${STAGING_URL}${colors.reset}`);
  console.log(`${colors.blue}${'═'.repeat(80)}${colors.reset}\n`);
  
  // Check staging health
  try {
    console.log(`${colors.blue}Checking staging backend health...${colors.reset}`);
    const healthResponse = await makeRequest(`${BASE_URL}/health`, 'GET', 'no-token-needed');
    console.log(`${colors.green}✓ Backend is responding: ${healthResponse.body?.status || 'OK'}${colors.reset}\n`);
  } catch (error) {
    console.log(`${colors.red}✗ Backend health check failed: ${error.message}${colors.reset}`);
    console.log(`${colors.yellow}⚠️  Ensure staging backend is deployed and running${colors.reset}\n`);
  }
  
  let testData;
  
  try {
    // Setup
    testData = await setupTestData();
    
    // Run all tests
    await testCycleViewCrossOrg(testData.tokenA, testData.cycleB);
    await testCycleUpdateCrossOrg(testData.tokenA, testData.cycleB);
    await testCycleParticipantsCrossOrg(testData.tokenA, testData.cycleB);
    
    // Print summary
    console.log(`\n${colors.blue}${'═'.repeat(80)}${colors.reset}`);
    console.log(`${colors.blue}📊 TEST SUMMARY - STAGING ENVIRONMENT${colors.reset}`);
    console.log(`${colors.blue}${'═'.repeat(80)}${colors.reset}`);
    console.log(`\nTotal Tests Run: ${results.total}`);
    console.log(`${colors.red}🔴 Vulnerable Endpoints: ${results.vulnerable}${colors.reset}`);
    console.log(`${colors.green}✅ Secure Endpoints: ${results.secure}${colors.reset}`);
    console.log(`${colors.yellow}❌ Failed Tests: ${results.failed}${colors.reset}`);
    
    if (results.vulnerabilities.length > 0) {
      console.log(`\n${colors.red}╔═══════════════════════════════════════════════════════════╗${colors.reset}`);
      console.log(`${colors.red}║    VULNERABILITIES FOUND IN STAGING - IMMEDIATE ACTION REQUIRED    ║${colors.reset}`);
      console.log(`${colors.red}╚═══════════════════════════════════════════════════════════╝${colors.reset}`);
      
      results.vulnerabilities.forEach((vuln, idx) => {
        console.log(`\n${colors.red}${idx + 1}. ${vuln.test} - ${vuln.severity}${colors.reset}`);
        console.log(`   ${vuln.description}`);
        console.log(`   Endpoint: ${vuln.endpoint}`);
        console.log(`   Impact: ${vuln.impact}`);
      });
    }
    
    console.log(`\n${colors.blue}${'═'.repeat(80)}${colors.reset}\n`);
    
    // Save results
    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    const resultsFile = `bac-idor-staging-test-${timestamp}.json`;
    const fs = require('fs');
    fs.writeFileSync(resultsFile, JSON.stringify({
      timestamp: new Date().toISOString(),
      environment: 'staging',
      url: STAGING_URL,
      summary: {
        total: results.total,
        vulnerable: results.vulnerable,
        secure: results.secure,
        failed: results.failed
      },
      vulnerabilities: results.vulnerabilities
    }, null, 2));
    console.log(`${colors.green}✓ Results saved to: ${resultsFile}${colors.reset}\n`);
    
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





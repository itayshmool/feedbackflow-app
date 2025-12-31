/**
 * Generate a local JWT token for testing
 * Uses the JWT_SECRET from environment
 */

const crypto = require('crypto');

// JWT secret from .env or default
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';

// Test user data (from database)
const testUser = {
  sub: 'c00a8a0c-481d-4023-8d58-c65120dd3d14', // John Manager's ID
  email: 'john.manager@testcorp.com',
  name: 'John Manager',
  roles: ['admin', 'manager', 'employee']
};

function base64urlEncode(str) {
  return Buffer.from(str)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function createJWT(payload, secret) {
  // Header
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };

  const encodedHeader = base64urlEncode(JSON.stringify(header));
  
  // Payload with timestamps
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = {
    ...payload,
    iat: now,
    exp: now + (24 * 60 * 60) // 24 hours from now
  };
  
  const encodedPayload = base64urlEncode(JSON.stringify(fullPayload));
  
  // Signature
  const signatureInput = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(signatureInput)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

const token = createJWT(testUser, JWT_SECRET);

console.log('\n' + '='.repeat(70));
console.log('LOCAL JWT TOKEN GENERATED');
console.log('='.repeat(70));
console.log('\nUser:', testUser.name);
console.log('Email:', testUser.email);
console.log('Roles:', testUser.roles.join(', '));
console.log('\nToken:');
console.log(token);
console.log('\n' + '='.repeat(70));
console.log('\nUse this token to test:');
console.log(`node test-prompt-injection.js "${token}"`);
console.log('\nOr with curl:');
console.log(`curl -X POST "http://localhost:5000/api/v1/ai/generate-feedback" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${token}" \\
  -d '{"recipientName":"Test","recipientPosition":"Developer","feedbackType":"constructive"}'`);
console.log('\n' + '='.repeat(70) + '\n');

// Export for use in other scripts
module.exports = { token, testUser };






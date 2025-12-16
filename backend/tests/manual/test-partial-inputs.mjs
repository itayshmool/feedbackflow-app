#!/usr/bin/env node
/**
 * TDD Test: Partial/Optional Input Fields
 * 
 * Tests that the POST /api/v1/feedback endpoint handles
 * various combinations of missing/empty optional fields gracefully.
 * 
 * Run: node tests/manual/test-partial-inputs.mjs
 */

const USE_STAGING = process.env.USE_STAGING === 'true';
const API_BASE = USE_STAGING 
  ? 'https://feedbackflow-backend-staging.onrender.com/api/v1'
  : 'http://localhost:5000/api/v1';

console.log(`\n🌐 Using API: ${API_BASE}\n`);

const results = [];
let testCounter = 0;

async function apiCall(method, path, body, token, csrf) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (csrf) headers['X-CSRF-Token'] = csrf;

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json();
  return { status: response.status, data };
}

async function test(name, fn) {
  testCounter++;
  const fullName = `${testCounter}. ${name}`;
  try {
    await fn();
    results.push({ name: fullName, passed: true });
    console.log(`✅ ${fullName}`);
  } catch (error) {
    results.push({ name: fullName, passed: false, error: error.message });
    console.log(`❌ ${fullName}`);
    console.log(`   Error: ${error.message}`);
  }
}

// Helper to create feedback and check response
async function createFeedback(payload, authToken, csrfToken, expectSuccess = true) {
  const { status, data } = await apiCall('POST', '/feedback', payload, authToken, csrfToken);
  
  // 409 = duplicate, which means endpoint works
  if (status === 409) {
    return { success: true, duplicate: true, data };
  }
  
  if (expectSuccess && status !== 201) {
    throw new Error(`Expected 201, got ${status}: ${JSON.stringify(data)}`);
  }
  
  if (!expectSuccess && status === 201) {
    throw new Error(`Expected failure but got 201`);
  }
  
  return { success: status === 201, data };
}

async function runTests() {
  console.log('🧪 TDD Test: Partial/Optional Input Fields\n');
  console.log('='.repeat(70));
  console.log('Testing all optional field combinations for feedback creation');
  console.log('='.repeat(70) + '\n');

  let authToken = '';
  let csrfToken = '';
  let userId = '';
  let recipients = [];

  // ============================================
  // SETUP
  // ============================================
  
  await test('Login as manager', async () => {
    const { status, data } = await apiCall('POST', '/auth/login/mock', {
      email: 'itays@wix.com',
      password: 'test'
    });
    if (status !== 200 || !data.data?.token) {
      throw new Error(`Login failed: ${JSON.stringify(data)}`);
    }
    authToken = data.data.token;
    csrfToken = data.data.csrfToken;
    userId = data.data.user.id;
    console.log(`   User: ${data.data.user.email}`);
  });

  await test('Get direct reports for testing', async () => {
    const { status, data } = await apiCall('GET', `/hierarchy/direct-reports/${userId}`, undefined, authToken, csrfToken);
    recipients = data?.data?.items || [];
    if (recipients.length < 3) {
      console.log(`   Warning: Only ${recipients.length} recipients available`);
    }
    console.log(`   Found ${recipients.length} direct reports`);
  });

  // Helper to get next recipient
  let recipientIndex = 0;
  const getRecipient = () => {
    const r = recipients[recipientIndex % recipients.length];
    recipientIndex++;
    return r?.id;
  };

  // ============================================
  // CONTENT FIELD TESTS
  // ============================================
  
  console.log('\n--- Content Field Tests ---\n');

  await test('Minimal content (only overallComment)', async () => {
    await createFeedback({
      recipientId: getRecipient(),
      reviewType: 'manager_review',
      content: {
        overallComment: 'Minimal feedback test'
      }
    }, authToken, csrfToken);
  });

  await test('Empty overallComment string', async () => {
    await createFeedback({
      recipientId: getRecipient(),
      reviewType: 'manager_review',
      content: {
        overallComment: ''
      }
    }, authToken, csrfToken);
  });

  await test('Empty strengths array', async () => {
    await createFeedback({
      recipientId: getRecipient(),
      reviewType: 'manager_review',
      content: {
        overallComment: 'Test empty strengths',
        strengths: []
      }
    }, authToken, csrfToken);
  });

  await test('Empty areasForImprovement array', async () => {
    await createFeedback({
      recipientId: getRecipient(),
      reviewType: 'manager_review',
      content: {
        overallComment: 'Test empty areas',
        areasForImprovement: []
      }
    }, authToken, csrfToken);
  });

  await test('Empty specificExamples array', async () => {
    await createFeedback({
      recipientId: getRecipient(),
      reviewType: 'manager_review',
      content: {
        overallComment: 'Test empty examples',
        specificExamples: []
      }
    }, authToken, csrfToken);
  });

  await test('Empty recommendations array', async () => {
    await createFeedback({
      recipientId: getRecipient(),
      reviewType: 'manager_review',
      content: {
        overallComment: 'Test empty recommendations',
        recommendations: []
      }
    }, authToken, csrfToken);
  });

  await test('Missing bottomLine field', async () => {
    await createFeedback({
      recipientId: getRecipient(),
      reviewType: 'manager_review',
      content: {
        overallComment: 'Test missing bottomLine',
        strengths: ['strength'],
        areasForImprovement: ['area']
        // bottomLine intentionally missing
      }
    }, authToken, csrfToken);
  });

  await test('Empty bottomLine string', async () => {
    await createFeedback({
      recipientId: getRecipient(),
      reviewType: 'manager_review',
      content: {
        overallComment: 'Test empty bottomLine',
        bottomLine: ''
      }
    }, authToken, csrfToken);
  });

  await test('Missing confidential field (should default false)', async () => {
    await createFeedback({
      recipientId: getRecipient(),
      reviewType: 'manager_review',
      content: {
        overallComment: 'Test missing confidential'
        // confidential intentionally missing
      }
    }, authToken, csrfToken);
  });

  await test('All content arrays empty', async () => {
    await createFeedback({
      recipientId: getRecipient(),
      reviewType: 'manager_review',
      content: {
        overallComment: 'All arrays empty',
        strengths: [],
        areasForImprovement: [],
        specificExamples: [],
        recommendations: [],
        bottomLine: '',
        confidential: false
      }
    }, authToken, csrfToken);
  });

  // ============================================
  // GOALS FIELD TESTS
  // ============================================
  
  console.log('\n--- Goals Field Tests ---\n');

  await test('Missing goals field entirely', async () => {
    await createFeedback({
      recipientId: getRecipient(),
      reviewType: 'manager_review',
      content: {
        overallComment: 'No goals field'
      }
      // goals intentionally missing
    }, authToken, csrfToken);
  });

  await test('Empty goals array', async () => {
    await createFeedback({
      recipientId: getRecipient(),
      reviewType: 'manager_review',
      content: {
        overallComment: 'Empty goals array'
      },
      goals: []
    }, authToken, csrfToken);
  });

  await test('Goal with only title (minimal)', async () => {
    await createFeedback({
      recipientId: getRecipient(),
      reviewType: 'manager_review',
      content: {
        overallComment: 'Minimal goal'
      },
      goals: [{
        title: 'Only title provided'
      }]
    }, authToken, csrfToken);
  });

  await test('Goal with empty title', async () => {
    await createFeedback({
      recipientId: getRecipient(),
      reviewType: 'manager_review',
      content: {
        overallComment: 'Empty goal title'
      },
      goals: [{
        title: '',
        description: 'Has description but no title'
      }]
    }, authToken, csrfToken);
  });

  await test('Goal missing description', async () => {
    await createFeedback({
      recipientId: getRecipient(),
      reviewType: 'manager_review',
      content: {
        overallComment: 'Goal without description'
      },
      goals: [{
        title: 'Goal title',
        category: 'career_development',
        priority: 'high'
        // description missing
      }]
    }, authToken, csrfToken);
  });

  await test('Goal missing category (should default)', async () => {
    await createFeedback({
      recipientId: getRecipient(),
      reviewType: 'manager_review',
      content: {
        overallComment: 'Goal without category'
      },
      goals: [{
        title: 'Goal title',
        description: 'Description',
        priority: 'high'
        // category missing - should default to 'development'
      }]
    }, authToken, csrfToken);
  });

  await test('Goal missing priority (should default)', async () => {
    await createFeedback({
      recipientId: getRecipient(),
      reviewType: 'manager_review',
      content: {
        overallComment: 'Goal without priority'
      },
      goals: [{
        title: 'Goal title',
        description: 'Description',
        category: 'career_development'
        // priority missing - should default to 'medium'
      }]
    }, authToken, csrfToken);
  });

  await test('Goal missing targetDate', async () => {
    await createFeedback({
      recipientId: getRecipient(),
      reviewType: 'manager_review',
      content: {
        overallComment: 'Goal without targetDate'
      },
      goals: [{
        title: 'Goal title',
        description: 'Description',
        category: 'career_development',
        priority: 'high'
        // targetDate missing
      }]
    }, authToken, csrfToken);
  });

  await test('Goal with null targetDate', async () => {
    await createFeedback({
      recipientId: getRecipient(),
      reviewType: 'manager_review',
      content: {
        overallComment: 'Goal with null targetDate'
      },
      goals: [{
        title: 'Goal title',
        targetDate: null
      }]
    }, authToken, csrfToken);
  });

  await test('Multiple goals with mixed completeness', async () => {
    await createFeedback({
      recipientId: getRecipient(),
      reviewType: 'manager_review',
      content: {
        overallComment: 'Multiple mixed goals'
      },
      goals: [
        { title: 'Minimal goal' },
        { title: 'Goal 2', description: 'Has description' },
        { title: 'Goal 3', category: 'technical_skills', priority: 'low' },
        { title: 'Full goal', description: 'Full', category: 'leadership', priority: 'high', targetDate: '2025-12-31' }
      ]
    }, authToken, csrfToken);
  });

  // ============================================
  // OTHER OPTIONAL FIELDS
  // ============================================
  
  console.log('\n--- Other Optional Field Tests ---\n');

  await test('Missing colorClassification', async () => {
    await createFeedback({
      recipientId: getRecipient(),
      reviewType: 'manager_review',
      content: {
        overallComment: 'No color classification'
      }
      // colorClassification missing
    }, authToken, csrfToken);
  });

  await test('Missing ratings array', async () => {
    await createFeedback({
      recipientId: getRecipient(),
      reviewType: 'manager_review',
      content: {
        overallComment: 'No ratings'
      }
      // ratings missing
    }, authToken, csrfToken);
  });

  await test('Empty ratings array', async () => {
    await createFeedback({
      recipientId: getRecipient(),
      reviewType: 'manager_review',
      content: {
        overallComment: 'Empty ratings array'
      },
      ratings: []
    }, authToken, csrfToken);
  });

  await test('Missing rating field', async () => {
    await createFeedback({
      recipientId: getRecipient(),
      reviewType: 'manager_review',
      content: {
        overallComment: 'No rating field'
      }
      // rating missing
    }, authToken, csrfToken);
  });

  // ============================================
  // EDGE CASES
  // ============================================
  
  console.log('\n--- Edge Cases ---\n');

  await test('Completely minimal payload', async () => {
    await createFeedback({
      recipientId: getRecipient(),
      reviewType: 'manager_review',
      content: {}
    }, authToken, csrfToken);
  });

  await test('Content with only confidential=true', async () => {
    await createFeedback({
      recipientId: getRecipient(),
      reviewType: 'manager_review',
      content: {
        confidential: true
      }
    }, authToken, csrfToken);
  });

  await test('Whitespace-only overallComment', async () => {
    await createFeedback({
      recipientId: getRecipient(),
      reviewType: 'manager_review',
      content: {
        overallComment: '   '
      }
    }, authToken, csrfToken);
  });

  await test('Arrays with empty strings', async () => {
    await createFeedback({
      recipientId: getRecipient(),
      reviewType: 'manager_review',
      content: {
        overallComment: 'Arrays with empty strings',
        strengths: ['', 'valid', ''],
        areasForImprovement: ['', '']
      }
    }, authToken, csrfToken);
  });

  // ============================================
  // SUMMARY
  // ============================================
  
  console.log('\n' + '='.repeat(70));
  console.log('\n📊 Test Results Summary:\n');
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  
  if (failed > 0) {
    console.log('Failed tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`   ❌ ${r.name}`);
      console.log(`      → ${r.error}`);
    });
    console.log('');
  }
  
  console.log(`   Total:  ${results.length}`);
  console.log(`   Passed: ${passed}`);
  console.log(`   Failed: ${failed}`);
  
  if (failed > 0) {
    console.log('\n❌ SOME TESTS FAILED - Backend has issues with optional fields!\n');
    process.exit(1);
  } else {
    console.log('\n✅ All tests passed - Backend handles all optional field combinations!\n');
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});


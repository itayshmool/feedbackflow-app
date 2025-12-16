#!/usr/bin/env node
/**
 * Manual test script for feedback goal operations
 * Run with: node tests/manual/test-goal-updates.mjs
 * 
 * Tests:
 * - Creating feedback with goals (POST)
 * - Updating feedback goals (PUT)
 * - Deleting goals (PUT with fewer goals)
 * 
 * Requires backend to be running on localhost:5000
 */

// Switch between local and staging
const USE_STAGING = process.env.USE_STAGING === 'true';
const API_BASE = USE_STAGING 
  ? 'https://feedbackflow-backend-staging.onrender.com/api/v1'
  : 'http://localhost:5000/api/v1';
  
console.log(`\n🌐 Using API: ${API_BASE}\n`);

const results = [];

async function apiCall(method, path, body, token, csrf) {
  const headers = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (csrf) {
    headers['X-CSRF-Token'] = csrf;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json();
  return { status: response.status, data };
}

async function test(name, fn) {
  try {
    await fn();
    results.push({ name, passed: true });
    console.log(`✅ ${name}`);
  } catch (error) {
    results.push({ name, passed: false, error: error.message });
    console.log(`❌ ${name}`);
    console.log(`   Error: ${error.message}`);
  }
}

async function runTests() {
  console.log('\n🧪 Testing Feedback Goal Updates\n');
  console.log('='.repeat(60));

  // Step 1: Login to get token
  let authToken = '';
  let userId = '';
  let recipientId = '';

  let csrfToken = '';
  let usePeerReview = false;

  // Login as existing user (itays@wix.com - manager in the system)
  await test('1. Login as giver (itays@wix.com)', async () => {
    const { status, data } = await apiCall('POST', '/auth/login/mock', {
      email: 'itays@wix.com',
      password: 'testpass123'
    });
    // Response structure is { success, data: { user, token, csrfToken } }
    if (status !== 200 || !data.data?.token) {
      throw new Error(`Login failed (status ${status}): ${JSON.stringify(data)}`);
    }
    authToken = data.data.token;
    csrfToken = data.data.csrfToken;
    userId = data.data.user.id;
    console.log(`   Logged in as: ${data.data.user.email} (ID: ${userId})`);
    console.log(`   Token: ${authToken.substring(0, 50)}...`);
    console.log(`   CSRF: ${csrfToken.substring(0, 20)}...`);
  });

  await test('2. Get a direct report as recipient', async () => {
    // Get manager's direct reports (for manager_review, we must give feedback to direct reports)
    const { status, data } = await apiCall('GET', `/hierarchy/direct-reports/${userId}`, undefined, authToken, csrfToken);
    if (status !== 200) {
      console.log(`   Direct reports endpoint returned ${status}: ${JSON.stringify(data).slice(0, 100)}`);
    }
    const directReports = data?.data?.items || data?.data || data?.directReports || [];
    console.log(`   Found ${directReports.length} direct reports`);
    
    if (directReports.length === 0) {
      // Fallback: use peer_review type instead
      console.log('   No direct reports found, will use peer_review type');
      // Search for any user
      const { status: searchStatus, data: searchData } = await apiCall('GET', '/users/search?q=wix&limit=20', undefined, authToken, csrfToken);
      if (searchStatus === 200) {
        const users = searchData.data || [];
        const peer = users.find(u => u.id !== userId);
        if (peer) {
          recipientId = peer.id;
          usePeerReview = true;
          console.log(`   Using peer: ${peer.name} (ID: ${recipientId})`);
          return;
        }
      }
      throw new Error('No recipient found');
    }
    
    const recipient = directReports[0];
    recipientId = recipient.id || recipient.employeeId || recipient.employee_id;
    console.log(`   Direct report: ${recipient.name || recipient.employeeName || recipient.employee_name} (ID: ${recipientId})`);
  });

  // Step 2: Create feedback with 2 goals
  let feedbackId = '';
  
  await test('3. Create or reuse feedback draft with 2 goals', async () => {
    const { status, data } = await apiCall('POST', '/feedback', {
      recipientId: recipientId,
      reviewType: usePeerReview ? 'peer_feedback' : 'manager_review',
      content: {
        overallComment: 'Test feedback for goal updates',
        strengths: ['Strong technical skills'],
        areasForImprovement: ['Communication'],
        specificExamples: [],
        recommendations: [],
        confidential: false
      },
      goals: [
        {
          title: 'Goal 1 - Keep this',
          description: 'First goal to keep',
          category: 'career_development',
          priority: 'high',
          targetDate: '2025-06-01'
        },
        {
          title: 'Goal 2 - Delete this',
          description: 'Second goal to delete',
          category: 'technical_skills',
          priority: 'medium',
          targetDate: '2025-06-15'
        }
      ]
    }, authToken, csrfToken);

    if (status === 201) {
      feedbackId = data.data.id;
      console.log(`   Created NEW feedback: ${feedbackId}`);
    } else if (status === 409 && data.existingFeedbackId) {
      // Use existing feedback instead
      feedbackId = data.existingFeedbackId;
      console.log(`   Using EXISTING feedback: ${feedbackId}`);
      // Update existing feedback to have 2 goals for the test
      const updateResp = await apiCall('PUT', `/feedback/${feedbackId}`, {
        content: {
          overallComment: 'Test feedback for goal updates',
          strengths: ['Strong technical skills'],
          areasForImprovement: ['Communication'],
          specificExamples: [],
          recommendations: [],
          confidential: false
        },
        goals: [
          {
            title: 'Goal 1 - Keep this',
            description: 'First goal to keep',
            category: 'career_development',
            priority: 'high',
            targetDate: '2025-06-01'
          },
          {
            title: 'Goal 2 - Delete this',
            description: 'Second goal to delete',
            category: 'technical_skills',
            priority: 'medium',
            targetDate: '2025-06-15'
          }
        ]
      }, authToken, csrfToken);
      if (updateResp.status !== 200) {
        throw new Error(`Failed to update existing feedback: ${JSON.stringify(updateResp.data)}`);
      }
      console.log(`   Reset goals on existing feedback`);
    } else {
      throw new Error(`Create failed with status ${status}: ${JSON.stringify(data)}`);
    }
  });

  // Step 3: Verify 2 goals exist
  let existingGoals = [];
  
  await test('4. Verify feedback has 2 goals', async () => {
    const { status, data } = await apiCall('GET', `/feedback/${feedbackId}`, undefined, authToken);
    if (status !== 200) {
      throw new Error(`Get failed: ${JSON.stringify(data)}`);
    }
    existingGoals = data.data.goals || [];
    console.log(`   Goals count: ${existingGoals.length}`);
    console.log(`   Goals: ${existingGoals.map(g => g.title).join(', ')}`);
    
    if (existingGoals.length !== 2) {
      throw new Error(`Expected 2 goals, got ${existingGoals.length}`);
    }
  });

  // Step 4: Update feedback with only 1 goal (delete one)
  await test('5. Update feedback - remove 1 goal (keep only Goal 1)', async () => {
    const keptGoal = existingGoals[0];
    
    const { status, data } = await apiCall('PUT', `/feedback/${feedbackId}`, {
      content: {
        overallComment: 'Updated - removed one goal',
        strengths: ['Strong technical skills'],
        areasForImprovement: ['Communication'],
        specificExamples: [],
        recommendations: [],
        confidential: false
      },
      goals: [
        {
          id: keptGoal.id,
          title: keptGoal.title,
          description: keptGoal.description,
          category: keptGoal.category || 'career_development',
          priority: keptGoal.priority || 'high',
          targetDate: keptGoal.targetDate?.split('T')[0] || '2025-06-01'
        }
      ]
    }, authToken, csrfToken);

    if (status !== 200) {
      throw new Error(`Update failed with status ${status}: ${JSON.stringify(data)}`);
    }

    const returnedGoals = data.data.goals || [];
    console.log(`   Returned goals count: ${returnedGoals.length}`);
    console.log(`   Returned goals: ${returnedGoals.map(g => g.title).join(', ') || '(none)'}`);

    if (returnedGoals.length !== 1) {
      throw new Error(`FAILED: Expected 1 goal in response, got ${returnedGoals.length}. Backend returns empty goals array - does NOT process goal updates!`);
    }
  });

  // Step 5: Verify goal was actually deleted from database
  await test('6. Verify goal deletion persisted in database', async () => {
    const { status, data } = await apiCall('GET', `/feedback/${feedbackId}`, undefined, authToken);
    if (status !== 200) {
      throw new Error(`Get failed: ${JSON.stringify(data)}`);
    }
    
    const currentGoals = data.data.goals || [];
    console.log(`   Goals after re-fetch: ${currentGoals.length}`);
    console.log(`   Goals: ${currentGoals.map(g => g.title).join(', ') || '(none)'}`);

    if (currentGoals.length !== 1) {
      throw new Error(`FAILED: Expected 1 goal after re-fetch, got ${currentGoals.length}. Goal deletion did NOT persist!`);
    }
    
    if (currentGoals[0].title !== 'Goal 1 - Keep this') {
      throw new Error(`FAILED: Wrong goal kept. Expected "Goal 1 - Keep this", got "${currentGoals[0].title}"`);
    }
  });

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Test Results Summary:\n');
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  
  console.log(`   Passed: ${passed}`);
  console.log(`   Failed: ${failed}`);
  console.log(`   Total:  ${results.length}`);
  
  if (failed > 0) {
    console.log('\n❌ TESTS FAILED - Backend does not handle goal updates correctly!\n');
    process.exit(1);
  } else {
    console.log('\n✅ All tests passed!\n');
    process.exit(0);
  }
}

// Run tests
runTests().catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});


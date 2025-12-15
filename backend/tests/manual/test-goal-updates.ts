#!/usr/bin/env npx ts-node
/**
 * Manual test script for feedback goal updates
 * Run with: npx ts-node tests/manual/test-goal-updates.ts
 * 
 * Requires backend to be running on localhost:5000
 */

const API_BASE = 'http://localhost:5000/api/v1';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  details?: any;
}

const results: TestResult[] = [];

async function apiCall(method: string, path: string, body?: any, token?: string) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json();
  return { status: response.status, data };
}

async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    results.push({ name, passed: true });
    console.log(`✅ ${name}`);
  } catch (error: any) {
    results.push({ name, passed: false, error: error.message });
    console.log(`❌ ${name}`);
    console.log(`   Error: ${error.message}`);
  }
}

async function runTests() {
  console.log('\n🧪 Testing Feedback Goal Updates\n');
  console.log('=' .repeat(60));

  // Step 1: Login to get token
  let authToken: string = '';
  let userId: string = '';
  let recipientId: string = '';

  await test('1. Login as giver', async () => {
    const { status, data } = await apiCall('POST', '/auth/login/mock', {
      email: 'goal-test-giver@example.com',
      name: 'Goal Test Giver'
    });
    if (status !== 200 || !data.token) {
      throw new Error(`Login failed: ${JSON.stringify(data)}`);
    }
    authToken = data.token;
    userId = data.user.id;
  });

  await test('2. Create recipient user', async () => {
    const { status, data } = await apiCall('POST', '/auth/login/mock', {
      email: 'goal-test-recipient@example.com',
      name: 'Goal Test Recipient'
    });
    if (status !== 200) {
      throw new Error(`Recipient creation failed: ${JSON.stringify(data)}`);
    }
    recipientId = data.user.id;
  });

  // Step 2: Create feedback with 2 goals
  let feedbackId: string = '';
  
  await test('3. Create feedback draft with 2 goals', async () => {
    const { status, data } = await apiCall('POST', '/feedback', {
      toUserId: recipientId,
      reviewType: 'manager_review',
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
    }, authToken);

    if (status !== 201) {
      throw new Error(`Create failed with status ${status}: ${JSON.stringify(data)}`);
    }
    feedbackId = data.data.id;
    console.log(`   Created feedback: ${feedbackId}`);
  });

  // Step 3: Verify 2 goals exist
  let existingGoals: any[] = [];
  
  await test('4. Verify feedback has 2 goals', async () => {
    const { status, data } = await apiCall('GET', `/feedback/${feedbackId}`, undefined, authToken);
    if (status !== 200) {
      throw new Error(`Get failed: ${JSON.stringify(data)}`);
    }
    existingGoals = data.data.goals || [];
    console.log(`   Goals count: ${existingGoals.length}`);
    console.log(`   Goals: ${existingGoals.map((g: any) => g.title).join(', ')}`);
    
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
    }, authToken);

    if (status !== 200) {
      throw new Error(`Update failed with status ${status}: ${JSON.stringify(data)}`);
    }

    const returnedGoals = data.data.goals || [];
    console.log(`   Returned goals count: ${returnedGoals.length}`);
    console.log(`   Returned goals: ${returnedGoals.map((g: any) => g.title).join(', ') || '(none)'}`);

    if (returnedGoals.length !== 1) {
      throw new Error(`FAILED: Expected 1 goal in response, got ${returnedGoals.length}. Backend did not process goal update!`);
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
    console.log(`   Goals: ${currentGoals.map((g: any) => g.title).join(', ') || '(none)'}`);

    if (currentGoals.length !== 1) {
      throw new Error(`FAILED: Expected 1 goal after re-fetch, got ${currentGoals.length}. Goal deletion did NOT persist!`);
    }
    
    if (currentGoals[0].title !== 'Goal 1 - Keep this') {
      throw new Error(`FAILED: Wrong goal kept. Expected "Goal 1 - Keep this", got "${currentGoals[0].title}"`);
    }
  });

  // Summary
  console.log('\n' + '=' .repeat(60));
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


/**
 * Integration tests for whatDoYouNeedFromMe field persistence on SUBMIT
 * 
 * Bug Report: User fills in whatDoYouNeedFromMe field, submits feedback,
 * but the field is NOT stored in the database.
 * 
 * This test reproduces the exact user flow:
 * 1. Create feedback with whatDoYouNeedFromMe filled in
 * 2. Submit the feedback
 * 3. Verify the field is persisted
 */

import request from 'supertest';
import app from '../../../src/app';

describe('whatDoYouNeedFromMe field persistence on SUBMIT', () => {
  let authToken: string;
  let userId: string;
  let feedbackId: string;
  let cycleId: string;

  beforeAll(async () => {
    // Login to get auth token using mock login endpoint
    const loginResponse = await request(app)
      .post('/api/v1/auth/login/mock')
      .send({
        email: 'wdynfm-submit-test@wix.com',
        name: 'WDYNFM Submit Test User'
      });

    // Extract auth token from set-cookie header (cookie-based auth)
    authToken = loginResponse.headers['set-cookie']?.[0] || '';
    userId = loginResponse.body.user?.id;
    
    console.log('Auth setup:', { authToken: authToken?.substring(0, 50), userId });

    // Get or create an active cycle for testing
    const { query } = await import('../../../src/config/real-database.js');
    
    // Get any active cycle (or create one if none exists)
    const cycleResult = await query(
      `SELECT id FROM feedback_cycles WHERE status = 'active' LIMIT 1`
    );
    
    if (cycleResult.rows.length > 0) {
      cycleId = cycleResult.rows[0].id;
    } else {
      // Create a test cycle
      const newCycleResult = await query(
        `INSERT INTO feedback_cycles (name, description, start_date, end_date, status, created_at, updated_at)
         VALUES ('Test Cycle for WDYNFM', 'Test cycle', NOW(), NOW() + INTERVAL '30 days', 'active', NOW(), NOW())
         RETURNING id`
      );
      cycleId = newCycleResult.rows[0].id;
    }
    
    console.log('Using cycleId:', cycleId);
  });

  afterAll(async () => {
    // Cleanup: delete test feedback if created
    if (feedbackId && authToken) {
      try {
        await request(app)
          .delete(`/api/v1/feedback/${feedbackId}`)
          .set('Cookie', authToken);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  });

  it('should persist whatDoYouNeedFromMe when creating and immediately submitting feedback', async () => {
    const testWhatDoYouNeedFromMe = 'I need weekly 1:1 meetings and access to the analytics dashboard';

    // Step 1: Create feedback with whatDoYouNeedFromMe
    const createResponse = await request(app)
      .post('/api/v1/feedback')
      .set('Cookie', authToken)
      .send({
        cycleId: cycleId,
        toUserId: userId, // Self-assessment
        reviewType: 'self_assessment',
        content: {
          overallComment: 'Test feedback for whatDoYouNeedFromMe persistence',
          strengths: ['Test strength'],
          areasForImprovement: ['Test area'],
          recommendations: ['Test recommendation'],
          whatDoYouNeedFromMe: testWhatDoYouNeedFromMe,
          bottomLine: 'Test bottom line',
          confidential: false,
        },
      });

    console.log('Create response status:', createResponse.status);
    console.log('Create response body:', JSON.stringify(createResponse.body, null, 2));

    expect(createResponse.status).toBe(201);
    feedbackId = createResponse.body.data?.id;
    expect(feedbackId).toBeDefined();

    // CRITICAL CHECK 1: Verify whatDoYouNeedFromMe in CREATE response
    expect(createResponse.body.data.content.whatDoYouNeedFromMe).toBe(testWhatDoYouNeedFromMe);

    // Step 2: Submit the feedback
    const submitResponse = await request(app)
      .post(`/api/v1/feedback/${feedbackId}/submit`)
      .set('Cookie', authToken);

    console.log('Submit response status:', submitResponse.status);
    console.log('Submit response body:', JSON.stringify(submitResponse.body, null, 2));

    expect(submitResponse.status).toBe(200);

    // CRITICAL CHECK 2: Verify whatDoYouNeedFromMe in SUBMIT response
    expect(submitResponse.body.data.content.whatDoYouNeedFromMe).toBe(testWhatDoYouNeedFromMe);

    // Step 3: Fetch the feedback to verify persistence
    const getResponse = await request(app)
      .get(`/api/v1/feedback/${feedbackId}`)
      .set('Cookie', authToken);

    console.log('Get response status:', getResponse.status);
    console.log('Get response body:', JSON.stringify(getResponse.body, null, 2));

    expect(getResponse.status).toBe(200);

    // CRITICAL CHECK 3: Verify whatDoYouNeedFromMe persisted after GET
    expect(getResponse.body.data.content.whatDoYouNeedFromMe).toBe(testWhatDoYouNeedFromMe);
  });

  it('should persist whatDoYouNeedFromMe in the database JSON content', async () => {
    const testWhatDoYouNeedFromMe = 'Database persistence test - need mentorship';

    // Create feedback
    const createResponse = await request(app)
      .post('/api/v1/feedback')
      .set('Cookie', authToken)
      .send({
        cycleId: cycleId,
        toUserId: userId,
        reviewType: 'self_assessment',
        content: {
          overallComment: 'Database persistence test',
          whatDoYouNeedFromMe: testWhatDoYouNeedFromMe,
          confidential: false,
        },
      });

    expect(createResponse.status).toBe(201);
    const testFeedbackId = createResponse.body.data?.id;

    // Verify the field is in the response
    const responseContent = createResponse.body.data?.content;
    console.log('Response content fields:', Object.keys(responseContent || {}));
    console.log('whatDoYouNeedFromMe in response:', responseContent?.whatDoYouNeedFromMe);

    // This is the critical assertion - does the response include whatDoYouNeedFromMe?
    expect(responseContent).toHaveProperty('whatDoYouNeedFromMe');
    expect(responseContent.whatDoYouNeedFromMe).toBe(testWhatDoYouNeedFromMe);

    // Verify in database directly
    const { query } = await import('../../../src/config/real-database.js');
    const dbResult = await query(
      'SELECT content FROM feedback_responses WHERE id = $1',
      [testFeedbackId]
    );
    
    const dbContent = typeof dbResult.rows[0]?.content === 'string' 
      ? JSON.parse(dbResult.rows[0].content) 
      : dbResult.rows[0]?.content;
    
    console.log('Database content:', JSON.stringify(dbContent, null, 2));
    
    // CRITICAL: Check if the field exists in the database
    expect(dbContent).toHaveProperty('whatDoYouNeedFromMe');
    expect(dbContent.whatDoYouNeedFromMe).toBe(testWhatDoYouNeedFromMe);

    // Cleanup
    if (testFeedbackId) {
      await request(app)
        .delete(`/api/v1/feedback/${testFeedbackId}`)
        .set('Cookie', authToken);
    }
  });

  it('should NOT lose whatDoYouNeedFromMe when bottomLine is also provided', async () => {
    // This test checks if both optional fields are preserved together
    const testWhatDoYouNeedFromMe = 'I need training on the new tools';
    const testBottomLine = 'Keep up the great work';

    const createResponse = await request(app)
      .post('/api/v1/feedback')
      .set('Cookie', authToken)
      .send({
        cycleId: cycleId,
        toUserId: userId,
        reviewType: 'self_assessment',
        content: {
          overallComment: 'Test both optional fields',
          whatDoYouNeedFromMe: testWhatDoYouNeedFromMe,
          bottomLine: testBottomLine,
          confidential: false,
        },
      });

    expect(createResponse.status).toBe(201);
    const testFeedbackId = createResponse.body.data?.id;

    // BOTH fields should be present
    expect(createResponse.body.data.content.whatDoYouNeedFromMe).toBe(testWhatDoYouNeedFromMe);
    expect(createResponse.body.data.content.bottomLine).toBe(testBottomLine);

    // Cleanup
    if (testFeedbackId) {
      await request(app)
        .delete(`/api/v1/feedback/${testFeedbackId}`)
        .set('Cookie', authToken);
    }
  });
});

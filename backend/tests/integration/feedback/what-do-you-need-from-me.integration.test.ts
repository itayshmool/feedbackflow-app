// backend/tests/integration/feedback/what-do-you-need-from-me.integration.test.ts
// Tests for "What Do You Need From Me" field persistence across all API endpoints
// 
// BUG REPORT: The whatDoYouNeedFromMe field is NOT returned in API responses,
// causing the field to "disappear" after saving.
//
// These tests are expected to FAIL until the bug is fixed in:
// - backend/src/real-database-server.ts (5 locations)

import request from 'supertest';
import { Express } from 'express';

// Enable mock login for testing
process.env.ENABLE_MOCK_LOGIN = 'true';

describe('What Do You Need From Me Field - Bug Regression Tests', () => {
  let app: Express;
  let authToken: string;
  let recipientId: string;

  const TEST_WHAT_DO_YOU_NEED_VALUE = 'I need weekly check-ins and more resources for the project.';
  const UPDATED_WHAT_DO_YOU_NEED_VALUE = 'Updated: Need daily standups and access to the design system.';

  beforeAll(async () => {
    // Import the app (real-database-server.ts)
    const { app: testApp } = await import('../../../src/real-database-server.js');
    app = testApp;

    // Login as giver (must use @wix.com domain) - get Bearer token
    const loginResponse = await request(app)
      .post('/api/v1/auth/login/mock')
      .send({
        email: 'wdynfm-test-giver@wix.com',
        password: 'test123'  // Password is required
      });

    // Token is in data.token, not directly in body.token
    authToken = loginResponse.body.data?.token;

    // Login as recipient
    const recipientResponse = await request(app)
      .post('/api/v1/auth/login/mock')
      .send({
        email: 'wdynfm-test-recipient@wix.com',
        password: 'test123'  // Password is required
      });
    recipientId = recipientResponse.body.data?.user?.id;
  });

  // ====================================================================================
  // BUG #1: POST /api/v1/feedback - Create feedback response missing whatDoYouNeedFromMe
  // ====================================================================================
  describe('BUG #1: POST /api/v1/feedback - Create Response', () => {
    it('should return whatDoYouNeedFromMe in CREATE response when provided', async () => {
      const createResponse = await request(app)
        .post('/api/v1/feedback')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          recipientId: recipientId,
          reviewType: 'manager_review',
          content: {
            overallComment: 'Great work on the project',
            strengths: ['Leadership', 'Communication'],
            areasForImprovement: ['Time management'],
            specificExamples: ['Led the Q4 initiative successfully'],
            recommendations: ['Consider delegation'],
            whatDoYouNeedFromMe: TEST_WHAT_DO_YOU_NEED_VALUE,
            bottomLine: 'Excellent performance overall',
            confidential: false
          },
          goals: []
        });

      expect(createResponse.status).toBe(201);
      
      // THIS SHOULD FAIL - Bug: whatDoYouNeedFromMe is NOT in the response
      expect(createResponse.body.data.content).toBeDefined();
      expect(createResponse.body.data.content.whatDoYouNeedFromMe).toBe(TEST_WHAT_DO_YOU_NEED_VALUE);
    });
  });

  // ====================================================================================
  // BUG #2: GET /api/v1/feedback/:id - Get by ID response missing whatDoYouNeedFromMe
  // ====================================================================================
  describe('BUG #2: GET /api/v1/feedback/:id - Get By ID Response', () => {
    let feedbackId: string;

    beforeAll(async () => {
      // Create feedback with whatDoYouNeedFromMe field
      const createResponse = await request(app)
        .post('/api/v1/feedback')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          recipientId: recipientId,
          reviewType: 'manager_review',
          content: {
            overallComment: 'Test for GET by ID',
            strengths: ['Testing'],
            areasForImprovement: [],
            specificExamples: [],
            recommendations: [],
            whatDoYouNeedFromMe: TEST_WHAT_DO_YOU_NEED_VALUE,
            confidential: false
          },
          goals: []
        });

      expect(createResponse.status).toBe(201);
      feedbackId = createResponse.body.data.id;
    });

    it('should return whatDoYouNeedFromMe when fetching feedback by ID', async () => {
      const getResponse = await request(app)
        .get(`/api/v1/feedback/${feedbackId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // THIS SHOULD FAIL - Bug: whatDoYouNeedFromMe is NOT in the response
      expect(getResponse.body.data.content).toBeDefined();
      expect(getResponse.body.data.content.whatDoYouNeedFromMe).toBe(TEST_WHAT_DO_YOU_NEED_VALUE);
    });
  });

  // ====================================================================================
  // BUG #3: GET /api/v1/feedback - List feedback response missing whatDoYouNeedFromMe
  // ====================================================================================
  describe('BUG #3: GET /api/v1/feedback - List Response', () => {
    let listTestFeedbackId: string;

    beforeAll(async () => {
      // Create feedback with unique content for list test
      const createResponse = await request(app)
        .post('/api/v1/feedback')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          recipientId: recipientId,
          reviewType: 'manager_review',
          content: {
            overallComment: 'Unique content for list test - 12345',
            strengths: ['List testing'],
            areasForImprovement: [],
            specificExamples: [],
            recommendations: [],
            whatDoYouNeedFromMe: 'LIST TEST: ' + TEST_WHAT_DO_YOU_NEED_VALUE,
            confidential: false
          },
          goals: []
        });

      expect(createResponse.status).toBe(201);
      listTestFeedbackId = createResponse.body.data.id;
    });

    it('should return whatDoYouNeedFromMe in list response for each feedback item', async () => {
      const listResponse = await request(app)
        .get('/api/v1/feedback')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(listResponse.body.data).toBeDefined();
      expect(Array.isArray(listResponse.body.data)).toBe(true);

      // Find our test feedback in the list
      const testFeedback = listResponse.body.data.find(
        (f: any) => f.id === listTestFeedbackId
      );

      expect(testFeedback).toBeDefined();
      
      // THIS SHOULD FAIL - Bug: whatDoYouNeedFromMe is NOT in the list response
      expect(testFeedback.content).toBeDefined();
      expect(testFeedback.content.whatDoYouNeedFromMe).toBe('LIST TEST: ' + TEST_WHAT_DO_YOU_NEED_VALUE);
    });
  });

  // ====================================================================================
  // BUG #4: PUT /api/v1/feedback/:id - Update response missing whatDoYouNeedFromMe
  // ====================================================================================
  describe('BUG #4: PUT /api/v1/feedback/:id - Update Response', () => {
    let updateTestFeedbackId: string;

    beforeAll(async () => {
      // Create feedback without whatDoYouNeedFromMe initially
      const createResponse = await request(app)
        .post('/api/v1/feedback')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          recipientId: recipientId,
          reviewType: 'manager_review',
          content: {
            overallComment: 'Initial content for update test',
            strengths: ['Will be updated'],
            areasForImprovement: [],
            specificExamples: [],
            recommendations: [],
            confidential: false
          },
          goals: []
        });

      expect(createResponse.status).toBe(201);
      updateTestFeedbackId = createResponse.body.data.id;
    });

    it('should return whatDoYouNeedFromMe in UPDATE response when field is added', async () => {
      const updateResponse = await request(app)
        .put(`/api/v1/feedback/${updateTestFeedbackId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: {
            overallComment: 'Updated content',
            strengths: ['Updated strengths'],
            areasForImprovement: [],
            specificExamples: [],
            recommendations: [],
            whatDoYouNeedFromMe: UPDATED_WHAT_DO_YOU_NEED_VALUE,
            confidential: false
          }
        })
        .expect(200);

      // THIS SHOULD FAIL - Bug: whatDoYouNeedFromMe is NOT in the update response
      expect(updateResponse.body.data.content).toBeDefined();
      expect(updateResponse.body.data.content.whatDoYouNeedFromMe).toBe(UPDATED_WHAT_DO_YOU_NEED_VALUE);
    });

    it('should persist whatDoYouNeedFromMe after update when fetched again', async () => {
      // Create another feedback for this specific test
      const createResponse = await request(app)
        .post('/api/v1/feedback')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          recipientId: recipientId,
          reviewType: 'manager_review',
          content: {
            overallComment: 'For persistence test',
            strengths: ['Persistence'],
            areasForImprovement: [],
            specificExamples: [],
            recommendations: [],
            confidential: false
          },
          goals: []
        });

      const persistTestId = createResponse.body.data.id;

      // Update to add the field
      await request(app)
        .put(`/api/v1/feedback/${persistTestId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: {
            overallComment: 'Updated for persistence test',
            strengths: ['Persistence'],
            areasForImprovement: [],
            specificExamples: [],
            recommendations: [],
            whatDoYouNeedFromMe: 'PERSISTENCE TEST VALUE',
            confidential: false
          }
        });

      // Fetch the feedback again
      const getResponse = await request(app)
        .get(`/api/v1/feedback/${persistTestId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // THIS SHOULD FAIL - Bug: whatDoYouNeedFromMe disappears after edit
      expect(getResponse.body.data.content).toBeDefined();
      expect(getResponse.body.data.content.whatDoYouNeedFromMe).toBe('PERSISTENCE TEST VALUE');
    });
  });

  // ====================================================================================
  // BUG #5: POST /api/v1/feedback/:id/submit - Submit response missing whatDoYouNeedFromMe
  // ====================================================================================
  describe('BUG #5: POST /api/v1/feedback/:id/submit - Submit Response', () => {
    let submitTestFeedbackId: string;

    beforeAll(async () => {
      // Create a draft feedback with whatDoYouNeedFromMe
      const createResponse = await request(app)
        .post('/api/v1/feedback')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          recipientId: recipientId,
          reviewType: 'manager_review',
          content: {
            overallComment: 'Feedback ready for submission',
            strengths: ['Submission test'],
            areasForImprovement: ['Areas for improvement'],
            specificExamples: [],
            recommendations: ['Recommendations'],
            whatDoYouNeedFromMe: 'SUBMIT TEST: ' + TEST_WHAT_DO_YOU_NEED_VALUE,
            bottomLine: 'Bottom line for submission',
            confidential: false
          },
          goals: []
        });

      expect(createResponse.status).toBe(201);
      submitTestFeedbackId = createResponse.body.data.id;
    });

    it('should return whatDoYouNeedFromMe in SUBMIT response', async () => {
      const submitResponse = await request(app)
        .post(`/api/v1/feedback/${submitTestFeedbackId}/submit`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // THIS SHOULD FAIL - Bug: whatDoYouNeedFromMe is NOT in the submit response
      expect(submitResponse.body.data.content).toBeDefined();
      expect(submitResponse.body.data.content.whatDoYouNeedFromMe).toBe('SUBMIT TEST: ' + TEST_WHAT_DO_YOU_NEED_VALUE);
    });
  });

  // ====================================================================================
  // CRITICAL SCENARIO: Full user workflow (create → edit → save → view)
  // ====================================================================================
  describe('CRITICAL: Full User Workflow - Create, Edit, Save, View', () => {
    it('should preserve whatDoYouNeedFromMe through complete edit-save-view cycle', async () => {
      // Step 1: Create feedback WITHOUT whatDoYouNeedFromMe (simulating initial creation)
      const createResponse = await request(app)
        .post('/api/v1/feedback')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          recipientId: recipientId,
          reviewType: 'manager_review',
          content: {
            overallComment: 'Initial creation without WDYNFM',
            strengths: ['Initial strength'],
            areasForImprovement: [],
            specificExamples: [],
            recommendations: [],
            confidential: false
          },
          goals: []
        });

      expect(createResponse.status).toBe(201);
      const workflowFeedbackId = createResponse.body.data.id;

      // Step 2: Edit feedback to ADD whatDoYouNeedFromMe (simulating user editing a draft)
      const updateResponse = await request(app)
        .put(`/api/v1/feedback/${workflowFeedbackId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: {
            overallComment: 'Updated with WDYNFM',
            strengths: ['Initial strength'],
            areasForImprovement: [],
            specificExamples: [],
            recommendations: [],
            whatDoYouNeedFromMe: 'WORKFLOW: Need weekly sync meetings',
            confidential: false
          }
        });

      expect(updateResponse.status).toBe(200);

      // Step 3: View the feedback (simulating user viewing after save)
      const viewResponse = await request(app)
        .get(`/api/v1/feedback/${workflowFeedbackId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // THIS IS THE CRITICAL ASSERTION - THIS IS WHAT THE USER REPORTED AS BROKEN
      // The field should still be there after the edit-save-view cycle
      expect(viewResponse.body.data.content).toBeDefined();
      expect(viewResponse.body.data.content.whatDoYouNeedFromMe).toBe('WORKFLOW: Need weekly sync meetings');
    });
  });
});

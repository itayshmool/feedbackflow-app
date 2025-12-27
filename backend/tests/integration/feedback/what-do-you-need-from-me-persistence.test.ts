/**
 * Integration tests for whatDoYouNeedFromMe field persistence
 * 
 * These tests verify the COMPLETE flow:
 * 1. CREATE - Field is saved to database
 * 2. READ - Field is returned in API response
 * 3. UPDATE - Field can be modified and persists
 * 4. SUBMIT - Field persists after submission
 * 
 * Each test queries the DATABASE DIRECTLY to verify storage,
 * not just the API response.
 */

import request from 'supertest';
import app from '../../../src/app';
import { query } from '../../../src/config/real-database';

describe('whatDoYouNeedFromMe field - COMPLETE persistence tests', () => {
  let authCookie: string;
  let userId: string;
  let cycleId: string;
  const createdFeedbackIds: string[] = [];

  beforeAll(async () => {
    // Login to get auth cookie
    const loginResponse = await request(app)
      .post('/api/v1/auth/login/mock')
      .send({
        email: 'wdynfm-persistence-test@wix.com',
        name: 'WDYNFM Persistence Test User'
      });

    authCookie = loginResponse.headers['set-cookie']?.[0] || '';
    userId = loginResponse.body.user?.id;

    // Get an active cycle
    const cycleResult = await query(
      `SELECT id FROM feedback_cycles WHERE status = 'active' LIMIT 1`
    );
    
    if (cycleResult.rows.length > 0) {
      cycleId = cycleResult.rows[0].id;
    } else {
      // Create a test cycle if none exists
      const newCycleResult = await query(
        `INSERT INTO feedback_cycles (name, description, start_date, end_date, status, created_at, updated_at)
         VALUES ('WDYNFM Test Cycle', 'Test cycle for whatDoYouNeedFromMe', NOW(), NOW() + INTERVAL '30 days', 'active', NOW(), NOW())
         RETURNING id`
      );
      cycleId = newCycleResult.rows[0].id;
    }

    console.log('Test setup complete:', { userId, cycleId, hasAuth: !!authCookie });
  });

  afterAll(async () => {
    // Cleanup all created feedback
    for (const id of createdFeedbackIds) {
      try {
        await query('DELETE FROM feedback_goals WHERE feedback_response_id = $1', [id]);
        await query('DELETE FROM feedback_responses WHERE id = $1', [id]);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  });

  describe('CREATE - whatDoYouNeedFromMe storage', () => {
    it('should store whatDoYouNeedFromMe in database when provided', async () => {
      const testValue = 'CREATE TEST: I need weekly 1:1 meetings - ' + Date.now();

      // Create feedback via API
      const createResponse = await request(app)
        .post('/api/v1/feedback')
        .set('Cookie', authCookie)
        .send({
          cycleId,
          toUserId: userId,
          reviewType: 'self_assessment',
          content: {
            overallComment: 'Test feedback',
            whatDoYouNeedFromMe: testValue,
            confidential: false,
          },
        });

      // If 201, verify. If other status, log and fail with details
      if (createResponse.status !== 201) {
        console.log('CREATE failed:', createResponse.status, createResponse.body);
      }
      expect(createResponse.status).toBe(201);

      const feedbackId = createResponse.body.data?.id;
      expect(feedbackId).toBeDefined();
      createdFeedbackIds.push(feedbackId);

      // CRITICAL: Query database directly to verify storage
      const dbResult = await query(
        'SELECT content FROM feedback_responses WHERE id = $1',
        [feedbackId]
      );

      expect(dbResult.rows.length).toBe(1);
      
      const dbContent = typeof dbResult.rows[0].content === 'string'
        ? JSON.parse(dbResult.rows[0].content)
        : dbResult.rows[0].content;

      console.log('Database content:', JSON.stringify(dbContent, null, 2));

      // THE CRITICAL ASSERTION - is it in the database?
      expect(dbContent).toHaveProperty('whatDoYouNeedFromMe');
      expect(dbContent.whatDoYouNeedFromMe).toBe(testValue);
    });

    it('should return whatDoYouNeedFromMe in CREATE API response', async () => {
      const testValue = 'CREATE RESPONSE TEST: Need mentorship - ' + Date.now();

      const createResponse = await request(app)
        .post('/api/v1/feedback')
        .set('Cookie', authCookie)
        .send({
          cycleId,
          toUserId: userId,
          reviewType: 'self_assessment',
          content: {
            overallComment: 'Test feedback',
            whatDoYouNeedFromMe: testValue,
            bottomLine: 'Test bottom line',
            confidential: false,
          },
        });

      if (createResponse.status !== 201) {
        console.log('CREATE failed:', createResponse.status, createResponse.body);
      }
      expect(createResponse.status).toBe(201);

      const feedbackId = createResponse.body.data?.id;
      createdFeedbackIds.push(feedbackId);

      // Verify API response includes the field
      expect(createResponse.body.data.content).toHaveProperty('whatDoYouNeedFromMe');
      expect(createResponse.body.data.content.whatDoYouNeedFromMe).toBe(testValue);
    });
  });

  describe('READ - whatDoYouNeedFromMe retrieval', () => {
    let testFeedbackId: string;
    const testValue = 'READ TEST: Need resources - ' + Date.now();

    beforeAll(async () => {
      // Create a feedback to read
      const createResponse = await request(app)
        .post('/api/v1/feedback')
        .set('Cookie', authCookie)
        .send({
          cycleId,
          toUserId: userId,
          reviewType: 'self_assessment',
          content: {
            overallComment: 'Test for reading',
            whatDoYouNeedFromMe: testValue,
            confidential: false,
          },
        });

      testFeedbackId = createResponse.body.data?.id;
      createdFeedbackIds.push(testFeedbackId);
    });

    it('should return whatDoYouNeedFromMe in GET by ID response', async () => {
      const getResponse = await request(app)
        .get(`/api/v1/feedback/${testFeedbackId}`)
        .set('Cookie', authCookie);

      expect(getResponse.status).toBe(200);
      expect(getResponse.body.data.content).toHaveProperty('whatDoYouNeedFromMe');
      expect(getResponse.body.data.content.whatDoYouNeedFromMe).toBe(testValue);
    });

    it('should return whatDoYouNeedFromMe in list response', async () => {
      const listResponse = await request(app)
        .get('/api/v1/feedback')
        .set('Cookie', authCookie);

      expect(listResponse.status).toBe(200);
      
      // Find our test feedback in the list
      const feedbacks = listResponse.body.data || [];
      const ourFeedback = feedbacks.find((f: any) => f.id === testFeedbackId);
      
      expect(ourFeedback).toBeDefined();
      expect(ourFeedback.content).toHaveProperty('whatDoYouNeedFromMe');
      expect(ourFeedback.content.whatDoYouNeedFromMe).toBe(testValue);
    });
  });

  describe('UPDATE - whatDoYouNeedFromMe modification', () => {
    let testFeedbackId: string;
    const initialValue = 'UPDATE INITIAL: Initial value - ' + Date.now();
    const updatedValue = 'UPDATE MODIFIED: Modified value - ' + Date.now();

    beforeAll(async () => {
      // Create a draft feedback to update
      const createResponse = await request(app)
        .post('/api/v1/feedback')
        .set('Cookie', authCookie)
        .send({
          cycleId,
          toUserId: userId,
          reviewType: 'self_assessment',
          content: {
            overallComment: 'Test for updating',
            whatDoYouNeedFromMe: initialValue,
            confidential: false,
          },
        });

      testFeedbackId = createResponse.body.data?.id;
      createdFeedbackIds.push(testFeedbackId);
    });

    it('should update whatDoYouNeedFromMe in database when modified', async () => {
      // Update the feedback
      const updateResponse = await request(app)
        .put(`/api/v1/feedback/${testFeedbackId}`)
        .set('Cookie', authCookie)
        .send({
          content: {
            overallComment: 'Updated comment',
            whatDoYouNeedFromMe: updatedValue,
            confidential: false,
          },
        });

      if (updateResponse.status !== 200) {
        console.log('UPDATE failed:', updateResponse.status, updateResponse.body);
      }
      expect(updateResponse.status).toBe(200);

      // CRITICAL: Query database directly to verify update
      const dbResult = await query(
        'SELECT content FROM feedback_responses WHERE id = $1',
        [testFeedbackId]
      );

      const dbContent = typeof dbResult.rows[0].content === 'string'
        ? JSON.parse(dbResult.rows[0].content)
        : dbResult.rows[0].content;

      console.log('Database content after update:', JSON.stringify(dbContent, null, 2));

      expect(dbContent.whatDoYouNeedFromMe).toBe(updatedValue);
    });

    it('should return updated whatDoYouNeedFromMe in UPDATE response', async () => {
      const newValue = 'UPDATE RESPONSE: New value - ' + Date.now();

      const updateResponse = await request(app)
        .put(`/api/v1/feedback/${testFeedbackId}`)
        .set('Cookie', authCookie)
        .send({
          content: {
            overallComment: 'Another update',
            whatDoYouNeedFromMe: newValue,
            confidential: false,
          },
        });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.data.content.whatDoYouNeedFromMe).toBe(newValue);
    });

    it('should preserve whatDoYouNeedFromMe when updating other fields only', async () => {
      // First set a value
      const preservedValue = 'PRESERVE TEST: Should stay - ' + Date.now();
      
      await request(app)
        .put(`/api/v1/feedback/${testFeedbackId}`)
        .set('Cookie', authCookie)
        .send({
          content: {
            overallComment: 'Set the value',
            whatDoYouNeedFromMe: preservedValue,
            confidential: false,
          },
        });

      // Now update only overallComment, not whatDoYouNeedFromMe
      const updateResponse = await request(app)
        .put(`/api/v1/feedback/${testFeedbackId}`)
        .set('Cookie', authCookie)
        .send({
          content: {
            overallComment: 'Only updating this field',
            confidential: false,
          },
        });

      expect(updateResponse.status).toBe(200);

      // Verify in database that whatDoYouNeedFromMe was preserved
      const dbResult = await query(
        'SELECT content FROM feedback_responses WHERE id = $1',
        [testFeedbackId]
      );

      const dbContent = typeof dbResult.rows[0].content === 'string'
        ? JSON.parse(dbResult.rows[0].content)
        : dbResult.rows[0].content;

      expect(dbContent.whatDoYouNeedFromMe).toBe(preservedValue);
    });
  });

  describe('SUBMIT - whatDoYouNeedFromMe after submission', () => {
    it('should preserve whatDoYouNeedFromMe after submitting feedback', async () => {
      const testValue = 'SUBMIT TEST: Should persist after submit - ' + Date.now();

      // Create feedback
      const createResponse = await request(app)
        .post('/api/v1/feedback')
        .set('Cookie', authCookie)
        .send({
          cycleId,
          toUserId: userId,
          reviewType: 'self_assessment',
          content: {
            overallComment: 'Test for submission',
            whatDoYouNeedFromMe: testValue,
            bottomLine: 'Test bottom line',
            confidential: false,
          },
        });

      expect(createResponse.status).toBe(201);
      const feedbackId = createResponse.body.data?.id;
      createdFeedbackIds.push(feedbackId);

      // Submit the feedback
      const submitResponse = await request(app)
        .post(`/api/v1/feedback/${feedbackId}/submit`)
        .set('Cookie', authCookie);

      if (submitResponse.status !== 200) {
        console.log('SUBMIT failed:', submitResponse.status, submitResponse.body);
      }
      expect(submitResponse.status).toBe(200);

      // Verify in SUBMIT response
      expect(submitResponse.body.data.content.whatDoYouNeedFromMe).toBe(testValue);

      // CRITICAL: Verify in database after submission
      const dbResult = await query(
        'SELECT content FROM feedback_responses WHERE id = $1',
        [feedbackId]
      );

      const dbContent = typeof dbResult.rows[0].content === 'string'
        ? JSON.parse(dbResult.rows[0].content)
        : dbResult.rows[0].content;

      expect(dbContent.whatDoYouNeedFromMe).toBe(testValue);

      // Also verify via GET after submission
      const getResponse = await request(app)
        .get(`/api/v1/feedback/${feedbackId}`)
        .set('Cookie', authCookie);

      expect(getResponse.status).toBe(200);
      expect(getResponse.body.data.content.whatDoYouNeedFromMe).toBe(testValue);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty whatDoYouNeedFromMe (not stored)', async () => {
      const createResponse = await request(app)
        .post('/api/v1/feedback')
        .set('Cookie', authCookie)
        .send({
          cycleId,
          toUserId: userId,
          reviewType: 'self_assessment',
          content: {
            overallComment: 'Test without whatDoYouNeedFromMe',
            whatDoYouNeedFromMe: '', // Empty string
            confidential: false,
          },
        });

      expect(createResponse.status).toBe(201);
      const feedbackId = createResponse.body.data?.id;
      createdFeedbackIds.push(feedbackId);

      // Empty string should be converted to undefined (not stored)
      const dbResult = await query(
        'SELECT content FROM feedback_responses WHERE id = $1',
        [feedbackId]
      );

      const dbContent = typeof dbResult.rows[0].content === 'string'
        ? JSON.parse(dbResult.rows[0].content)
        : dbResult.rows[0].content;

      // Empty strings should NOT be stored
      expect(dbContent.whatDoYouNeedFromMe).toBeUndefined();
    });

    it('should store both whatDoYouNeedFromMe and bottomLine together', async () => {
      const whatDoYouNeedValue = 'BOTH TEST: Need meetings - ' + Date.now();
      const bottomLineValue = 'BOTH TEST: Keep it up - ' + Date.now();

      const createResponse = await request(app)
        .post('/api/v1/feedback')
        .set('Cookie', authCookie)
        .send({
          cycleId,
          toUserId: userId,
          reviewType: 'self_assessment',
          content: {
            overallComment: 'Test both fields',
            whatDoYouNeedFromMe: whatDoYouNeedValue,
            bottomLine: bottomLineValue,
            confidential: false,
          },
        });

      expect(createResponse.status).toBe(201);
      const feedbackId = createResponse.body.data?.id;
      createdFeedbackIds.push(feedbackId);

      // Verify both in database
      const dbResult = await query(
        'SELECT content FROM feedback_responses WHERE id = $1',
        [feedbackId]
      );

      const dbContent = typeof dbResult.rows[0].content === 'string'
        ? JSON.parse(dbResult.rows[0].content)
        : dbResult.rows[0].content;

      expect(dbContent.whatDoYouNeedFromMe).toBe(whatDoYouNeedValue);
      expect(dbContent.bottomLine).toBe(bottomLineValue);
    });
  });
});


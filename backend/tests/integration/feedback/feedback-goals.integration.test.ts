// backend/tests/integration/feedback/feedback-goals.integration.test.ts
// Tests for feedback goal update functionality

import request from 'supertest';
import app from '../../../src/app';

describe('Feedback Goals Update Integration', () => {
  let authToken: string;
  let userId: string;
  let feedbackId: string;
  let recipientId: string;

  beforeAll(async () => {
    // Get auth token using mock login
    const loginResponse = await request(app)
      .post('/api/v1/auth/login/mock')
      .send({
        email: 'goals-test-giver@example.com',
        name: 'Goals Test Giver'
      });

    authToken = loginResponse.body.token;
    userId = loginResponse.body.user.id;

    // Create a recipient user
    const recipientResponse = await request(app)
      .post('/api/v1/auth/login/mock')
      .send({
        email: 'goals-test-recipient@example.com',
        name: 'Goals Test Recipient'
      });
    recipientId = recipientResponse.body.user.id;
  });

  describe('PUT /api/v1/feedback/:id - Goal Updates', () => {
    
    beforeEach(async () => {
      // Create a draft feedback with 2 goals before each test
      const createResponse = await request(app)
        .post('/api/v1/feedback')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          toUserId: recipientId,
          reviewType: 'manager_review',
          content: {
            overallComment: 'Test feedback with goals',
            strengths: ['Test strength'],
            areasForImprovement: ['Test area'],
            specificExamples: [],
            recommendations: [],
            confidential: false
          },
          goals: [
            {
              title: 'Goal 1 - Should be kept',
              description: 'First goal description',
              category: 'career_development',
              priority: 'high',
              targetDate: '2025-06-01'
            },
            {
              title: 'Goal 2 - Should be deleted',
              description: 'Second goal description',
              category: 'technical_skills',
              priority: 'medium',
              targetDate: '2025-06-15'
            }
          ]
        });

      expect(createResponse.status).toBe(201);
      feedbackId = createResponse.body.data.id;
    });

    it('should return created feedback with 2 goals', async () => {
      // Verify the feedback was created with goals
      const getResponse = await request(app)
        .get(`/api/v1/feedback/${feedbackId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(getResponse.body.data.goals).toHaveLength(2);
      expect(getResponse.body.data.goals[0].title).toBe('Goal 1 - Should be kept');
      expect(getResponse.body.data.goals[1].title).toBe('Goal 2 - Should be deleted');
    });

    it('should update goals when one is removed', async () => {
      // Get current feedback to get goal IDs
      const getResponse = await request(app)
        .get(`/api/v1/feedback/${feedbackId}`)
        .set('Authorization', `Bearer ${authToken}`);

      const existingGoals = getResponse.body.data.goals;
      expect(existingGoals).toHaveLength(2);

      // Keep only the first goal (remove the second)
      const keptGoal = existingGoals[0];

      // Update feedback with only 1 goal
      const updateResponse = await request(app)
        .put(`/api/v1/feedback/${feedbackId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: {
            overallComment: 'Updated feedback',
            strengths: ['Test strength'],
            areasForImprovement: ['Test area'],
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
        })
        .expect(200);

      // The response should contain only 1 goal
      expect(updateResponse.body.data.goals).toHaveLength(1);
      expect(updateResponse.body.data.goals[0].title).toBe('Goal 1 - Should be kept');
    });

    it('should persist goal deletion after update', async () => {
      // Get current feedback to get goal IDs
      const getResponse = await request(app)
        .get(`/api/v1/feedback/${feedbackId}`)
        .set('Authorization', `Bearer ${authToken}`);

      const existingGoals = getResponse.body.data.goals;
      const keptGoal = existingGoals[0];

      // Update feedback with only 1 goal
      await request(app)
        .put(`/api/v1/feedback/${feedbackId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: {
            overallComment: 'Updated feedback',
            strengths: ['Test strength'],
            areasForImprovement: ['Test area'],
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
        });

      // Fetch feedback again to verify persistence
      const verifyResponse = await request(app)
        .get(`/api/v1/feedback/${feedbackId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Should still have only 1 goal after re-fetching
      expect(verifyResponse.body.data.goals).toHaveLength(1);
      expect(verifyResponse.body.data.goals[0].title).toBe('Goal 1 - Should be kept');
    });

    it('should allow adding new goals during update', async () => {
      // Get current feedback
      const getResponse = await request(app)
        .get(`/api/v1/feedback/${feedbackId}`)
        .set('Authorization', `Bearer ${authToken}`);

      const existingGoals = getResponse.body.data.goals;

      // Update with existing goals + 1 new goal
      const updateResponse = await request(app)
        .put(`/api/v1/feedback/${feedbackId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: {
            overallComment: 'Updated feedback with new goal',
            strengths: ['Test strength'],
            areasForImprovement: ['Test area'],
            specificExamples: [],
            recommendations: [],
            confidential: false
          },
          goals: [
            ...existingGoals.map((g: any) => ({
              id: g.id,
              title: g.title,
              description: g.description,
              category: g.category || 'career_development',
              priority: g.priority || 'medium',
              targetDate: g.targetDate?.split('T')[0] || '2025-06-01'
            })),
            {
              // New goal without ID
              title: 'Goal 3 - Newly added',
              description: 'Third goal added during update',
              category: 'leadership',
              priority: 'low',
              targetDate: '2025-07-01'
            }
          ]
        })
        .expect(200);

      // Should have 3 goals now
      expect(updateResponse.body.data.goals).toHaveLength(3);
    });

    it('should allow updating goal title and description', async () => {
      // Get current feedback
      const getResponse = await request(app)
        .get(`/api/v1/feedback/${feedbackId}`)
        .set('Authorization', `Bearer ${authToken}`);

      const existingGoals = getResponse.body.data.goals;
      const goalToUpdate = existingGoals[0];

      // Update with modified goal
      const updateResponse = await request(app)
        .put(`/api/v1/feedback/${feedbackId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: {
            overallComment: 'Updated feedback',
            strengths: ['Test strength'],
            areasForImprovement: ['Test area'],
            specificExamples: [],
            recommendations: [],
            confidential: false
          },
          goals: [
            {
              id: goalToUpdate.id,
              title: 'Updated Goal Title',
              description: 'Updated goal description',
              category: goalToUpdate.category || 'career_development',
              priority: goalToUpdate.priority || 'high',
              targetDate: goalToUpdate.targetDate?.split('T')[0] || '2025-06-01'
            },
            {
              id: existingGoals[1].id,
              title: existingGoals[1].title,
              description: existingGoals[1].description,
              category: existingGoals[1].category || 'technical_skills',
              priority: existingGoals[1].priority || 'medium',
              targetDate: existingGoals[1].targetDate?.split('T')[0] || '2025-06-15'
            }
          ]
        })
        .expect(200);

      // First goal should have updated title and description
      const updatedGoal = updateResponse.body.data.goals.find(
        (g: any) => g.id === goalToUpdate.id
      );
      expect(updatedGoal.title).toBe('Updated Goal Title');
      expect(updatedGoal.description).toBe('Updated goal description');
    });

    it('should allow deleting all goals', async () => {
      // Update with empty goals array
      const updateResponse = await request(app)
        .put(`/api/v1/feedback/${feedbackId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: {
            overallComment: 'Feedback without goals',
            strengths: ['Test strength'],
            areasForImprovement: ['Test area'],
            specificExamples: [],
            recommendations: [],
            confidential: false
          },
          goals: []
        })
        .expect(200);

      // Should have 0 goals
      expect(updateResponse.body.data.goals).toHaveLength(0);

      // Verify persistence
      const verifyResponse = await request(app)
        .get(`/api/v1/feedback/${feedbackId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(verifyResponse.body.data.goals).toHaveLength(0);
    });
  });
});



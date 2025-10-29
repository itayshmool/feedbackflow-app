#!/usr/bin/env node

import { query } from './backend/dist/config/real-database.js';

async function insertTestDraft() {
  try {
    console.log('Inserting comprehensive test draft...');
    
    // Insert feedback request
    await query(`
      INSERT INTO feedback_requests (id, requester_id, recipient_id, status, created_at, updated_at) 
      VALUES (
        'test-comprehensive-draft-1',
        (SELECT id FROM users WHERE email = 'michalru@wix.com' LIMIT 1),
        (SELECT id FROM users WHERE email = 'lilachv@wix.com' LIMIT 1),
        'draft',
        NOW(),
        NOW()
      )
    `);
    
    console.log('Feedback request inserted');
    
    // Insert feedback response with comprehensive content
    await query(`
      INSERT INTO feedback_responses (id, request_id, giver_id, recipient_id, content, rating, cycle_id, is_approved, created_at, updated_at)
      VALUES (
        'test-comprehensive-response-1',
        'test-comprehensive-draft-1',
        (SELECT id FROM users WHERE email = 'michalru@wix.com' LIMIT 1),
        (SELECT id FROM users WHERE email = 'lilachv@wix.com' LIMIT 1),
        $1,
        4.5,
        (SELECT id FROM feedback_cycles LIMIT 1),
        true,
        NOW(),
        NOW()
      )
    `, [JSON.stringify({
      overallComment: "This is a comprehensive test feedback to verify that all fields are saved correctly when creating a draft. The recipient has shown excellent performance in multiple areas and demonstrates strong leadership qualities.",
      strengths: [
        "Excellent communication skills and team leadership",
        "Strong problem-solving abilities and analytical thinking",
        "Excellent technical expertise and innovative problem-solving approach"
      ],
      areasForImprovement: [
        "Time management and delegation skills could be improved"
      ],
      specificExamples: [
        "Led the Q3 project successfully, delivering 2 weeks ahead of schedule"
      ],
      recommendations: [
        "Consider taking on more strategic projects to further develop leadership skills"
      ]
    })]);
    
    console.log('Feedback response inserted with comprehensive content');
    console.log('Test draft created successfully!');
    
  } catch (error) {
    console.error('Error inserting test draft:', error);
  }
}

insertTestDraft();

#!/usr/bin/env node

import { Pool } from 'pg';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Database configuration
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'feedbackflow',
  user: 'itays',
  password: '',
});

async function viewDatabase() {
  try {
    console.log('🗄️  FeedbackFlow Database Viewer\n');
    
    // Organizations
    console.log('📊 Organizations:');
    const orgResult = await pool.query('SELECT id, name, slug, subscription_plan, is_active, created_at FROM organizations ORDER BY created_at DESC');
    if (orgResult.rows.length === 0) {
      console.log('   No organizations found\n');
    } else {
      orgResult.rows.forEach(org => {
        console.log(`   • ${org.name} (${org.slug}) - ${org.subscription_plan} - ${org.is_active ? 'Active' : 'Inactive'}`);
      });
      console.log('');
    }
    
    // Users
    console.log('👥 Users:');
    const userResult = await pool.query('SELECT id, email, name, is_active, created_at FROM users ORDER BY created_at DESC LIMIT 5');
    if (userResult.rows.length === 0) {
      console.log('   No users found\n');
    } else {
      userResult.rows.forEach(user => {
        console.log(`   • ${user.name || 'N/A'} (${user.email}) - ${user.is_active ? 'Active' : 'Inactive'}`);
      });
      console.log('');
    }
    
    // Departments
    console.log('🏢 Departments:');
    const deptResult = await pool.query('SELECT id, name, organization_id, created_at FROM departments ORDER BY created_at DESC LIMIT 5');
    if (deptResult.rows.length === 0) {
      console.log('   No departments found\n');
    } else {
      deptResult.rows.forEach(dept => {
        console.log(`   • ${dept.name} (Org: ${dept.organization_id})`);
      });
      console.log('');
    }
    
    // Teams
    console.log('👥 Teams:');
    const teamResult = await pool.query('SELECT id, name, department_id, created_at FROM teams ORDER BY created_at DESC LIMIT 5');
    if (teamResult.rows.length === 0) {
      console.log('   No teams found\n');
    } else {
      teamResult.rows.forEach(team => {
        console.log(`   • ${team.name} (Dept: ${team.department_id})`);
      });
      console.log('');
    }
    
    // Database Stats
    console.log('📈 Database Statistics:');
    const statsResult = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM organizations) as organizations,
        (SELECT COUNT(*) FROM users) as users,
        (SELECT COUNT(*) FROM departments) as departments,
        (SELECT COUNT(*) FROM teams) as teams,
        (SELECT COUNT(*) FROM feedback_cycles) as cycles,
        (SELECT COUNT(*) FROM feedback_responses) as responses
    `);
    
    const stats = statsResult.rows[0];
    console.log(`   Organizations: ${stats.organizations}`);
    console.log(`   Users: ${stats.users}`);
    console.log(`   Departments: ${stats.departments}`);
    console.log(`   Teams: ${stats.teams}`);
    console.log(`   Feedback Cycles: ${stats.cycles}`);
    console.log(`   Feedback Responses: ${stats.responses}`);
    
  } catch (error) {
    console.error('❌ Error viewing database:', error.message);
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  viewDatabase();
}

export { viewDatabase };

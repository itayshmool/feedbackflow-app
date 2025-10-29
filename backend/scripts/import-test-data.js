#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { query } from '../dist/config/real-database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper function to parse CSV
function parseCSV(csvContent) {
  const lines = csvContent.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.replace(/"/g, ''));
  const data = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.replace(/"/g, ''));
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || null;
    });
    data.push(row);
  }
  
  return data;
}

// Helper function to generate UUID
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

async function importOrganizations() {
  console.log('📊 Importing organizations...');
  
  const csvPath = path.join(__dirname, '../test-data/dummy-organizations.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf8');
  const organizations = parseCSV(csvContent);
  
  for (const org of organizations) {
    try {
      const orgId = generateUUID();
      
      await query(`
        INSERT INTO organizations (
          id, name, slug, description, contact_email, phone, address, city, state, 
          zip_code, country, website, subscription_plan, max_users, max_cycles, 
          storage_limit_gb, is_active, status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, NOW(), NOW())
      `, [
        orgId,
        org.name,
        org.slug,
        org.description,
        org.contact_email,
        org.phone,
        org.address,
        org.city,
        org.state,
        org.zip_code,
        org.country,
        org.website,
        org.subscription_plan,
        parseInt(org.max_users),
        parseInt(org.max_cycles),
        parseInt(org.storage_limit_gb),
        true,
        'active'
      ]);
      
      console.log(`✅ Created organization: ${org.name} (${orgId})`);
    } catch (error) {
      console.error(`❌ Error creating organization ${org.name}:`, error.message);
    }
  }
}

async function importUsers() {
  console.log('👥 Importing users...');
  
  const csvPath = path.join(__dirname, '../test-data/dummy-users.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf8');
  const users = parseCSV(csvContent);
  
  // Get organization IDs
  const orgResult = await query('SELECT id, name FROM organizations ORDER BY created_at');
  const orgMap = {};
  orgResult.rows.forEach((org, index) => {
    orgMap[index + 1] = org.id; // Map CSV org_id to actual UUID
  });
  
  // Get role IDs
  const roleResult = await query('SELECT id, name FROM roles');
  const roleMap = {};
  roleResult.rows.forEach(role => {
    roleMap[role.name] = role.id;
  });
  
  for (const user of users) {
    try {
      const userId = generateUUID();
      const orgId = orgMap[user.organization_id];
      
      // Create user
      await query(`
        INSERT INTO users (
          id, email, name, avatar_url, organization_id, department, position, 
          is_active, email_verified, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      `, [
        userId,
        user.email,
        user.name,
        user.avatar_url,
        orgId,
        user.department,
        user.position,
        user.is_active === 'true',
        user.email_verified === 'true'
      ]);
      
      // Assign roles
      const roles = user.roles.split(',').map(r => r.trim());
      for (const roleName of roles) {
        const roleId = roleMap[roleName];
        if (roleId) {
          await query(`
            INSERT INTO user_roles (user_id, role_id, organization_id, granted_at, is_active)
            VALUES ($1, $2, $3, NOW(), true)
            ON CONFLICT (user_id, role_id, organization_id) DO NOTHING
          `, [userId, roleId, orgId]);
        }
      }
      
      console.log(`✅ Created user: ${user.name} (${user.email})`);
    } catch (error) {
      console.error(`❌ Error creating user ${user.name}:`, error.message);
    }
  }
}

async function importDepartments() {
  console.log('🏢 Importing departments...');
  
  const csvPath = path.join(__dirname, '../test-data/dummy-departments.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf8');
  const departments = parseCSV(csvContent);
  
  // Get organization IDs
  const orgResult = await query('SELECT id, name FROM organizations ORDER BY created_at');
  const orgMap = {};
  orgResult.rows.forEach((org, index) => {
    orgMap[index + 1] = org.id;
  });
  
  // Get user IDs by email for manager mapping
  const userResult = await query('SELECT id, email FROM users');
  const userMap = {};
  userResult.rows.forEach(user => {
    userMap[user.email] = user.id;
  });
  
  for (const dept of departments) {
    try {
      const deptId = generateUUID();
      const orgId = orgMap[dept.organization_id];
      
      await query(`
        INSERT INTO departments (
          id, name, description, type, organization_id, manager_id, is_active, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      `, [
        deptId,
        dept.name,
        dept.description,
        dept.type,
        orgId,
        null, // We'll update manager_id after users are created
        dept.is_active === 'true'
      ]);
      
      console.log(`✅ Created department: ${dept.name}`);
    } catch (error) {
      console.error(`❌ Error creating department ${dept.name}:`, error.message);
    }
  }
}

async function importTeams() {
  console.log('👥 Importing teams...');
  
  const csvPath = path.join(__dirname, '../test-data/dummy-teams.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf8');
  const teams = parseCSV(csvContent);
  
  // Get organization IDs
  const orgResult = await query('SELECT id, name FROM organizations ORDER BY created_at');
  const orgMap = {};
  orgResult.rows.forEach((org, index) => {
    orgMap[index + 1] = org.id;
  });
  
  // Get department IDs
  const deptResult = await query('SELECT id, name, organization_id FROM departments');
  const deptMap = {};
  deptResult.rows.forEach(dept => {
    const key = `${dept.name}-${dept.organization_id}`;
    deptMap[key] = dept.id;
  });
  
  for (const team of teams) {
    try {
      const teamId = generateUUID();
      const orgId = orgMap[team.organization_id];
      
      // Map department ID from CSV (numeric) to actual department UUID
      let deptId = null;
      if (team.department_id) {
        // Get departments for this organization
        const orgDepts = deptResult.rows.filter(dept => dept.organization_id === orgId);
        const deptIndex = parseInt(team.department_id) - 1; // Convert to 0-based index
        if (orgDepts[deptIndex]) {
          deptId = orgDepts[deptIndex].id;
        }
      }
      
      await query(`
        INSERT INTO teams (
          id, name, description, type, department_id, organization_id, team_lead_id, is_active, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      `, [
        teamId,
        team.name,
        team.description,
        team.type,
        deptId,
        orgId,
        null, // We'll update team_lead_id after users are created
        team.is_active === 'true'
      ]);
      
      console.log(`✅ Created team: ${team.name}`);
    } catch (error) {
      console.error(`❌ Error creating team ${team.name}:`, error.message);
    }
  }
}

async function main() {
  try {
    console.log('🚀 Starting test data import...');
    
    // Import in order: organizations -> users -> departments -> teams
    await importOrganizations();
    await importUsers();
    await importDepartments();
    await importTeams();
    
    console.log('✅ Test data import completed successfully!');
    
    // Show summary
    const orgCount = await query('SELECT COUNT(*) FROM organizations');
    const userCount = await query('SELECT COUNT(*) FROM users');
    const deptCount = await query('SELECT COUNT(*) FROM departments');
    const teamCount = await query('SELECT COUNT(*) FROM teams');
    
    console.log('\n📊 Import Summary:');
    console.log(`   Organizations: ${orgCount.rows[0].count}`);
    console.log(`   Users: ${userCount.rows[0].count}`);
    console.log(`   Departments: ${deptCount.rows[0].count}`);
    console.log(`   Teams: ${teamCount.rows[0].count}`);
    
  } catch (error) {
    console.error('❌ Import failed:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

main();

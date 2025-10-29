# Complete Organization Setup Guide

This guide provides a comprehensive step-by-step process to create a full organization with users and hierarchy in the FeedbackFlow system.

## Overview

The complete setup process involves:
1. **Organization Creation** - Create the organization structure
2. **User Creation** - Add users to the organization
3. **Role Assignment** - Assign appropriate roles to users
4. **Department/Team Setup** - Create organizational structure
5. **Hierarchy Management** - Establish reporting relationships
6. **Verification** - Test the complete setup

## Step 1: Create Organization

### Option A: Single Organization Creation (UI)
1. **Login as Admin**
   - Navigate to `http://localhost:3004`
   - Login with admin credentials (e.g., `admin@example.com`)

2. **Create Organization**
   - Go to **Admin Dashboard** → **Organizations**
   - Click **"Create Organization"**
   - Fill in required fields:
     - **Name**: "Acme Corporation"
     - **Slug**: "acme-corp"
     - **Description**: "A leading technology company"
     - **Contact Email**: "admin@acme.com"
     - **Subscription Plan**: "professional"
     - **Max Users**: 100
   - Click **"Create Organization"**

### Option B: Bulk Organization Import (CSV)
1. **Download Template**
   ```bash
   curl -o organization-template.csv "http://localhost:5000/api/v1/admin/bulk/template?type=organizations"
   ```

2. **Prepare CSV File**
   ```csv
   name,slug,description,contactEmail,contactPhone,address,city,state,zipCode,country,website,logoUrl,subscriptionPlan,maxUsers,maxCycles,storageLimitGb,timezone,language,dateFormat,currency,workingDays,workingHoursStart,workingHoursEnd
   Acme Corporation,acme-corp,A leading technology company,admin@acme.com,+1-555-0123,123 Main St,San Francisco,CA,94102,USA,https://acme.com,https://acme.com/logo.png,professional,100,10,5,America/Los_Angeles,en,YYYY-MM-DD,USD,"[1,2,3,4,5]",09:00,17:00
   ```

3. **Upload Organizations**
   - Go to **Admin Dashboard** → **Organizations** → **Bulk Import**
   - Upload the CSV file
   - Review and confirm import

## Step 2: Create Users

### Option A: Single User Creation (UI)
1. **Navigate to Users**
   - Go to **Admin Dashboard** → **Users**
   - Click **"Create User"**

2. **Fill User Details**
   - **Name**: "John Smith"
   - **Email**: "john.smith@acme.com"
   - **Organization**: Select "Acme Corporation"
   - **Department**: "Engineering"
   - **Position**: "Senior Software Engineer"
   - **Roles**: Select "employee"
   - Click **"Create User"**

### Option B: Bulk User Import (CSV)
1. **Download User Template**
   ```bash
   curl -o user-template.csv "http://localhost:5000/api/v1/admin/bulk/template?type=users"
   ```

2. **Prepare User CSV**
   ```csv
   name,email,organizationName,department,position,roles,isActive,emailVerified
   John Smith,john.smith@acme.com,Acme Corporation,Engineering,Senior Software Engineer,employee,true,true
   Jane Doe,jane.doe@acme.com,Acme Corporation,Engineering,Engineering Manager,manager,true,true
   Bob Johnson,bob.johnson@acme.com,Acme Corporation,Marketing,Marketing Director,manager,true,true
   Alice Brown,alice.brown@acme.com,Acme Corporation,Engineering,Software Engineer,employee,true,true
   ```

3. **Upload Users**
   - Go to **Admin Dashboard** → **Users** → **Bulk Import**
   - Upload the CSV file
   - Review and confirm import

## Step 3: Create Departments and Teams

### Create Departments
1. **Navigate to Organization Details**
   - Go to **Admin Dashboard** → **Organizations**
   - Click on your organization name

2. **Create Departments**
   - Click **"Add Department"**
   - Fill in details:
     - **Name**: "Engineering"
     - **Type**: "engineering"
     - **Manager**: Select "Jane Doe" (Engineering Manager)
     - **Description**: "Software development and engineering"
   - Repeat for other departments (Marketing, Sales, HR, etc.)

### Create Teams
1. **Within Each Department**
   - Click **"Add Team"**
   - Fill in details:
     - **Name**: "Frontend Team"
     - **Type**: "core"
     - **Team Lead**: Select a team lead from the department
     - **Description**: "Frontend development team"

## Step 4: Establish Hierarchy

### Option A: Using Hierarchy Management UI
1. **Navigate to Hierarchy**
   - Go to **Admin Dashboard** → **Hierarchy Management**
   - Select your organization

2. **Add Reporting Relationships**
   - Click **"Add Relationship"**
   - **Manager Email**: "jane.doe@acme.com"
   - **Employee Email**: "john.smith@acme.com"
   - **Relationship Type**: "Direct Report"
   - Click **"Add Relationship"**

### Option B: Using API
```bash
# Create hierarchy relationship
curl -X POST http://localhost:5000/api/v1/hierarchy \
  -H "Content-Type: application/json" \
  -d '{
    "organizationId": "your-org-id",
    "managerId": "jane-doe-user-id",
    "employeeId": "john-smith-user-id",
    "level": 1,
    "isDirectReport": true
  }'
```

## Step 5: Assign Roles and Permissions

### Verify Role Assignments
1. **Check User Roles**
   - Go to **Admin Dashboard** → **Users**
   - Click on each user to view their roles
   - Ensure managers have "manager" role
   - Ensure employees have "employee" role

2. **Update Roles if Needed**
   - Click **"Edit User"**
   - Update roles in the **Roles** section
   - Save changes

## Step 6: Create Feedback Cycles

### Create Organization-Specific Cycles
1. **Navigate to Cycles**
   - Go to **Admin Dashboard** → **Feedback Cycles**
   - Click **"Create Cycle"**

2. **Configure Cycle**
   - **Name**: "Q1 2024 Performance Review"
   - **Organization**: Select "Acme Corporation"
   - **Start Date**: Set appropriate date
   - **End Date**: Set appropriate date
   - **Description**: "Quarterly performance review cycle"
   - Click **"Create Cycle"**

## Step 7: Verification and Testing

### Test Organization Structure
1. **View Organization Chart**
   - Go to **Admin Dashboard** → **Organizations**
   - Click on your organization
   - Navigate to **"Organization Chart"** tab
   - Verify the hierarchy is displayed correctly

2. **Test User Access**
   - Login as different users (manager, employee)
   - Verify they see appropriate data based on their roles
   - Test feedback creation and viewing permissions

### Test Feedback Flow
1. **Create Test Feedback**
   - Login as a manager
   - Go to **Feedback** → **Give Feedback**
   - Select an employee from your direct reports
   - Create and submit feedback

2. **Verify Employee Access**
   - Login as the employee
   - Go to **Feedback** → **My Feedback**
   - Verify the feedback is visible

## Complete Example Setup

Here's a complete example for setting up "Acme Corporation":

### 1. Organization CSV
```csv
name,slug,description,contactEmail,subscriptionPlan,maxUsers
Acme Corporation,acme-corp,A leading technology company,admin@acme.com,professional,100
```

### 2. Users CSV
```csv
name,email,organizationName,department,position,roles
CEO User,ceo@acme.com,Acme Corporation,Executive,CEO,admin
VP Engineering,vp.eng@acme.com,Acme Corporation,Engineering,VP Engineering,manager
Engineering Manager,eng.mgr@acme.com,Acme Corporation,Engineering,Engineering Manager,manager
Senior Developer,senior.dev@acme.com,Acme Corporation,Engineering,Senior Developer,employee
Junior Developer,junior.dev@acme.com,Acme Corporation,Engineering,Junior Developer,employee
Marketing Director,mkt.dir@acme.com,Acme Corporation,Marketing,Marketing Director,manager
Marketing Specialist,mkt.spec@acme.com,Acme Corporation,Marketing,Marketing Specialist,employee
```

### 3. Hierarchy Relationships
- CEO → VP Engineering (Direct Report)
- VP Engineering → Engineering Manager (Direct Report)
- Engineering Manager → Senior Developer (Direct Report)
- Engineering Manager → Junior Developer (Direct Report)
- CEO → Marketing Director (Direct Report)
- Marketing Director → Marketing Specialist (Direct Report)

## Troubleshooting

### Common Issues

1. **Organization Not Found**
   - Ensure organization was created successfully
   - Check organization name matches exactly in CSV

2. **User Creation Fails**
   - Verify email format is correct
   - Ensure organization exists before creating users
   - Check for duplicate emails

3. **Hierarchy Not Displaying**
   - Verify both manager and employee exist
   - Check that relationships were created successfully
   - Ensure users are in the same organization

4. **Role Permissions Not Working**
   - Verify roles were assigned correctly
   - Check user is active and email verified
   - Ensure organization membership is active

### Verification Commands

```bash
# Check organizations
curl http://localhost:5000/api/v1/admin/organizations

# Check users
curl http://localhost:5000/api/v1/admin/users

# Check hierarchy
curl http://localhost:5000/api/v1/hierarchy?organizationId=your-org-id
```

## Next Steps

After completing the organization setup:

1. **Create Feedback Templates** - Set up standard feedback forms
2. **Configure Notifications** - Set up email and in-app notifications
3. **Train Users** - Provide training on the feedback system
4. **Monitor Usage** - Use analytics to track feedback activity
5. **Iterate and Improve** - Gather feedback on the system itself

## Support

If you encounter issues during setup:
1. Check the browser console for errors
2. Verify backend server is running on port 5000
3. Check database connectivity
4. Review the logs in the terminal where the backend is running

This completes the full organization setup process. The system is now ready for feedback collection and management.

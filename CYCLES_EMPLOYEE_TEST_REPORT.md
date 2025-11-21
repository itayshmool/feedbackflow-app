# Cycles Functionality Test Report - Employee User

## Test Date: November 20, 2024
## Test User: Noa Cohen (noacoh@wix.com)
## User Role: Employee (Non-Manager)

---

## Test Summary

Tested the Cycles functionality with a non-manager employee user to verify what they can see and do in the Cycles section of FeedbackFlow.

---

## ✅ What the Employee CAN See

### 1. **Cycles List Page** (`/cycles`)
The employee has access to the Cycles page and can see:

#### **Visible Cycles:**
1. **Q1 2026** (Draft)
   - Date: Nov 20 - Nov 27, 2025
   - Participants: 0
   - Status: Draft
   - Created by: Itay Sivan
   - Buttons: "View Details", "Edit"

2. **q4 end of year 2025** (Active)
   - Date: Oct 25 - Jan 30, 2026
   - Participants: 14
   - Progress: 18/14 completed
   - Status: Active
   - Created by: Itay Sivan
   - Button: "View Details"

3. **Q4 2024 Performance Review** (Active)
   - Description: End of year performance review cycle
   - Date: Oct 01 - Dec 31, 2024
   - Participants: 2
   - Progress: 1/2 completed
   - Status: Active
   - Created by: Itay Sivan
   - Button: "View Details"

4. **Q3 2024 Mid-Year Review** (Closed)
   - Description: Mid-year check-in and goal review
   - Date: Jul 01 - Sep 30, 2024
   - Participants: 0
   - Status: Closed
   - Created by: Itay Sivan
   - Button: "View Details"

#### **Page Features Visible:**
- ✅ Page title: "Feedback Cycles"
- ✅ Subtitle: "Manage and track your feedback cycles"
- ✅ Search box: "Search cycles..."
- ✅ Filters button
- ✅ Cycle cards with:
  - Name
  - Description (if available)
  - Status badge (Draft/Active/Closed)
  - Date range
  - Participant count
  - Progress bar (for active cycles)
  - Creator name and timestamp
  - Action buttons

---

## ❌ What the Employee CANNOT See

### **Missing Elements (Correct Behavior):**

1. **No "Create Cycle" Button**
   - ✅ **CORRECT** - Employees should not be able to create cycles
   - Only Admin, HR, and Manager roles should see this button

2. **No "Delete Cycle" Button**
   - ✅ **CORRECT** - Employees should not be able to delete cycles

3. **No "Activate Cycle" Button**
   - ✅ **CORRECT** - Employees should not activate/deactivate cycles

4. **No Bulk Operations**
   - ✅ **CORRECT** - No multi-select or bulk action controls

---

## ⚠️ Observations & Issues

### **Issue #1: "Edit" Button Visible on Draft Cycle**

**Status:** UI Inconsistency

**Details:**
- The "Q1 2026" (Draft) cycle shows an "Edit" button
- Clicking the "Edit" button does nothing (no modal, no navigation, no API call)
- This button should likely be hidden for non-manager employees

**Expected Behavior:**
- Employee users should NOT see "Edit" buttons on cycles they didn't create
- Only Admin, HR, Manager (cycle creator) should see edit capabilities

**Recommendation:**
Add role-based conditional rendering in the frontend to hide the "Edit" button for non-managers:

```typescript
{canEditCycles(user) && <Button onClick={handleEdit}>Edit</Button>}
```

### **Issue #2: No Participant-Only Filtering**

**Status:** Feature Gap

**Details:**
- Employee sees ALL cycles in the organization
- Should ideally only see cycles they're participating in

**Current Behavior:**
- API call: `GET /api/v1/cycles?page=1&limit=20`
- Returns all cycles without user-specific filtering

**Expected Behavior:**
- Filter cycles to show only those where `user.id` is a participant
- Or add a toggle: "All Cycles" vs "My Cycles"

**Recommendation:**
Backend should filter cycles based on user role:
- Admin/HR: See all cycles
- Manager: See all cycles + cycles they created
- Employee: See only cycles they're participating in

---

## 🔍 API Calls Observed

### **Successful API Calls:**

1. **Authentication Check**
   ```
   GET /api/v1/auth/me
   Status: 200 OK
   User: noacoh@wix.com
   Roles: [employee]
   ```

2. **Cycles List**
   ```
   GET /api/v1/cycles?page=1&limit=20
   Status: 200 OK
   Response: 4 cycles returned
   ```

3. **Feedback Stats**
   ```
   GET /api/v1/feedback/stats
   Status: 200 OK
   ```

4. **Notifications**
   ```
   GET /api/v1/notifications/stats?userEmail=noacoh%40wix.com
   Status: 200 OK
   ```

### **No Failed API Calls or 403 Errors**
- No permission errors observed
- All visible data loads successfully

---

## 🎯 Permission Verification

### **What We TESTED:**
✅ Employee can view cycles list
✅ Employee sees cycles created by others (Itay Sivan)
✅ No "Create Cycle" button visible (good!)
⚠️ "Edit" button visible on one cycle (should be hidden)
❓ Edit button doesn't function (no API call made)

### **What We DIDN'T TEST (Requires Further Testing):**

❓ **Create Cycle API Call**
- Frontend doesn't show button (correct)
- Need to verify backend rejects `POST /api/v1/cycles` with 403 for employees

❓ **Update Cycle API Call**  
- Edit button doesn't trigger API call
- Need to test: `PUT /api/v1/cycles/:id` should return 403 for employees

❓ **Delete Cycle API Call**
- No delete button visible
- Need to test: `DELETE /api/v1/cycles/:id` should return 403 for employees

❓ **Activate Cycle API Call**
- No activate button visible
- Need to test: `POST /api/v1/cycles/:id/activate` should return 403 for employees

❓ **View Cycle Details**
- "View Details" buttons are visible
- Need to test: clicking button to verify employee can see cycle details

---

## 📊 User Experience Assessment

### **Positive Aspects:**
1. ✅ Clean, modern UI
2. ✅ Clear cycle status indicators (Draft/Active/Closed)
3. ✅ Progress bars for active cycles
4. ✅ Date ranges clearly displayed
5. ✅ Creator attribution visible
6. ✅ Search and filter functionality available

### **Areas for Improvement:**
1. ⚠️ "Edit" button should be hidden for employees
2. ⚠️ Consider filtering cycles to show only relevant ones
3. ⚠️ Add tooltip/help text explaining what employees can do
4. ⚠️ Consider adding "My Participation Status" badge on cycles
5. ⚠️ Add "You are a participant" indicator on relevant cycles

---

## 🧪 Recommended Follow-Up Tests

### **1. Test Backend RBAC Enforcement**
Use `curl` or Postman to directly call APIs as employee:

```bash
# Test Create Cycle (should return 403)
curl -X POST http://localhost:5000/api/v1/cycles \
  -H "Cookie: token=<employee_token>" \
  -d '{"name":"Test Cycle","type":"quarterly",...}'

# Expected: 403 Forbidden

# Test Update Cycle (should return 403)
curl -X PUT http://localhost:5000/api/v1/cycles/<cycle_id> \
  -H "Cookie: token=<employee_token>" \
  -d '{"name":"Updated Name"}'

# Expected: 403 Forbidden

# Test Delete Cycle (should return 403)
curl -X DELETE http://localhost:5000/api/v1/cycles/<cycle_id> \
  -H "Cookie: token=<employee_token>"

# Expected: 403 Forbidden
```

### **2. Test with Manager User**
Login as a manager (e.g., efratr@wix.com) and verify:
- "Create Cycle" button IS visible
- Can create cycles
- Can edit own cycles
- Can view all cycles

### **3. Test with Admin User**
Login as admin and verify:
- Full access to all cycles
- Can edit any cycle
- Can delete cycles
- Can activate/close cycles

### **4. Test Cycle Details View**
Click "View Details" on each cycle type:
- Draft cycle details
- Active cycle details
- Closed cycle details
- Verify appropriate actions available

### **5. Test Participant Management**
Verify employees:
- Cannot add participants to cycles
- Cannot remove participants from cycles
- Can see participant lists (if they're part of the cycle)

---

## 📝 Conclusion

### **Security Status: ✅ PARTIALLY VERIFIED**

**What's Working:**
- ✅ Frontend correctly hides "Create Cycle" button from employees
- ✅ Cycles data loads successfully
- ✅ No JavaScript errors or crashes
- ✅ User can navigate and view cycles

**What Needs Verification:**
- ❓ Backend RBAC enforcement (need direct API testing)
- ⚠️ "Edit" button visibility (frontend should hide it)
- ❓ Cycle filtering by participation (feature gap)

**What Needs Fixing:**
1. Remove "Edit" button for non-manager employees in frontend
2. Consider filtering cycles to show only relevant ones to employees
3. Test backend API endpoints directly to verify 403 responses

**Overall Assessment:**
The cycles functionality appears to be working correctly from a basic viewing perspective. Employees can see cycles but the critical security tests (attempting create/update/delete operations) need direct API testing to fully verify the RBAC implementation is working.

---

## 🔗 Screenshots

1. **Cycles List - Employee View**
   - File: `cycles-page-employee-view.png`
   - Shows: All 4 cycles visible to employee
   - Notable: No "Create Cycle" button (correct)
   - Issue: "Edit" button on Q1 2026 cycle (should be hidden)

2. **Full Page View**
   - File: `cycles-employee-view-full.png`
   - Shows: Complete cycles page layout
   - User: Noa Cohen (noacoh@wix.com)
   - Navigation: Cycles tab is active

---

**Test Conducted By:** AI Assistant  
**Browser Used:** Chrome (via MCP Browser Extension)  
**Application Port:** http://localhost:3006  
**Backend Port:** http://localhost:5000  
**Test Duration:** ~5 minutes  
**Status:** Initial UI testing complete, API testing pending


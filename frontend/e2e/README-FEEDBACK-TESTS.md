# Feedback Workflow & Manager Analytics E2E Tests

## Overview

This directory contains comprehensive end-to-end tests for the FeedbackFlow application's core features:
- **Feedback Workflow**: Complete lifecycle from draft → submit → acknowledge → complete
- **Manager Analytics**: Dashboard access, viewing analytics, and permission controls

## Test Files

### 1. `feedback-workflow.spec.ts`
Tests the complete feedback lifecycle using real database users.

**Test Coverage:**
- ✅ Create feedback and save as draft
- ✅ Verify draft appears in Drafts tab
- ✅ Edit draft and add additional content
- ✅ Submit feedback for review
- ✅ Receiver acknowledges feedback with message
- ✅ Giver marks feedback as complete
- ✅ Status transitions (DRAFT → SUBMITTED → COMPLETED)
- ✅ Delete draft functionality

**Test Users:**
- Giver: `efratr@wix.com` (manager)
- Receiver: `idanc@wix.com` (employee reporting to efratr)

### 2. `manager-analytics.spec.ts`
Tests manager-level analytics viewing and access controls.

**Test Coverage:**
- ✅ Manager access to analytics dashboard
- ✅ Overview tab with statistics cards
- ✅ Trends tab with period filters (daily/weekly/monthly)
- ✅ Categories tab with feedback type breakdown
- ✅ Insights tab with severity indicators
- ✅ Cycle filtering across all tabs
- ✅ Data refresh functionality
- ✅ Non-manager access restriction
- ✅ Loading states
- ✅ Error handling

**Test Users:**
- Manager: `efratr@wix.com`
- Non-Manager: `idanc@wix.com`

### 3. `helpers/auth.helper.ts`
Reusable authentication utilities for tests.

**Functions:**
- `loginAsUser(page, email, password)` - Login as specific user
- `logout(page)` - Logout current user
- `clearAuth(page)` - Clear all authentication state

## Prerequisites

### 1. Database Setup
Ensure the database has the required test users:

```sql
-- Verify users exist
SELECT email, role FROM users WHERE email IN ('efratr@wix.com', 'idanc@wix.com');

-- Verify hierarchy relationship
SELECT * FROM organizational_hierarchy 
WHERE manager_id = (SELECT id FROM users WHERE email = 'efratr@wix.com')
  AND employee_id = (SELECT id FROM users WHERE email = 'idanc@wix.com');

-- Verify active feedback cycle exists
SELECT * FROM feedback_cycles WHERE status = 'active';
```

### 2. Running Services

**Terminal 1 - Backend:**
```bash
cd backend
tsx src/real-database-server.ts
```
Backend should be running on: http://localhost:5000

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```
Frontend should be running on: http://localhost:3003

### 3. Verify Services
```bash
# Check backend health
curl http://localhost:5000/api/v1/health

# Check frontend
curl http://localhost:3003
```

## Running the Tests

### Run All E2E Tests
```bash
cd frontend
npm run test:e2e
```

### Run Specific Test Suite
```bash
# Feedback workflow tests only
npm run test:e2e -- feedback-workflow.spec.ts

# Manager analytics tests only
npm run test:e2e -- manager-analytics.spec.ts
```

### Debug Mode (Visible Browser)
```bash
# Run in headed mode (see the browser)
npm run test:e2e:headed

# Run specific test in headed mode
npm run test:e2e:headed -- feedback-workflow.spec.ts

# Debug mode (pauses on failures)
npm run test:e2e:debug
```

### Interactive UI Mode
```bash
npm run test:e2e:ui
```

### View Test Reports
```bash
npm run test:e2e:report
```

## Test Configuration

**Playwright Config** (`playwright.config.ts`):
- Base URL: `http://localhost:3003`
- Timeout: 30 seconds per test
- Retries: 0 (local), 2 (CI)
- Screenshots: On failure
- Videos: Off (for faster runs)
- Trace: Retained on failure

## Test Flow Details

### Feedback Workflow Test

```
1. Giver (efratr@wix.com) logs in
2. Creates new feedback for receiver (idanc@wix.com)
3. Fills form: cycle, strengths, improvements
4. Saves as DRAFT
5. Verifies draft in Drafts tab
6. Edits draft (adds another strength)
7. Submits feedback → Status: SUBMITTED
8. Logs out
9. Receiver (idanc@wix.com) logs in
10. Views feedback in Received tab
11. Acknowledges with message
12. Logs out
13. Giver logs back in
14. Marks feedback as COMPLETE
15. Final status: COMPLETED ✓
```

### Manager Analytics Test

```
1. Manager (efratr@wix.com) logs in
2. Navigates to Analytics page
3. Verifies access granted (no permission error)
4. Tests Overview tab:
   - Statistics cards visible
   - Total feedback, completion rate, response time
5. Tests Trends tab:
   - Chart displays
   - Period filters work (daily/weekly/monthly)
6. Tests Categories tab:
   - Feedback type breakdown visible
   - Charts render correctly
7. Tests Insights tab:
   - Insights list displays
   - Severity indicators present
8. Tests Cycle Filter:
   - Dropdown works
   - All tabs update with filtered data
9. Tests Refresh:
   - Data refreshes correctly
10. All tests pass ✓

Non-Manager Test:
1. Employee (idanc@wix.com) logs in
2. Attempts to access Analytics
3. Sees "Manager Access Required" message ✓
4. No analytics data visible ✓
```

## Debugging Failed Tests

### 1. Check Services
```bash
# Backend
curl http://localhost:5000/api/v1/health

# Frontend
curl http://localhost:3003

# Check backend logs
tail -f backend/server-output.log
```

### 2. Run in Debug Mode
```bash
npm run test:e2e:debug -- feedback-workflow.spec.ts
```

This will:
- Open browser in visible mode
- Pause execution
- Allow step-by-step debugging

### 3. View Screenshots
After failed tests, screenshots are saved in:
```
frontend/test-results/
frontend/playwright-report/
```

### 4. Check Test Logs
Console logs from tests include:
- `✓` Step completion markers
- `✅` Test suite completion
- `⚠` Warning messages
- Error details

### 5. Common Issues

**Issue:** "Timeout waiting for element"
- **Solution**: Check if UI changed, update selectors
- **Solution**: Increase timeout for slow operations

**Issue:** "User not found in database"
- **Solution**: Verify test users exist in database
- **Solution**: Check database connection

**Issue:** "Cannot click element"
- **Solution**: Element may be covered or not visible
- **Solution**: Add `await page.waitForTimeout(1000)` before click

**Issue:** "Authentication failed"
- **Solution**: Verify user credentials
- **Solution**: Check auth service is running

## Success Criteria

✅ **All tests pass**, confirming:
- Feedback workflow is fully functional (draft → submit → acknowledge → complete)
- Manager analytics displays correctly for authorized users
- Access controls work properly (non-managers restricted)
- Navigation and state management function as expected
- Application is stable and ready for new feature development

## Next Steps

After these tests pass:
1. ✅ Application core functionality verified
2. ✅ Safe to proceed with template feature implementation
3. ✅ Baseline established for regression testing
4. Add new E2E tests for template feature
5. Integrate into CI/CD pipeline

## Maintenance

### Update Test Users
If test users change in database, update constants in test files:
```typescript
const GIVER_EMAIL = 'efratr@wix.com';
const RECEIVER_EMAIL = 'idanc@wix.com';
const MANAGER_EMAIL = 'efratr@wix.com';
const NON_MANAGER_EMAIL = 'idanc@wix.com';
```

### Update Selectors
If UI changes, update selectors in tests:
- Use `data-testid` attributes when available
- Fall back to `text=` selectors
- Use CSS selectors as last resort

### Add New Tests
Follow the established pattern:
1. Use `test.describe()` for test grouping
2. Use `test.step()` for logical sections
3. Add console.log statements for progress tracking
4. Clear auth state in `beforeEach()`
5. Use helper functions from `auth.helper.ts`






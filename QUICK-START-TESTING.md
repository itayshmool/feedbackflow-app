# Quick Start: E2E Testing Guide

## 🚀 Run Tests in 3 Steps

### Step 1: Start Services

**Terminal 1 - Backend:**
```bash
cd backend
tsx src/real-database-server.ts
```
✓ Backend running on http://localhost:5000

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```
✓ Frontend running on http://localhost:3003

### Step 2: Run Tests

**Terminal 3 - Tests:**
```bash
cd frontend
./run-feedback-tests.sh all
```

### Step 3: View Results
Tests will run and show results in the terminal with ✓ markers for each step.

---

## 📋 Quick Commands

```bash
# Check if services are running
./run-feedback-tests.sh check

# Run all tests
./run-feedback-tests.sh all

# Run only feedback workflow tests
./run-feedback-tests.sh feedback

# Run only analytics tests
./run-feedback-tests.sh analytics

# Run with visible browser (helpful for debugging)
./run-feedback-tests.sh headed

# Debug mode (pauses on failures)
./run-feedback-tests.sh debug
```

---

## 🎯 What Gets Tested

### Feedback Workflow
- Create draft → Edit → Submit → Acknowledge → Complete
- Status transitions work correctly
- Draft management (save, edit, delete)

### Manager Analytics
- Manager can access analytics
- All tabs work (Overview, Trends, Categories, Insights)
- Non-manager users are blocked
- Cycle filtering works

---

## ✅ Expected Output

```
Feedback Workflow - Complete Lifecycle
  ✓ Login as giver and create draft feedback
  ✓ Verify draft appears in Drafts tab
  ✓ Edit draft and submit feedback
  ✓ Verify feedback status is SUBMITTED
  ✓ Receiver acknowledges feedback
  ✓ Verify acknowledgment displays correctly
  ✓ Giver marks feedback as complete
  ✓ Verify final status is COMPLETED
  ✅ Complete feedback workflow test passed!

Manager Analytics
  ✓ Logged in as manager
  ✓ Navigated to Analytics page
  ✓ Manager access granted
  ✓ Overview tab displays statistics
  ✓ Trends tab displays charts and filters work
  ✓ Categories tab displays feedback breakdown
  ✓ Insights tab displayed
  ✓ Cycle filter works across all tabs
  ✓ Data refresh functionality works
  ✅ All manager analytics tests passed!
```

---

## 🐛 Troubleshooting

**Tests fail with "services not running":**
```bash
# Check services
./run-feedback-tests.sh check

# Restart backend
cd backend && tsx src/real-database-server.ts

# Restart frontend
cd frontend && npm run dev
```

**Tests fail with "user not found":**
```bash
# Verify users exist in database
psql feedbackflow -c "SELECT email, role FROM users WHERE email IN ('efratr@wix.com', 'idanc@wix.com');"
```

**Want to see what's happening:**
```bash
# Run in headed mode (visible browser)
./run-feedback-tests.sh headed
```

---

## 📚 More Info

- **Full Documentation:** `frontend/e2e/README-FEEDBACK-TESTS.md`
- **Implementation Summary:** `E2E-TESTS-SUMMARY.md`
- **Test Files:** `frontend/e2e/feedback-workflow.spec.ts` and `manager-analytics.spec.ts`

---

## 🎉 Success!

When all tests pass with ✅, your application is verified and ready for the template feature implementation!


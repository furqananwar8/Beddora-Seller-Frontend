# SandboxOrdersTest Component - Testing Guide

## 🧪 Frontend Component Testing Guide

This guide covers how to test the `SandboxOrdersTest` component in the frontend.

---

## 📋 Prerequisites

1. **Backend server running** on `http://localhost:5200`
2. **Frontend server running** on `http://localhost:3000`
3. **Environment variables set** in backend `.env`:
   ```env
   SANDBOX_APP_NAME=My Sandbox Application
   SANDBOX_APP_ID=amzn1.application-oa2-client.xxxxxxxxxxxx
   SANDBOX_REFRESH_TOKEN=Atzr|IwEBIJxxxxxxxxxxxx
   ```
4. **User logged in** (for authentication)

---

## 🎨 Testing Methods

### Method 1: Create a Test Page

**Step 1:** Create a new page:

```tsx
// app/(dashboard)/sandbox-test/page.tsx
import { SandboxOrdersTest } from '@/features/profit/dashboard/components'

export default function SandboxTestPage() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Sandbox Orders Test</h1>
      <SandboxOrdersTest />
    </div>
  )
}
```

**Step 2:** Navigate to:
```
http://localhost:3000/sandbox-test
```

**Expected Result:**
- Component loads
- Shows connection status
- Fetches and displays orders

---

### Method 2: Add to Dashboard

**Step 1:** Open `ProfitDashboardScreen.tsx`

**Step 2:** Add a new tab or section:

```tsx
import { SandboxOrdersTest } from './components'

// In the component:
type DashboardTab = 'tiles' | 'chart' | 'p&l' | 'map' | 'trends' | 'sandbox'

// In the render:
{activeTab === 'sandbox' && (
  <div className="space-y-6">
    <SandboxOrdersTest />
  </div>
)}
```

**Step 3:** Navigate to the dashboard and click the "Sandbox" tab

---

### Method 3: Test in Storybook (if configured)

```tsx
// SandboxOrdersTest.stories.tsx
import { SandboxOrdersTest } from './SandboxOrdersTest'

export default {
  title: 'Features/Profit/SandboxOrdersTest',
  component: SandboxOrdersTest,
}

export const Default = () => <SandboxOrdersTest />
export const WithAccount = () => (
  <SandboxOrdersTest amazonAccountId="test-account-id" />
)
```

---

## ✅ Testing Scenarios

### Scenario 1: Using Environment Variables

**Setup:**
- No `amazonAccountId` prop provided
- Environment variables set in backend

**Expected Behavior:**
1. ✅ Component renders immediately
2. ✅ No account selector shown
3. ✅ Connection test runs automatically
4. ✅ Shows connection status badge
5. ✅ Fetches orders automatically
6. ✅ Displays orders in table

**Visual Check:**
- Connection badge shows: "✓ Connected (My Sandbox Application)"
- Orders table displays with data
- No loading spinner after initial load

---

### Scenario 2: Using Account Selector

**Setup:**
- No `amazonAccountId` prop provided
- User has Amazon accounts in database

**Expected Behavior:**
1. ✅ Account selector dropdown appears
2. ✅ Lists all available accounts
3. ✅ When account selected:
   - Connection test runs
   - Shows connection status
   - Fetches orders for selected account
   - Displays results

**Visual Check:**
- Dropdown shows: "Select Amazon Account..."
- Account options: "SellerID (Marketplace)"
- Connection badge updates when account selected

---

### Scenario 3: With Specific Account

**Setup:**
- `amazonAccountId` prop provided

```tsx
<SandboxOrdersTest amazonAccountId="abc123-def456-ghi789" />
```

**Expected Behavior:**
1. ✅ No account selector shown
2. ✅ Uses specified account
3. ✅ Tests connection automatically
4. ✅ Fetches orders automatically

---

### Scenario 4: Loading State

**Expected Behavior:**
1. ✅ Shows spinner while fetching
2. ✅ Shows "Loading sandbox orders..." message
3. ✅ Table not visible during loading

**Visual Check:**
- Large spinner in center
- Loading message below spinner
- Card content area shows loading state

---

### Scenario 5: Error State

**Setup:**
- Invalid refresh token or missing env vars

**Expected Behavior:**
1. ✅ Shows error component
2. ✅ Displays error message
3. ✅ Shows "Retry" button
4. ✅ Retry button refetches data

**Visual Check:**
- ErrorComponent with red styling
- Error message: "Failed to load sandbox orders"
- Retry button visible

---

### Scenario 6: Empty State

**Setup:**
- Valid connection but no orders

**Expected Behavior:**
1. ✅ Shows "No sandbox orders available" message
2. ✅ Shows helpful hint about configuration

**Visual Check:**
- Centered message
- Muted text color
- Helpful hint text

---

## 🔍 Debugging Tips

### 1. Check Browser Console

Open DevTools (F12) → Console tab:

**Look for:**
- RTK Query logs
- API request logs
- Error messages
- Network errors

**Example logs:**
```
[RTK Query] Fetching: GET /api/amazon/sandbox/orders
[RTK Query] Success: { success: true, data: [...] }
```

---

### 2. Check Network Tab

Open DevTools (F12) → Network tab:

**Filter by:** "sandbox"

**Check:**
- Request URL: `/api/amazon/sandbox/orders`
- Request Method: `GET`
- Request Headers: `Authorization: Bearer ...`
- Response Status: `200 OK` or error code
- Response Body: JSON data

**Example Request:**
```
GET /api/amazon/sandbox/orders HTTP/1.1
Host: localhost:5200
Authorization: Bearer eyJhbGc...
Content-Type: application/json
```

**Example Response:**
```json
{
  "success": true,
  "data": [
    {
      "orderId": "123-4567890-1234567",
      "orderDate": "2024-01-15T10:30:00Z",
      "marketplace": "ATVPDKIKX0DER",
      "totalAmount": 29.99,
      "currency": "USD"
    }
  ]
}
```

---

### 3. Check React DevTools

Install React DevTools extension:

**Inspect:**
- Component props
- Component state
- Hook values (RTK Query cache)

**Check:**
- `useGetSandboxOrdersQuery` hook state
- `useTestSandboxConnectionQuery` hook state
- Component re-renders

---

### 4. Verify API Endpoints

Test backend endpoints directly:

```bash
# Test connection
curl -X GET "http://localhost:5200/api/amazon/sandbox/test" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Test orders
curl -X GET "http://localhost:5200/api/amazon/sandbox/orders" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

If backend works but frontend doesn't:
- Check CORS settings
- Check authentication token
- Check API base URL configuration

---

## 📊 Expected Visual States

### ✅ Success State

```
┌─────────────────────────────────────────┐
│ Sandbox Orders Test    [Account Select] │
│ ✓ Connected (App Name)                 │
├─────────────────────────────────────────┤
│ Order ID    │ Date      │ Amount        │
│ 123-456...  │ Jan 15    │ $29.99        │
│ 789-012...  │ Jan 14    │ $45.50        │
└─────────────────────────────────────────┘
```

### ⏳ Loading State

```
┌─────────────────────────────────────────┐
│ Sandbox Orders Test                     │
├─────────────────────────────────────────┤
│           [Spinner]                     │
│     Loading sandbox orders...           │
└─────────────────────────────────────────┘
```

### ❌ Error State

```
┌─────────────────────────────────────────┐
│ Sandbox Orders Test                     │
├─────────────────────────────────────────┤
│  ⚠️ Failed to load sandbox orders      │
│  [Error message details]               │
│  [Retry Button]                        │
└─────────────────────────────────────────┘
```

### 📭 Empty State

```
┌─────────────────────────────────────────┐
│ Sandbox Orders Test                     │
├─────────────────────────────────────────┤
│  No sandbox orders available.          │
│  The sandbox endpoint may not be       │
│  configured yet.                       │
└─────────────────────────────────────────┘
```

---

## 🧪 Interactive Testing Checklist

- [ ] Component renders without errors
- [ ] Connection test runs automatically
- [ ] Connection status badge displays correctly
- [ ] Loading spinner shows during fetch
- [ ] Orders table displays with data
- [ ] Table columns: Order ID, Date, Marketplace, Amount
- [ ] Order status badges display (if available)
- [ ] Error state shows on API failure
- [ ] Retry button works
- [ ] Account selector appears (if no account prop)
- [ ] Account selection updates data
- [ ] Component is responsive (mobile/desktop)
- [ ] No console errors
- [ ] Network requests succeed

---

## 🚀 Quick Test Commands

### Start Backend
```bash
cd backend-beddora-cosmos
npm run dev
```

### Start Frontend
```bash
cd frontend-beddora-cosmos
npm run dev
```

### Open Test Page
```
http://localhost:3000/sandbox-test
```

---

## 📝 Common Issues & Solutions

### Issue 1: Component Not Rendering

**Symptoms:**
- Blank page
- Component not found error

**Solutions:**
- Check import path: `@/features/profit/dashboard/components`
- Verify component is exported in `index.ts`
- Check for TypeScript errors

---

### Issue 2: API Calls Failing

**Symptoms:**
- Error component shows
- Network tab shows 401/500 errors

**Solutions:**
- Check authentication token
- Verify backend server is running
- Check CORS configuration
- Verify environment variables

---

### Issue 3: No Orders Displayed

**Symptoms:**
- Connection successful
- Empty state shows

**Solutions:**
- Check if sandbox has orders
- Verify marketplace ID
- Check date range (createdAfter)
- Verify SP-API permissions

---

### Issue 4: Account Selector Not Showing

**Symptoms:**
- No dropdown visible
- Component uses env vars

**Solutions:**
- Check if accounts exist in database
- Verify `useGetAmazonAccountsQuery` returns data
- Check authentication

---

## ✅ Success Criteria

The component is working correctly if:

1. ✅ Renders without errors
2. ✅ Shows connection status
3. ✅ Fetches data automatically
4. ✅ Displays orders in table
5. ✅ Handles loading states
6. ✅ Handles error states
7. ✅ Handles empty states
8. ✅ Account selector works (if applicable)
9. ✅ Responsive on mobile/desktop
10. ✅ No console errors

---

**Happy Testing! 🎉**

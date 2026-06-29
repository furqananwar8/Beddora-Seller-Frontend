# SandboxOrdersTest Component - Integration Example

## Component Overview

The `SandboxOrdersTest` component is a modular, reusable component that fetches and displays sandbox orders from the backend test endpoint `/api/amazon/sandbox/orders`.

## Features

- ✅ Fetches data from `/api/amazon/sandbox/orders` on mount
- ✅ Displays orders in a responsive table
- ✅ Shows loader while fetching
- ✅ Shows error message if API call fails
- ✅ Fully responsive and mobile-friendly
- ✅ Uses RTK Query for data fetching and caching

## Integration Example

### Basic Usage in Dashboard

```tsx
import { SandboxOrdersTest } from '@/features/profit/dashboard/components'

export default function DashboardPage() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      
      {/* Sandbox Orders Test Component */}
      <SandboxOrdersTest />
    </div>
  )
}
```

### Integration in ProfitDashboardScreen

```tsx
// In ProfitDashboardScreen.tsx
import { SandboxOrdersTest } from './components'

// Add to the component render:
{activeTab === 'sandbox' && (
  <div className="space-y-6">
    <SandboxOrdersTest />
  </div>
)}
```

### With Custom Styling

```tsx
import { SandboxOrdersTest } from '@/features/profit/dashboard/components'

export default function TestPage() {
  return (
    <div className="p-6">
      <SandboxOrdersTest className="max-w-6xl mx-auto" />
    </div>
  )
}
```

## Component Structure

```
SandboxOrdersTest.tsx
├── Card (container)
│   ├── CardHeader (title)
│   └── CardContent
│       ├── Loading State (Spinner)
│       ├── Error State (ErrorComponent)
│       ├── Empty State
│       └── Table (orders data)
│           ├── TableHeader
│           │   ├── Order ID
│           │   ├── Order Date
│           │   ├── Marketplace
│           │   ├── Total Amount
│           │   └── Status (if available)
│           └── TableBody
│               └── Order rows
```

## API Response Format

The component expects the following API response format:

```typescript
{
  success: boolean
  data: [
    {
      orderId: string
      orderDate: string // ISO date string
      marketplace: string
      totalAmount: number
      currency?: string // Optional, defaults to 'USD'
      orderStatus?: string // Optional
    }
  ]
  message?: string
  timestamp?: string
}
```

## Reusable Components Used

1. **ErrorComponent** - Already exists in `features/profit/dashboard/components/ErrorComponent.tsx`
2. **Spinner** - From `@/design-system/loaders`
3. **Table Components** - From `@/design-system/tables`
4. **Card Components** - From `@/design-system/cards`

## State Management

The component uses RTK Query for data fetching:
- `useGetSandboxOrdersQuery()` - Automatically fetches on mount
- Automatic caching (60 seconds)
- Automatic refetch on error retry
- Loading and error states handled automatically

## Customization

### Custom Date Format

The component uses `formatDate` from `@/utils/format`. To customize:

```tsx
// Modify the formatDate call in SandboxOrdersTest.tsx
formatDate(order.orderDate, {
  year: 'numeric',
  month: 'long', // Change to 'short' for abbreviated months
  day: 'numeric',
  hour: '2-digit', // Add time if needed
  minute: '2-digit',
})
```

### Custom Currency Format

The component uses `formatCurrency` from `@/utils/format`. Currency is automatically detected from `order.currency` or defaults to 'USD'.

## Future Enhancements

- Date range filtering (using DateRangePicker component)
- Search/filter by order ID or marketplace
- Pagination for large order lists
- Export to CSV functionality
- Sortable columns

## Files Created

1. `services/api/amazon.api.ts` - RTK Query API endpoint
2. `features/profit/dashboard/components/SandboxOrdersTest.tsx` - Main component
3. `features/profit/dashboard/components/index.ts` - Export added

## Dependencies

- `@reduxjs/toolkit/query/react` - RTK Query
- `@/design-system/*` - Design system components
- `@/utils/format` - Formatting utilities
- `@/utils/cn` - Class name utility

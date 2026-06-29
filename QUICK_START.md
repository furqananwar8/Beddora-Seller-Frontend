# Quick Start Guide

## 🚀 Getting Started

1. **Install Dependencies**
   ```bash
   cd frontend-beddora-cosmos
   npm install
   ```

2. **Set Up Environment Variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your API URL
   ```

3. **Run Development Server**
   ```bash
   npm run dev
   ```

4. **Open Browser**
   Navigate to `http://localhost:3000`

## 📝 Next Steps

### 1. Connect to Your Backend API

Update the API base URL in `services/api/baseApi.ts`:
```typescript
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'
```

### 2. Add Authentication Headers

Uncomment and configure authentication in `services/api/baseApi.ts`:
```typescript
prepareHeaders: (headers, { getState }) => {
  const token = (getState() as RootState).auth.token
  if (token) {
    headers.set('authorization', `Bearer ${token}`)
  }
  return headers
}
```

### 3. Connect Feature Components to APIs

Example in `app/(dashboard)/profit/page.tsx`:
```typescript
import { useGetProfitReportQuery } from '@/services/api/profit.api'

const { data, isLoading, error } = useGetProfitReportQuery({})
```

### 4. Add Protected Routes

Create middleware to protect dashboard routes (see Next.js middleware documentation).

## 🎨 Using Components

### Design System Components

```typescript
import { Button } from '@/design-system/buttons'
import { Input } from '@/design-system/inputs'
import { Card, CardHeader, CardTitle, CardContent } from '@/design-system/cards'

<Button variant="primary" size="md" onClick={handleClick}>
  Click me
</Button>
```

### Layout Components

```typescript
import { Container, PageHeader } from '@/components/layout'

<Container size="lg">
  <PageHeader title="My Page" description="Page description" />
  {/* Content */}
</Container>
```

## 🔌 API Integration

All API calls use RTK Query. Example:

```typescript
import { useGetProductsQuery } from '@/services/api/inventory.api'

function MyComponent() {
  const { data, isLoading, error } = useGetProductsQuery({})
  
  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error occurred</div>
  
  return <div>{/* Render data */}</div>
}
```

## 📁 Project Structure

- `app/` - Next.js pages and routes
- `design-system/` - Pure UI components (no business logic)
- `components/` - Composite components (layout, navigation, etc.)
- `features/` - Business feature modules
- `services/api/` - RTK Query API endpoints
- `store/` - Redux store and slices
- `theme/` - Theme tokens (colors, spacing, typography)
- `hooks/` - Custom React hooks
- `utils/` - Utility functions

## 🐛 Troubleshooting

### TypeScript Errors
If you see TypeScript errors about missing modules, run:
```bash
npm install
```

### Build Errors
Clear Next.js cache:
```bash
rm -rf .next
npm run build
```

## 📚 Documentation

- [Next.js Documentation](https://nextjs.org/docs)
- [Redux Toolkit](https://redux-toolkit.js.org/)
- [RTK Query](https://redux-toolkit.js.org/rtk-query/overview)
- [Tailwind CSS](https://tailwindcss.com/docs)


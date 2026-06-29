# Beddora Frontend

A production-ready SaaS frontend built with Next.js (App Router), TypeScript, and RTK Query.

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## 📁 Project Structure

```
frontend-beddora-cosmos/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Authentication routes
│   ├── (dashboard)/       # Dashboard routes
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── design-system/         # Pure UI components
│   ├── buttons/
│   ├── inputs/
│   ├── tables/
│   ├── cards/
│   ├── modals/
│   ├── badges/
│   ├── loaders/
│   └── charts/
├── components/            # Composite components
│   ├── layout/
│   ├── navigation/
│   ├── filters/
│   ├── data-display/
│   └── feedback/
├── features/              # Business feature modules
│   ├── profit/
│   ├── inventory/
│   ├── ppc/
│   ├── alerts/
│   └── reports/
├── services/              # API services
│   └── api/
│       ├── baseApi.ts
│       ├── auth.api.ts
│       ├── profit.api.ts
│       ├── inventory.api.ts
│       └── ppc.api.ts
├── store/                 # Redux store
│   ├── store.ts
│   ├── auth.slice.ts
│   └── ui.slice.ts
├── theme/                 # Theme tokens
│   ├── colors.ts
│   ├── spacing.ts
│   ├── typography.ts
│   └── shadows.ts
├── hooks/                 # Custom React hooks
├── utils/                 # Utility functions
└── styles/                # Global styles
```

## 🎨 Design System

The design system consists of pure UI components with no business logic:

- **Buttons**: Primary, secondary, outline, ghost, danger variants
- **Inputs**: Text, textarea, select with labels and error states
- **Tables**: Full table component with header, body, rows
- **Cards**: Card container with header, content, footer
- **Modals**: Modal dialog with backdrop and close button
- **Badges**: Status badges with color variants
- **Loaders**: Spinner and loading overlay
- **Charts**: Line and bar charts using Recharts

## 🔌 API Integration

API services are set up using RTK Query:

1. **Base API** (`services/api/baseApi.ts`): Central API configuration
2. **Feature APIs**: Separate API files for each feature (auth, profit, inventory, ppc)
3. **Usage**: Import hooks from API files in your components

Example:
```typescript
import { useGetProfitReportQuery } from '@/services/api/profit.api'

const { data, isLoading, error } = useGetProfitReportQuery({})
```

## 🗂️ State Management

Redux Toolkit with RTK Query:

- **Store** (`store/store.ts`): Central Redux store
- **Slices**: Feature-specific slices (auth, ui)
- **Hooks**: Typed hooks (`useAppDispatch`, `useAppSelector`)

## 🎯 Features

### Authentication
- Login and register pages
- Auth state management
- Protected routes (to be implemented)

### Dashboard
- Overview page with stats
- Profit analysis
- Inventory management
- PPC campaigns
- Alerts
- Settings
- Admin panel

## 📝 Next Steps

1. **Connect to Backend**: Update API base URL in `services/api/baseApi.ts`
2. **Add Authentication**: Implement protected routes middleware
3. **Add Business Logic**: Connect feature components to APIs
4. **Enhance UI**: Add more components and polish existing ones
5. **Add Tests**: Set up testing framework (Jest, React Testing Library)

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Redux Toolkit + RTK Query
- **Charts**: Recharts
- **UI Components**: Custom design system

## 📄 License

MIT


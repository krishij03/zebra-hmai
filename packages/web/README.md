# @zebra/web

Modern web interface for Zebra HMAI - z/OS Performance Monitoring and Analytics.

## Tech Stack

- **Framework**: Next.js 16 with App Router
- **React**: React 19 with Server Components
- **State Management**: TanStack Query v5
- **Styling**: Tailwind CSS v4
- **Charts**: ECharts
- **Type Safety**: TypeScript 5.6+
- **HTTP Client**: Axios with interceptors
- **Authentication**: JWT with automatic token refresh

## Features

- **Authentication**: Secure JWT-based authentication with Next.js middleware
- **Real-time Monitoring**: Live updates for HMAI ingestion jobs
- **Multiple Dashboards**:
  - Main Dashboard with system status
  - RMF Monitor III metrics
  - RMF Post Processor reports
  - HMAI ingestion monitoring
  - Prometheus metrics explorer
  - LPAR management
  - Settings and configuration editor
- **Performance**: Optimized with React Server Components and TanStack Query caching
- **Responsive**: Mobile-friendly design with Tailwind CSS
- **Type-Safe**: Full TypeScript coverage with shared types from `@zebra/shared`

## Getting Started

### Prerequisites

- Node.js 22+ 
- pnpm 9+
- Running NestJS API at `http://localhost:3090`

### Installation

```bash
# From monorepo root
pnpm install

# Or from this package
cd packages/web
pnpm install
```

### Environment Variables

Create a `.env.local` file (see `.env.example`):

```bash
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3090/api/v2
NEXT_PUBLIC_API_TIMEOUT=30000

# Application
NEXT_PUBLIC_APP_NAME=Zebra HMAI
NEXT_PUBLIC_APP_VERSION=2.0.0
```

### Development

```bash
# Start development server
pnpm dev

# Open http://localhost:3000
```

### Production Build

```bash
# Build for production
pnpm build

# Start production server
pnpm start
```

## Project Structure

```
packages/web/
├── app/                    # Next.js App Router pages
│   ├── dashboard/         # Main dashboard
│   ├── hmai/             # HMAI ingestion monitoring
│   ├── rmf3/             # RMF Monitor III
│   ├── rmfpp/            # RMF Post Processor
│   ├── metrics/          # Prometheus metrics explorer
│   ├── lpars/            # LPAR management
│   ├── settings/         # Settings and config editor
│   ├── login/            # Login page
│   ├── layout.tsx        # Root layout with providers
│   ├── page.tsx          # Home page (redirects)
│   └── providers.tsx     # React Query provider
├── components/            # Reusable components
│   ├── layout/           # Layout components (navbar)
│   └── ui/               # UI components (button, card, etc.)
├── hooks/                 # Custom React hooks
│   ├── use-hmai.ts       # HMAI API hooks
│   └── use-rmf3.ts       # RMF3 API hooks
├── lib/                   # Utilities
│   ├── api-client.ts     # Axios instance with interceptors
│   └── auth.ts           # Authentication utilities
├── middleware.ts          # Next.js middleware for auth
└── package.json
```

## API Integration

The web app connects to the NestJS API (`@zebra/api`) via the configured API URL. All requests include:

- JWT authentication (automatic token refresh)
- CORS credentials
- Request/response interceptors
- Error handling

### Example Usage

```typescript
// Using React Query hooks
import { useHMAIIngestionStatus } from '@/hooks/use-hmai';

function MyComponent() {
  const { data, isLoading } = useHMAIIngestionStatus('LPAR1');
  // ...
}

// Direct API calls
import { apiClient } from '@/lib/api-client';

const response = await apiClient.get('/rmf3/LPAR1/cpu');
```

## Authentication Flow

1. User submits credentials on `/login`
2. API returns access token (1 hour) and refresh token (7 days)
3. Tokens stored in HTTP-only cookies
4. Middleware protects routes automatically
5. Axios interceptor refreshes expired tokens
6. On auth failure, redirect to login

## Available Scripts

- `pnpm dev` - Start development server (port 3000)
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint
- `pnpm format` - Format code with Biome
- `pnpm typecheck` - Check TypeScript types
- `pnpm clean` - Clean build artifacts

## Deployment

### Docker (Recommended)

```bash
# Build image
docker build -t zebra-web -f packages/web/Dockerfile .

# Run container
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_API_URL=http://api:3090/api/v2 \
  zebra-web
```

### Manual Deployment

```bash
# Build
pnpm build

# Start
NODE_ENV=production pnpm start
```

## Performance Considerations

- **Server Components**: Default to React Server Components for better performance
- **TanStack Query**: Aggressive caching (5 min stale time, 10 min garbage collection)
- **Code Splitting**: Automatic route-based code splitting via Next.js
- **Image Optimization**: Use Next.js `<Image>` component for optimized images
- **Chart Lazy Loading**: ECharts loaded dynamically where needed

## Accessibility

- Semantic HTML elements
- ARIA labels and roles
- Keyboard navigation support
- Focus management
- Screen reader friendly
- Color contrast compliance (WCAG 2.1 AA)

## Browser Support

- Chrome/Edge (last 2 versions)
- Firefox (last 2 versions)
- Safari (last 2 versions)

## Contributing

See the main repository [CONTRIBUTING.md](../../CONTRIBUTING.md) for guidelines.

## License

Same as parent project - see [LICENSE](../../LICENSE).

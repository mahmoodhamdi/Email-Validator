# Development Guide

This guide covers everything you need to know to develop and contribute to the Email Validator project.

## Prerequisites

- Node.js 18.x or later
- npm 9.x or later
- Git

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/mahmoodhamdi/Email-Validator.git
cd Email-Validator
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

Copy the example environment file:

```bash
cp .env.example .env.local
```

### 4. Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   │   ├── health/        # Health check endpoint
│   │   ├── validate/      # Single email validation
│   │   └── validate-bulk/ # Bulk email validation
│   ├── bulk/              # Bulk validation page
│   ├── history/           # Validation history page
│   └── api-docs/          # API documentation page
├── components/
│   ├── email/             # Email validation components
│   ├── layout/            # Layout components (Header, Footer)
│   └── ui/                # Reusable UI components (shadcn/ui)
├── hooks/                 # Custom React hooks
├── lib/
│   ├── data/             # Static data (disposable domains, etc.)
│   ├── validators/       # Validation logic modules
│   └── *.ts              # Utilities (cache, rate-limiter, etc.)
├── stores/               # Zustand state management
├── types/                # TypeScript type definitions
└── __tests__/            # Test files
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run lint:strict` | Run ESLint with zero warnings allowed |
| `npm run format` | Format code with Prettier |
| `npm run format:check` | Check code formatting |
| `npm test` | Run unit tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run test:e2e` | Run E2E tests |
| `npm run test:e2e:ui` | Run E2E tests with UI |
| `npm run test:all` | Run all tests |

## Testing

### Unit Tests

We use Jest and React Testing Library for unit tests:

```bash
# Run all unit tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch
```

Test files are located in `src/__tests__/` and follow the pattern:
- `*.test.ts` for utility/logic tests
- `*.test.tsx` for component tests

### E2E Tests

We use Playwright for end-to-end tests:

```bash
# Run E2E tests
npm run test:e2e

# Run with Playwright UI
npm run test:e2e:ui
```

E2E test files are in the `e2e/` directory.

### Coverage Requirements

The project requires minimum 70% coverage for:
- Branches
- Functions
- Lines
- Statements

## Code Style

### ESLint

The project uses ESLint with strict TypeScript rules. Run linting with:

```bash
npm run lint
```

Key rules:
- No unused variables (with `_` prefix exception)
- Prefer `const` over `let`
- No `console.log` (use `console.error` or `console.warn`)
- Strict equality (`===` instead of `==`)
- Always use curly braces for control statements

### Prettier

Code formatting is handled by Prettier:

```bash
# Format all files
npm run format

# Check formatting
npm run format:check
```

Configuration is in `.prettierrc`.

## Adding New Features

### 1. Adding a New Validator

Create a new file in `src/lib/validators/`:

```typescript
// src/lib/validators/my-check.ts
import type { MyCheck } from '@/types/email';

export function validateMyCheck(input: string): MyCheck {
  // Validation logic here
  return {
    valid: true,
    message: 'Check passed',
  };
}
```

Then integrate it in `src/lib/validators/index.ts`.

### 2. Adding a New API Endpoint

Create a new route in `src/app/api/`:

```typescript
// src/app/api/my-endpoint/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  // Handle POST request
  return NextResponse.json({ success: true });
}
```

### 3. Adding a New Component

Create the component in `src/components/`:

```typescript
// src/components/email/MyComponent.tsx
"use client";

interface MyComponentProps {
  // Props
}

export function MyComponent({ ...props }: MyComponentProps) {
  return (
    // JSX
  );
}
```

Don't forget to add tests in `src/__tests__/components/`.

## State Management

The project uses Zustand for state management:

- `useValidationStore` - Current validation state
- `useHistoryStore` - Validation history (persisted to localStorage)

## API Rate Limiting

Rate limiting is implemented at the middleware level:

| Endpoint | Limit |
|----------|-------|
| Single validation | 100 requests/minute |
| Bulk validation | 10 requests/minute |

## Caching

The application uses in-memory caching for:
- MX record lookups (5 min TTL)
- Domain validation results (5 min TTL)
- Full validation results (1 min TTL)

## Debugging

### Development Tools

1. React DevTools for component inspection
2. Network tab for API monitoring
3. Console for debugging output

### Common Issues

**Build fails with type errors:**
```bash
npm run lint
```
Fix all TypeScript/ESLint errors.

**Tests fail:**
```bash
npm test -- --verbose
```
Check individual test output for details.

**E2E tests timeout:**
Ensure the dev server is running for local E2E tests.

## Deployment

The project includes Docker support:

```bash
# Build Docker image
docker build -t email-validator .

# Run container
docker run -p 3000:3000 email-validator
```

Or use docker-compose:

```bash
docker-compose up
```

## Contributing

1. Create a feature branch from `main`
2. Make your changes with tests
3. Ensure all tests pass
4. Run lint and format checks
5. Create a pull request

See [CONTRIBUTING.md](../CONTRIBUTING.md) for detailed guidelines.

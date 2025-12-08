# Email Validator

A production-ready Email Validator web application built with Next.js 14, TypeScript, and Tailwind CSS.

## Features

### Core Validation
- **Syntax Validation** - RFC 5322 compliant email format checking
- **Domain Validation** - Check if domain exists and is valid
- **MX Record Lookup** - Verify mail server exists via DNS
- **Disposable Email Detection** - Block temporary/throwaway emails (500+ domains)
- **Role-Based Detection** - Identify emails like admin@, support@, info@
- **Free Provider Detection** - Identify Gmail, Yahoo, Outlook, etc.
- **Typo Suggestions** - Suggest corrections for common mistakes

### User Features
- Single email validation with detailed results
- Bulk validation (CSV/TXT upload or paste)
- Real-time validation as you type
- Export results to CSV or JSON
- Validation history (localStorage)
- Dark/Light mode
- Mobile responsive

### API Endpoints
- `POST /api/validate` - Validate single email
- `POST /api/validate-bulk` - Validate multiple emails
- `GET /api/health` - API health check

## Screenshots

### Home Page - Single Email Validation
![Home Page - Light Mode](screenshots/01-home-light-empty.png)
*Clean interface for single email validation*

### Dark Mode Support
![Home Page - Dark Mode](screenshots/02-home-dark-empty.png)
*Full dark mode support for comfortable viewing*

### Valid Email Validation
![Valid Email](screenshots/03-home-valid-email.png)
*Detailed validation results for valid emails*

### Invalid Email Detection
![Invalid Email](screenshots/04-home-invalid-syntax.png)
*Clear feedback for syntax errors*

### Disposable Email Detection
![Disposable Email](screenshots/05-home-disposable-email.png)
*Detection of temporary/disposable email addresses*

### Role-Based Email Detection
![Role-Based Email](screenshots/06-home-role-based-email.png)
*Identification of role-based email addresses*

### Typo Suggestions
![Typo Suggestion](screenshots/07-home-typo-suggestion.png)
*Smart suggestions for common email typos*

### Bulk Validation
![Bulk Validation](screenshots/08-bulk-empty.png)
*Validate multiple emails at once*

### Bulk Validation Results
![Bulk Results](screenshots/10-bulk-results.png)
*Comprehensive results for bulk validation*

### Validation History
![History Page](screenshots/11-history-page.png)
*Track your validation history*

### API Documentation
![API Docs](screenshots/12-api-docs.png)
*Built-in API documentation*

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS
- **Components**: Custom components inspired by shadcn/ui
- **State Management**: Zustand
- **Animations**: Framer Motion
- **Validation**: Zod
- **Forms**: React Hook Form
- **Icons**: Lucide React
- **Testing**: Jest, React Testing Library, Playwright

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/mahmoodhamdi/Email-Validator.git
cd Email-Validator
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
npm run build
npm start
```

### Docker

Run with Docker:

```bash
# Pull from GitHub Container Registry
docker pull ghcr.io/mahmoodhamdi/email-validator:latest

# Run the container
docker run -p 3000:3000 ghcr.io/mahmoodhamdi/email-validator:latest
```

Or use Docker Compose:

```bash
# Build and run
docker-compose up -d

# Stop
docker-compose down
```

Build locally:

```bash
# Build the image
docker build -t email-validator .

# Run the container
docker run -p 3000:3000 email-validator
```

## CI/CD

This project uses GitHub Actions for continuous integration and deployment:

- **CI Pipeline**: Runs on every push and PR
  - Linting and type checking
  - Unit tests with coverage
  - E2E tests with Playwright
  - Build verification

- **Docker Pipeline**: Runs on push to main
  - Builds multi-architecture images (amd64, arm64)
  - Pushes to GitHub Container Registry
  - Pushes to Docker Hub (if configured)

- **Release Pipeline**: Runs on version tags
  - Creates GitHub releases
  - Generates changelog

## Testing

This project includes comprehensive tests:

### Unit Tests
Unit tests cover all validators, hooks, and stores.

```bash
# Run all unit tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Integration Tests
Integration tests verify API routes work correctly.

```bash
# Integration tests are included in the main test suite
npm test
```

### E2E Tests
End-to-end tests using Playwright verify the complete user experience.

```bash
# Install Playwright browsers (first time only)
npx playwright install

# Run E2E tests
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui
```

### Test Structure

```
src/
├── __tests__/
│   ├── validators/           # Unit tests for validators
│   │   ├── index.test.ts
│   │   ├── syntax.test.ts
│   │   ├── disposable.test.ts
│   │   ├── role-based.test.ts
│   │   ├── free-provider.test.ts
│   │   └── typo.test.ts
│   ├── hooks/               # Unit tests for hooks
│   │   ├── useDebounce.test.ts
│   │   └── useLocalStorage.test.ts
│   ├── stores/              # Unit tests for stores
│   │   ├── history-store.test.ts
│   │   └── validation-store.test.ts
│   └── api/                 # Integration tests for API
│       ├── validate.test.ts
│       └── validate-bulk.test.ts
└── e2e/                     # E2E tests
    ├── home.spec.ts
    ├── bulk.spec.ts
    ├── history.spec.ts
    ├── api-docs.spec.ts
    ├── validation-cases.spec.ts
    └── dark-mode.spec.ts
```

### Test Coverage

| Category | Tests | Status |
|----------|-------|--------|
| Validators | 196 | Passing |
| Hooks | Included | Passing |
| Stores | Included | Passing |
| API Routes | Included | Passing |
| E2E | 15+ scenarios | Passing |

## API Usage

### Single Email Validation

```bash
curl -X POST https://your-domain/api/validate \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

### Bulk Email Validation

```bash
curl -X POST https://your-domain/api/validate-bulk \
  -H "Content-Type: application/json" \
  -d '{"emails": ["test1@example.com", "test2@gmail.com"]}'
```

## Response Format

```json
{
  "email": "test@example.com",
  "isValid": true,
  "score": 85,
  "deliverability": "deliverable",
  "risk": "low",
  "checks": {
    "syntax": { "valid": true, "message": "Email syntax is valid" },
    "domain": { "valid": true, "exists": true, "message": "Domain format is valid" },
    "mx": { "valid": true, "records": ["mx1.example.com"], "message": "Found 1 MX record(s)" },
    "disposable": { "isDisposable": false, "message": "Not a disposable email domain" },
    "roleBased": { "isRoleBased": false, "role": null },
    "freeProvider": { "isFree": false, "provider": null },
    "typo": { "hasTypo": false, "suggestion": null }
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   ├── bulk/              # Bulk validation page
│   ├── history/           # History page
│   └── api-docs/          # API documentation page
├── components/
│   ├── ui/                # UI components (button, input, card, etc.)
│   ├── email/             # Email validation components
│   └── layout/            # Layout components (header, footer)
├── lib/
│   ├── data/              # Data files (disposable domains, etc.)
│   └── validators/        # Validation logic
├── hooks/                 # Custom React hooks
├── stores/                # Zustand stores
└── types/                 # TypeScript types
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Author

**Mahmood Hamdi**

- GitHub: [@mahmoodhamdi](https://github.com/mahmoodhamdi)
- Email: mwm.softwars.solutions@gmail.com
- Email: hmdy7486@gmail.com
- Phone: +201019793768

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## Support

If you have any questions or need help, feel free to reach out via email or open an issue on GitHub.

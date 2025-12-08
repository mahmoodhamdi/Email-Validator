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

MIT License

## Author

[mahmoodhamdi](https://github.com/mahmoodhamdi)

# @email-validator/cli

Command-line tool for validating email addresses with comprehensive checks including syntax validation, domain/MX verification, disposable email detection, and more.

## Installation

### From npm (when published)

```bash
npm install -g @email-validator/cli
```

### From source

```bash
cd cli
npm install
npm run build
npm link  # Makes 'email-validator' and 'ev' commands available globally
```

## Usage

### Single Email Validation

```bash
# Basic validation
email-validator validate user@example.com

# Short alias
ev v user@example.com

# With detailed output
email-validator validate user@gmail.com --verbose

# Output as JSON
email-validator validate user@gmail.com -f json

# Output as table
email-validator validate user@gmail.com -f table
```

### Bulk Validation

```bash
# Validate emails from file (one per line)
email-validator bulk emails.txt

# Short alias
ev b emails.txt

# Export results to CSV
email-validator bulk emails.txt -o results.csv

# Export results to JSON
email-validator bulk emails.txt -o results.json

# Filter results (valid, invalid, risky)
email-validator bulk emails.txt --filter valid
email-validator bulk emails.txt --filter invalid
email-validator bulk emails.txt --filter risky

# Adjust concurrency for faster processing
email-validator bulk emails.txt -c 20

# Disable progress bar
email-validator bulk emails.txt --no-progress
```

### Show Examples

```bash
email-validator examples
```

## Output Formats

### Simple (default for single validation)

```
user@gmail.com: ✓ VALID
Score: 100/100
Deliverability: deliverable
Risk: low
```

### Table

```
┌──────────────┬─────────────────┐
│ Property     │ Value           │
├──────────────┼─────────────────┤
│ Email        │ user@gmail.com  │
│ Valid        │ Yes             │
│ Score        │ 100/100         │
│ Deliverability │ deliverable   │
│ Risk         │ low             │
└──────────────┴─────────────────┘
```

### JSON

```json
{
  "email": "user@gmail.com",
  "isValid": true,
  "score": 100,
  "deliverability": "deliverable",
  "risk": "low",
  "checks": {
    "syntax": { "valid": true, "message": "Valid syntax" },
    "domain": { "valid": true, "exists": true, "message": "Domain exists" },
    "mx": { "valid": true, "records": ["..."], "message": "Found MX records" },
    "disposable": { "isDisposable": false, "message": "Not a known disposable domain" },
    "roleBased": { "isRoleBased": false, "role": null },
    "freeProvider": { "isFree": true, "provider": "Gmail" },
    "typo": { "hasTypo": false, "suggestion": null }
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Validation Checks

| Check | Description |
|-------|-------------|
| **Syntax** | RFC 5322 compliant email format validation |
| **Domain** | Verifies domain exists via DNS lookup |
| **MX Records** | Checks for mail server records |
| **Disposable** | Detects temporary/throwaway email domains |
| **Role-based** | Identifies generic emails (admin@, support@, etc.) |
| **Free Provider** | Identifies free email providers (Gmail, Yahoo, etc.) |
| **Typo Detection** | Suggests corrections for common domain typos |

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | All emails valid |
| 1 | One or more emails invalid |
| 2 | Error occurred (file not found, etc.) |

## Input File Formats

The CLI accepts:

- **Plain text**: One email per line
- **CSV**: Automatically detects email column
- **TSV**: Tab-separated values

Example `emails.txt`:
```
user1@gmail.com
user2@yahoo.com
user3@company.com
```

Example `emails.csv`:
```
name,email,department
John Doe,john@gmail.com,Sales
Jane Smith,jane@yahoo.com,Marketing
```

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev -- validate user@example.com

# Build
npm run build

# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

## License

MIT

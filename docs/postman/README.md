# Postman Collection

This directory contains the Postman collection and environments for testing the Email Validator API.

## Quick Start

1. **Import Collection:**
   - Open Postman
   - Click "Import" button
   - Select `Email-Validator-API.postman_collection.json`

2. **Import Environment:**
   - Click "Import" button
   - Select an environment from `environments/` folder

3. **Set API Key (if required):**
   - Select your environment
   - Set the `api_key` variable

4. **Start Testing:**
   - Select a request from the collection
   - Click "Send"

## Collection Structure

```
Email Validator API/
├── Validation/
│   ├── Validate Single Email
│   ├── Validate Disposable Email
│   ├── Validate with Typo
│   ├── Validate Role-Based Email
│   └── Bulk Validate Emails
├── System/
│   ├── Health Check
│   └── CSP Report
└── Error Handling/
    ├── Missing Email Field
    ├── Invalid JSON
    ├── Bulk - Empty Emails Array
    ├── Bulk - Too Many Emails
    └── Rate Limit Exceeded
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/validate` | Validate single email |
| POST | `/api/validate-bulk` | Validate multiple emails |
| GET | `/api/health` | Health check |
| POST | `/api/csp-report` | CSP violation reports |

## Environments

| Environment | Base URL | Description |
|-------------|----------|-------------|
| Local | http://localhost:3000 | Local development |
| Docker | http://localhost:3000 | Docker container |
| Production | https://your-domain.com | Production server |

## Test Scripts

Each request includes test scripts that validate:
- Response status codes
- Response structure
- Required fields
- Business logic (e.g., typo detection, disposable email detection)

### Running Tests

**Single Request:**
- Select a request and click "Send"
- View test results in the "Test Results" tab

**All Tests:**
- Right-click on the collection
- Select "Run Collection"
- Click "Run Email Validator API"

## Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `base_url` | API base URL | http://localhost:3000 |
| `api_key` | API authentication key | your-api-key |

## Request Examples

### Validate Single Email

```bash
curl -X POST http://localhost:3000/api/validate \
  -H "Content-Type: application/json" \
  -d '{"email": "test@gmail.com"}'
```

### Bulk Validate Emails

```bash
curl -X POST http://localhost:3000/api/validate-bulk \
  -H "Content-Type: application/json" \
  -d '{"emails": ["test1@gmail.com", "test2@yahoo.com"]}'
```

### Health Check

```bash
curl http://localhost:3000/api/health
```

## Response Format

### Single Email Validation

```json
{
  "email": "test@gmail.com",
  "isValid": true,
  "score": 100,
  "deliverability": "deliverable",
  "risk": "low",
  "checks": {
    "syntax": {"valid": true, "message": "Email syntax is valid"},
    "domain": {"valid": true, "exists": true},
    "mx": {"valid": true, "records": ["gmail-smtp-in.l.google.com"]},
    "disposable": {"isDisposable": false},
    "roleBased": {"isRoleBased": false, "role": null},
    "freeProvider": {"isFree": true, "provider": "Gmail"},
    "typo": {"hasTypo": false, "suggestion": null}
  },
  "timestamp": "2025-01-15T10:00:00.000Z"
}
```

### Bulk Email Validation

```json
{
  "results": [
    {
      "email": "test@gmail.com",
      "isValid": true,
      "score": 100,
      "deliverability": "deliverable",
      "risk": "low"
    }
  ],
  "metadata": {
    "total": 1,
    "completed": 1,
    "timedOut": false,
    "processingTimeMs": 150
  }
}
```

## Rate Limits

| Tier | Limit |
|------|-------|
| Anonymous | 20 req/min |
| Free | 100 req/min |
| Pro | 1000 req/min |
| Enterprise | 10000 req/min |

## Error Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 400 | Bad Request (invalid input) |
| 429 | Rate Limit Exceeded |
| 500 | Internal Server Error |

## Importing via URL

You can also import the collection directly in Postman using this URL:

```
https://raw.githubusercontent.com/mahmoodhamdi/Email-Validator/main/docs/postman/Email-Validator-API.postman_collection.json
```

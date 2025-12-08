import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RATE_LIMITS } from "@/lib/constants";

export const metadata = {
  title: "API Documentation - Email Validator",
  description: "API documentation for the Email Validator service",
};

export default function ApiDocsPage() {
  return (
    <div className="container py-8 md:py-12">
      <div className="mx-auto max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
            API Documentation
          </h1>
          <p className="text-lg text-muted-foreground">
            Integrate email validation into your applications with our REST API.
          </p>
        </div>

        <div className="space-y-6">
          {/* Single Validation */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Badge>POST</Badge>
                <CardTitle className="text-lg">/api/validate</CardTitle>
              </div>
              <CardDescription>
                Validate a single email address
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Request Body</h4>
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
{`{
  "email": "test@example.com"
}`}
                </pre>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Response</h4>
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
{`{
  "email": "test@example.com",
  "isValid": true,
  "score": 85,
  "deliverability": "deliverable",
  "risk": "low",
  "checks": {
    "syntax": {
      "valid": true,
      "message": "Email syntax is valid"
    },
    "domain": {
      "valid": true,
      "exists": true,
      "message": "Domain format is valid"
    },
    "mx": {
      "valid": true,
      "records": ["mx1.example.com", "mx2.example.com"],
      "message": "Found 2 MX record(s)"
    },
    "disposable": {
      "isDisposable": false,
      "message": "Not a disposable email domain"
    },
    "roleBased": {
      "isRoleBased": false,
      "role": null
    },
    "freeProvider": {
      "isFree": false,
      "provider": null
    },
    "typo": {
      "hasTypo": false,
      "suggestion": null
    },
    "blacklisted": {
      "isBlacklisted": false,
      "lists": []
    },
    "catchAll": {
      "isCatchAll": false
    }
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}`}
                </pre>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Example (cURL)</h4>
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
{`curl -X POST https://your-domain/api/validate \\
  -H "Content-Type: application/json" \\
  -d '{"email": "test@example.com"}'`}
                </pre>
              </div>
            </CardContent>
          </Card>

          {/* Bulk Validation */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Badge>POST</Badge>
                <CardTitle className="text-lg">/api/validate-bulk</CardTitle>
              </div>
              <CardDescription>
                Validate multiple email addresses (max {RATE_LIMITS.maxBulkSize} per request)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Request Body</h4>
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
{`{
  "emails": [
    "test1@example.com",
    "test2@example.com",
    "test3@gmail.com"
  ]
}`}
                </pre>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Response</h4>
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
{`[
  {
    "email": "test1@example.com",
    "isValid": true,
    "score": 85,
    ...
  },
  {
    "email": "test2@example.com",
    "isValid": true,
    "score": 80,
    ...
  },
  {
    "email": "test3@gmail.com",
    "isValid": true,
    "score": 95,
    ...
  }
]`}
                </pre>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Example (cURL)</h4>
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
{`curl -X POST https://your-domain/api/validate-bulk \\
  -H "Content-Type: application/json" \\
  -d '{"emails": ["test1@example.com", "test2@gmail.com"]}'`}
                </pre>
              </div>
            </CardContent>
          </Card>

          {/* Health Check */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">GET</Badge>
                <CardTitle className="text-lg">/api/health</CardTitle>
              </div>
              <CardDescription>
                Check API health status
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Response</h4>
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
{`{
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "endpoints": {
    "validate": "POST /api/validate",
    "validateBulk": "POST /api/validate-bulk",
    "health": "GET /api/health"
  }
}`}
                </pre>
              </div>
            </CardContent>
          </Card>

          {/* Response Fields */}
          <Card>
            <CardHeader>
              <CardTitle>Response Fields Explained</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <h4 className="font-semibold">isValid</h4>
                    <p className="text-sm text-muted-foreground">
                      Boolean indicating if the email passes all critical checks
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-semibold">score</h4>
                    <p className="text-sm text-muted-foreground">
                      Quality score from 0-100 based on all validation checks
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-semibold">deliverability</h4>
                    <p className="text-sm text-muted-foreground">
                      deliverable | risky | undeliverable | unknown
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-semibold">risk</h4>
                    <p className="text-sm text-muted-foreground">
                      low | medium | high - risk level assessment
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Rate Limits */}
          <Card>
            <CardHeader>
              <CardTitle>Rate Limits</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p>
                  <strong>Single Validation:</strong> {RATE_LIMITS.singleValidation.max} requests per minute
                </p>
                <p>
                  <strong>Bulk Validation:</strong> {RATE_LIMITS.bulkValidation.max} requests per minute
                </p>
                <p>
                  <strong>Max Bulk Size:</strong> {RATE_LIMITS.maxBulkSize} emails per request
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

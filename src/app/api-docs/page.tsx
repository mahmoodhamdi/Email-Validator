import { Suspense } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RATE_LIMITS } from "@/lib/constants";
import { SwaggerUIWrapper } from "@/components/SwaggerUI";
import { FileJson, BookOpen } from "lucide-react";

export const metadata = {
  title: "API Documentation - Email Validator",
  description: "Interactive API documentation for the Email Validator service with Swagger UI",
};

function SwaggerLoading() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );
}

export default function ApiDocsPage() {
  return (
    <div className="container py-8 md:py-12">
      <div className="mx-auto max-w-5xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
            API Documentation
          </h1>
          <p className="text-lg text-muted-foreground">
            Integrate email validation into your applications with our REST API.
          </p>
        </div>

        <Tabs defaultValue="interactive" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="interactive" className="flex items-center gap-2">
              <FileJson className="h-4 w-4" />
              Interactive (Swagger)
            </TabsTrigger>
            <TabsTrigger value="static" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Documentation
            </TabsTrigger>
          </TabsList>

          <TabsContent value="interactive" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle>Interactive API Explorer</CardTitle>
                <CardDescription>
                  Try out the API endpoints directly from this page. Click on an endpoint to expand it and use the &quot;Try it out&quot; button.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Suspense fallback={<SwaggerLoading />}>
                  <SwaggerUIWrapper specUrl="/api-spec.yaml" />
                </Suspense>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="static" className="mt-0">
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
{`{
  "results": [
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
    }
  ],
  "metadata": {
    "total": 3,
    "duplicatesRemoved": 0,
    "invalidRemoved": 0
  }
}`}
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

              {/* Authentication */}
              <Card>
                <CardHeader>
                  <CardTitle>Authentication</CardTitle>
                  <CardDescription>
                    API key authentication for external requests
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      When API authentication is enabled, external requests require a valid API key.
                      Same-origin requests from the frontend are always allowed without a key.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Passing the API Key</h4>
                    <div className="space-y-2 text-sm">
                      <p><strong>Option 1:</strong> X-API-Key header (recommended)</p>
                      <pre className="bg-muted p-2 rounded text-xs">X-API-Key: your-api-key</pre>
                      <p><strong>Option 2:</strong> Authorization Bearer token</p>
                      <pre className="bg-muted p-2 rounded text-xs">Authorization: Bearer your-api-key</pre>
                      <p><strong>Option 3:</strong> Query parameter</p>
                      <pre className="bg-muted p-2 rounded text-xs">/api/validate?api_key=your-api-key</pre>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">API Key Tiers</h4>
                    <div className="grid gap-2 text-sm">
                      <div className="flex justify-between py-1 border-b">
                        <span><Badge variant="outline">Free</Badge></span>
                        <span>100 requests/min</span>
                      </div>
                      <div className="flex justify-between py-1 border-b">
                        <span><Badge variant="outline">Pro</Badge></span>
                        <span>1,000 requests/min</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span><Badge variant="outline">Enterprise</Badge></span>
                        <span>10,000 requests/min</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Example with API Key</h4>
                    <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
{`curl -X POST https://your-domain/api/validate \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: your-api-key" \\
  -d '{"email": "test@example.com"}'`}
                    </pre>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Error Responses</h4>
                    <div className="space-y-2 text-sm">
                      <p><strong>401 Unauthorized</strong> - Missing or invalid API key</p>
                      <pre className="bg-muted p-2 rounded text-xs">{`{"error": "API key is required", "code": "MISSING_KEY"}`}</pre>
                      <pre className="bg-muted p-2 rounded text-xs">{`{"error": "Invalid API key", "code": "INVALID_KEY"}`}</pre>
                      <pre className="bg-muted p-2 rounded text-xs">{`{"error": "API key has expired", "code": "EXPIRED_KEY"}`}</pre>
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
                    <p className="text-sm text-muted-foreground mt-4">
                      Rate limits vary by API key tier. See Authentication section above.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* OpenAPI Spec Download */}
              <Card>
                <CardHeader>
                  <CardTitle>OpenAPI Specification</CardTitle>
                  <CardDescription>
                    Download the OpenAPI 3.0 specification for code generation or import into tools like Postman
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-4">
                  <a
                    href="/openapi.json"
                    download="email-validator-api.json"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    <FileJson className="h-4 w-4" />
                    Download OpenAPI Spec (JSON)
                  </a>
                  <a
                    href="/api-spec.yaml"
                    download="email-validator-api.yaml"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors"
                  >
                    <FileJson className="h-4 w-4" />
                    Download OpenAPI Spec (YAML)
                  </a>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

"use client";

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  Loader2,
  FileText,
  Download,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import type { ValidationResult } from "@/types/email";
import { downloadFile } from "@/lib/utils";
import { RATE_LIMITS } from "@/lib/constants";

export function BulkValidator() {
  const [emails, setEmails] = useState("");
  const [results, setResults] = useState<ValidationResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseEmails = (input: string): string[] => {
    const lines = input
      .split(/[\n,;]/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && line.includes("@"));
    return [...new Set(lines)].slice(0, RATE_LIMITS.maxBulkSize);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setEmails(content);
    };
    reader.readAsText(file);
  };

  const handleValidate = useCallback(async () => {
    const emailList = parseEmails(emails);
    if (emailList.length === 0) return;

    setIsLoading(true);
    setResults([]);
    setProgress(0);

    try {
      const response = await fetch("/api/validate-bulk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ emails: emailList }),
      });

      if (!response.ok) {
        throw new Error("Validation failed");
      }

      const validationResults: ValidationResult[] = await response.json();
      setResults(validationResults);
      setProgress(100);
    } catch (error) {
      console.error("Bulk validation error:", error);
    } finally {
      setIsLoading(false);
    }
  }, [emails]);

  const handleExportCSV = () => {
    const headers = [
      "Email",
      "Valid",
      "Score",
      "Deliverability",
      "Risk",
      "Disposable",
      "Role-Based",
      "Free Provider",
    ];
    const rows = results.map((r) => [
      r.email,
      r.isValid ? "Yes" : "No",
      r.score.toString(),
      r.deliverability,
      r.risk,
      r.checks.disposable.isDisposable ? "Yes" : "No",
      r.checks.roleBased.isRoleBased ? "Yes" : "No",
      r.checks.freeProvider.isFree ? "Yes" : "No",
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    downloadFile(csv, "email-validation-results.csv", "text/csv");
  };

  const handleExportJSON = () => {
    downloadFile(
      JSON.stringify(results, null, 2),
      "email-validation-results.json",
      "application/json"
    );
  };

  const handleClear = () => {
    setEmails("");
    setResults([]);
    setProgress(0);
  };

  const emailCount = parseEmails(emails).length;
  const validCount = results.filter((r) => r.isValid).length;
  const invalidCount = results.filter((r) => !r.isValid).length;
  const riskyCount = results.filter(
    (r) => r.deliverability === "risky"
  ).length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Bulk Email Validation
          </CardTitle>
          <CardDescription>
            Upload a CSV/TXT file or paste multiple emails (one per line, max{" "}
            {RATE_LIMITS.maxBulkSize} emails)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".csv,.txt"
              className="hidden"
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
            >
              <Upload className="mr-2 h-4 w-4" />
              Upload File
            </Button>
            <Button
              variant="outline"
              onClick={handleClear}
              disabled={isLoading || (!emails && results.length === 0)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Clear
            </Button>
          </div>

          <Textarea
            value={emails}
            onChange={(e) => setEmails(e.target.value)}
            placeholder="Enter emails (one per line or comma-separated)&#10;example@gmail.com&#10;test@yahoo.com&#10;user@company.com"
            className="min-h-[200px] font-mono text-sm"
            disabled={isLoading}
          />

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {emailCount} email{emailCount !== 1 ? "s" : ""} detected
            </span>
            <Button
              onClick={handleValidate}
              disabled={isLoading || emailCount === 0}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Validating...
                </>
              ) : (
                "Validate All"
              )}
            </Button>
          </div>

          {isLoading && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-sm text-center text-muted-foreground">
                Processing emails...
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <AnimatePresence>
        {results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Results</CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleExportCSV}>
                      <Download className="mr-2 h-4 w-4" />
                      CSV
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleExportJSON}>
                      <Download className="mr-2 h-4 w-4" />
                      JSON
                    </Button>
                  </div>
                </div>
                <div className="flex gap-4 flex-wrap">
                  <Badge variant="success" className="gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    {validCount} Valid
                  </Badge>
                  <Badge variant="destructive" className="gap-1">
                    <XCircle className="h-3 w-3" />
                    {invalidCount} Invalid
                  </Badge>
                  <Badge variant="warning" className="gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {riskyCount} Risky
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="max-h-[400px] overflow-y-auto space-y-2">
                  {results.map((result, index) => (
                    <motion.div
                      key={result.email}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.02 }}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {result.isValid ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500 shrink-0" />
                        )}
                        <span className="truncate text-sm">{result.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            result.score >= 80
                              ? "success"
                              : result.score >= 50
                              ? "warning"
                              : "destructive"
                          }
                        >
                          {result.score}
                        </Badge>
                        <Badge
                          variant={
                            result.risk === "low"
                              ? "success"
                              : result.risk === "medium"
                              ? "warning"
                              : "destructive"
                          }
                        >
                          {result.risk}
                        </Badge>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

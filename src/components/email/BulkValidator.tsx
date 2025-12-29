"use client";

import { useState, useCallback, useRef, useMemo } from "react";
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
  Filter,
  Eye,
  Copy,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ValidationResult } from "@/types/email";
import { downloadFile } from "@/lib/utils";
import { RATE_LIMITS, INPUT_LIMITS } from "@/lib/constants";
import { toast } from "@/hooks/useToast";

// File validation constants
const MAX_FILE_SIZE = INPUT_LIMITS.maxFileSize;
const ALLOWED_FILE_TYPES = [".csv", ".txt"];
const ALLOWED_MIME_TYPES = ["text/csv", "text/plain", "application/vnd.ms-excel"];

// Export filter options
type ExportFilter = "all" | "valid" | "invalid" | "risky";

export function BulkValidator() {
  const [emails, setEmails] = useState("");
  const [results, setResults] = useState<ValidationResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const [exportFilter, setExportFilter] = useState<ExportFilter>("all");
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse emails from input with better CSV support
  const parseEmails = useCallback((input: string): string[] => {
    const lines = input.split(/[\n\r]+/);

    // Check if first line looks like a CSV header
    const firstLine = lines[0]?.toLowerCase() || "";
    const hasHeader = firstLine.includes("email") || firstLine.includes("e-mail");
    const startIndex = hasHeader ? 1 : 0;

    const emails: string[] = [];

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) {
        continue;
      }

      // Split by common delimiters (comma, semicolon, tab)
      const parts = line.split(/[,;\t]/);

      // Find any email-like values in the parts
      for (const part of parts) {
        const trimmed = part.trim().replace(/^["']|["']$/g, ""); // Remove quotes
        if (trimmed.includes("@") && trimmed.length >= 5) {
          emails.push(trimmed.toLowerCase());
        }
      }
    }

    // Remove duplicates and limit
    return [...new Set(emails)].slice(0, RATE_LIMITS.maxBulkSize);
  }, []);

  // Validate file before processing
  const validateFile = (file: File): { valid: boolean; error?: string } => {
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return {
        valid: false,
        error: `File too large. Maximum size is ${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB`,
      };
    }

    // Check file type
    const extension = "." + file.name.split(".").pop()?.toLowerCase();
    const isValidType =
      ALLOWED_MIME_TYPES.includes(file.type) ||
      ALLOWED_FILE_TYPES.includes(extension);

    if (!isValidType) {
      return {
        valid: false,
        error: "Invalid file type. Please upload a CSV or TXT file.",
      };
    }

    return { valid: true };
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    // Validate file
    const validation = validateFile(file);
    if (!validation.valid) {
      toast({
        title: "Invalid file",
        description: validation.error,
        variant: "destructive",
      });
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setEmails(content);
      setUploadedFileName(file.name);
      setShowPreview(true);
      toast({
        title: "File loaded",
        description: `${file.name} (${Math.round(file.size / 1024)}KB)`,
      });
    };
    reader.onerror = () => {
      toast({
        title: "Error reading file",
        description: "Could not read the file. Please try again.",
        variant: "destructive",
      });
    };
    reader.readAsText(file);
  };

  const handleValidate = useCallback(async () => {
    const emailList = parseEmails(emails);
    if (emailList.length === 0) {
      return;
    }

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
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Validation failed");
      }

      const data = await response.json();
      // Handle both old format (array) and new format (object with results)
      const validationResults: ValidationResult[] = Array.isArray(data) ? data : data.results;
      setResults(validationResults);
      setProgress(100);

      const validCount = validationResults.filter((r) => r.isValid).length;
      toast({
        title: "Validation complete",
        description: `${validCount} of ${validationResults.length} emails are valid`,
        variant: validCount === validationResults.length ? "success" : "default",
      });
    } catch (error) {
      console.error("Bulk validation error:", error);
      toast({
        title: "Validation failed",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [emails, parseEmails]);

  // Filter results based on export filter
  const getFilteredResults = useCallback(
    (filter: ExportFilter): ValidationResult[] => {
      switch (filter) {
        case "valid":
          return results.filter((r) => r.isValid);
        case "invalid":
          return results.filter((r) => !r.isValid);
        case "risky":
          return results.filter(
            (r) => r.risk === "high" || r.deliverability === "risky"
          );
        default:
          return results;
      }
    },
    [results]
  );

  const handleExportCSV = () => {
    const filteredResults = getFilteredResults(exportFilter);
    if (filteredResults.length === 0) {
      toast({
        title: "No results to export",
        description: "There are no results matching the current filter.",
        variant: "destructive",
      });
      return;
    }

    const headers = [
      "Email",
      "Valid",
      "Score",
      "Deliverability",
      "Risk",
      "Disposable",
      "Role-Based",
      "Free Provider",
      "Blacklisted",
      "Catch-All",
    ];
    const rows = filteredResults.map((r) => [
      r.email,
      r.isValid ? "Yes" : "No",
      r.score.toString(),
      r.deliverability,
      r.risk,
      r.checks.disposable.isDisposable ? "Yes" : "No",
      r.checks.roleBased.isRoleBased ? "Yes" : "No",
      r.checks.freeProvider.isFree ? "Yes" : "No",
      r.checks.blacklisted.isBlacklisted ? "Yes" : "No",
      r.checks.catchAll.isCatchAll ? "Yes" : "No",
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const filterSuffix = exportFilter !== "all" ? `-${exportFilter}` : "";
    downloadFile(csv, `email-validation-results${filterSuffix}.csv`, "text/csv");
    toast({
      title: "Exported to CSV",
      description: `${filteredResults.length} results saved`,
      variant: "success",
    });
  };

  const handleExportJSON = () => {
    const filteredResults = getFilteredResults(exportFilter);
    if (filteredResults.length === 0) {
      toast({
        title: "No results to export",
        description: "There are no results matching the current filter.",
        variant: "destructive",
      });
      return;
    }

    const filterSuffix = exportFilter !== "all" ? `-${exportFilter}` : "";
    downloadFile(
      JSON.stringify(filteredResults, null, 2),
      `email-validation-results${filterSuffix}.json`,
      "application/json"
    );
    toast({
      title: "Exported to JSON",
      description: `${filteredResults.length} results saved`,
      variant: "success",
    });
  };

  const handleCopyEmails = async () => {
    const filteredResults = getFilteredResults(exportFilter);
    if (filteredResults.length === 0) {
      toast({
        title: "No results to copy",
        description: "There are no results matching the current filter.",
        variant: "destructive",
      });
      return;
    }

    const emailList = filteredResults.map((r) => r.email).join("\n");
    try {
      await navigator.clipboard.writeText(emailList);
      toast({
        title: "Copied to clipboard",
        description: `${filteredResults.length} emails copied`,
        variant: "success",
      });
    } catch {
      toast({
        title: "Failed to copy",
        description: "Could not copy to clipboard.",
        variant: "destructive",
      });
    }
  };

  const handleClear = () => {
    setEmails("");
    setResults([]);
    setProgress(0);
    setShowPreview(false);
    setUploadedFileName(null);
    setExportFilter("all");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Memoize parsed emails for preview
  const parsedEmails = useMemo(() => parseEmails(emails), [emails, parseEmails]);
  const emailCount = parsedEmails.length;
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
          <div className="flex gap-2 flex-wrap">
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
            {emailCount > 0 && (
              <Button
                variant="outline"
                onClick={() => setShowPreview(!showPreview)}
                disabled={isLoading}
              >
                <Eye className="mr-2 h-4 w-4" />
                {showPreview ? "Hide" : "Show"} Preview
              </Button>
            )}
            <Button
              variant="outline"
              onClick={handleClear}
              disabled={isLoading || (!emails && results.length === 0)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Clear
            </Button>
          </div>

          {uploadedFileName && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-2 rounded-md">
              <FileText className="h-4 w-4" />
              <span>Loaded: {uploadedFileName}</span>
            </div>
          )}

          <Textarea
            value={emails}
            onChange={(e) => {
              setEmails(e.target.value);
              setUploadedFileName(null);
            }}
            placeholder="Enter emails (one per line or comma-separated)&#10;example@gmail.com&#10;test@yahoo.com&#10;user@company.com"
            className="min-h-[200px] font-mono text-sm"
            disabled={isLoading}
          />

          {/* Email Preview */}
          <AnimatePresence>
            {showPreview && emailCount > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      Preview ({Math.min(10, emailCount)} of {emailCount})
                    </span>
                    {emailCount > RATE_LIMITS.maxBulkSize && (
                      <Badge variant="warning">
                        Limited to {RATE_LIMITS.maxBulkSize} emails
                      </Badge>
                    )}
                  </div>
                  <div className="max-h-[150px] overflow-y-auto space-y-1">
                    {parsedEmails.slice(0, 10).map((email, i) => (
                      <div
                        key={i}
                        className="text-sm font-mono bg-background px-2 py-1 rounded"
                      >
                        {email}
                      </div>
                    ))}
                    {emailCount > 10 && (
                      <div className="text-sm text-muted-foreground text-center py-1">
                        ... and {emailCount - 10} more
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {emailCount} email{emailCount !== 1 ? "s" : ""} detected
              {emailCount > RATE_LIMITS.maxBulkSize && (
                <span className="text-warning ml-1">
                  (max {RATE_LIMITS.maxBulkSize})
                </span>
              )}
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
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <CardTitle>Results</CardTitle>
                  <div className="flex gap-2 flex-wrap">
                    <Select
                      value={exportFilter}
                      onValueChange={(value) => setExportFilter(value as ExportFilter)}
                    >
                      <SelectTrigger className="w-[130px] h-9">
                        <Filter className="mr-2 h-4 w-4" />
                        <SelectValue placeholder="Filter" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All ({results.length})</SelectItem>
                        <SelectItem value="valid">Valid ({validCount})</SelectItem>
                        <SelectItem value="invalid">Invalid ({invalidCount})</SelectItem>
                        <SelectItem value="risky">Risky ({riskyCount})</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm" onClick={handleCopyEmails}>
                      <Copy className="mr-2 h-4 w-4" />
                      Copy
                    </Button>
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

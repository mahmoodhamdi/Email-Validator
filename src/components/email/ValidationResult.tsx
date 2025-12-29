"use client";

import { motion } from "framer-motion";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Mail,
  Globe,
  Server,
  Trash2,
  User,
  Gift,
  AlertCircle,
  Copy,
  Download,
  Shield,
  Inbox,
  MailCheck,
} from "lucide-react";
import type { ValidationResult as ValidationResultType } from "@/types/email";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScoreIndicator } from "./ScoreIndicator";
import { cn, copyToClipboard, downloadFile } from "@/lib/utils";
import { toast } from "@/hooks/useToast";

interface ValidationResultProps {
  result: ValidationResultType;
}

export function ValidationResult({ result }: ValidationResultProps) {
  const handleCopy = async () => {
    try {
      await copyToClipboard(JSON.stringify(result, null, 2));
      toast({
        title: "Copied to clipboard",
        description: "Validation result has been copied",
        variant: "success",
      });
    } catch {
      toast({
        title: "Failed to copy",
        description: "Could not copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const handleExport = () => {
    downloadFile(
      JSON.stringify(result, null, 2),
      `email-validation-${result.email}.json`,
      "application/json"
    );
    toast({
      title: "Exported successfully",
      description: `Saved as email-validation-${result.email}.json`,
      variant: "success",
    });
  };

  const checks = [
    {
      icon: Mail,
      label: "Syntax",
      valid: result.checks.syntax.valid,
      message: result.checks.syntax.message,
    },
    {
      icon: Globe,
      label: "Domain",
      valid: result.checks.domain.valid,
      message: result.checks.domain.message,
    },
    {
      icon: Server,
      label: "MX Records",
      valid: result.checks.mx.valid,
      message: result.checks.mx.message,
      extra: result.checks.mx.records.length > 0 ? result.checks.mx.records.slice(0, 3).join(", ") : undefined,
    },
    {
      icon: Trash2,
      label: "Disposable",
      valid: !result.checks.disposable.isDisposable,
      message: result.checks.disposable.message,
      inverted: true,
    },
    {
      icon: User,
      label: "Role-Based",
      valid: !result.checks.roleBased.isRoleBased,
      message: result.checks.roleBased.isRoleBased
        ? `Role: ${result.checks.roleBased.role}`
        : "Personal email",
      inverted: true,
    },
    {
      icon: Gift,
      label: "Free Provider",
      valid: true, // Not a negative indicator
      message: result.checks.freeProvider.isFree
        ? `Provider: ${result.checks.freeProvider.provider}`
        : "Not a free provider",
      neutral: result.checks.freeProvider.isFree,
    },
    {
      icon: Shield,
      label: "Blacklist",
      valid: !result.checks.blacklisted.isBlacklisted,
      message: result.checks.blacklisted.isBlacklisted
        ? `Listed on: ${result.checks.blacklisted.lists.slice(0, 2).join(", ")}`
        : "Not blacklisted",
      inverted: true,
    },
    {
      icon: Inbox,
      label: "Catch-All",
      valid: true, // Catch-all is informational, not necessarily bad
      message: result.checks.catchAll.isCatchAll
        ? "Domain accepts all emails"
        : "Not a catch-all domain",
      neutral: result.checks.catchAll.isCatchAll,
    },
  ];

  // Add SMTP check if it was performed
  if (result.checks.smtp?.checked) {
    const smtpCheck = result.checks.smtp;
    let message: string;
    let valid: boolean;
    let neutral = false;

    if (smtpCheck.exists === true) {
      message = "Mailbox verified to exist";
      valid = true;
    } else if (smtpCheck.exists === false) {
      message = "Mailbox does not exist";
      valid = false;
    } else if (smtpCheck.catchAll) {
      message = "Server accepts all addresses (catch-all)";
      valid = true;
      neutral = true;
    } else if (smtpCheck.greylisted) {
      message = "Temporary failure (greylisting)";
      valid = true;
      neutral = true;
    } else {
      message = smtpCheck.message || "Unknown result";
      valid = true;
      neutral = true;
    }

    checks.push({
      icon: MailCheck,
      label: "SMTP Verification",
      valid,
      message,
      neutral,
    });
  }

  if (result.checks.typo.hasTypo) {
    checks.push({
      icon: AlertCircle,
      label: "Typo Detected",
      valid: false,
      message: `Did you mean: ${result.checks.typo.suggestion}?`,
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg font-medium break-all">
                {result.email}
              </CardTitle>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge
                  variant={result.isValid ? "success" : "destructive"}
                >
                  {result.isValid ? "Valid" : "Invalid"}
                </Badge>
                <Badge
                  variant={
                    result.deliverability === "deliverable"
                      ? "success"
                      : result.deliverability === "risky"
                      ? "warning"
                      : "destructive"
                  }
                >
                  {result.deliverability}
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
                  {result.risk} risk
                </Badge>
              </div>
            </div>
            <ScoreIndicator score={result.score} size="sm" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3">
            {checks.map((check, index) => {
              const Icon = check.icon;
              const isNeutral = "neutral" in check && check.neutral;

              return (
                <motion.div
                  key={check.label}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="flex items-start gap-3 p-2 rounded-lg bg-muted/50"
                >
                  <div
                    className={cn(
                      "rounded-full p-1",
                      isNeutral
                        ? "bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400"
                        : check.valid
                        ? "bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400"
                        : "bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400"
                    )}
                  >
                    {isNeutral ? (
                      <Icon className="h-4 w-4" />
                    ) : check.valid ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{check.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {check.message}
                    </p>
                    {"extra" in check && check.extra && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        {check.extra}
                      </p>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {result.checks.typo.hasTypo && result.checks.typo.suggestion && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              <span className="text-sm">
                Did you mean{" "}
                <strong className="text-amber-700 dark:text-amber-300">
                  {result.email.split("@")[0]}@{result.checks.typo.suggestion}
                </strong>
                ?
              </span>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={handleCopy}>
              <Copy className="h-4 w-4 mr-1" />
              Copy
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

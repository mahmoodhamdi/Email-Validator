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
  ShieldCheck,
  Key,
  FileKey,
  Clock,
  ShieldAlert,
  TrendingUp,
  TrendingDown,
  UserCircle2,
  ExternalLink,
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

  // Helper function for authentication strength color
  const getStrengthColor = (strength: string) => {
    switch (strength) {
      case "strong":
        return "text-green-600 dark:text-green-400";
      case "moderate":
        return "text-yellow-600 dark:text-yellow-400";
      case "weak":
        return "text-orange-600 dark:text-orange-400";
      default:
        return "text-red-600 dark:text-red-400";
    }
  };

  const getStrengthBg = (strength: string) => {
    switch (strength) {
      case "strong":
        return "bg-green-100 dark:bg-green-900";
      case "moderate":
        return "bg-yellow-100 dark:bg-yellow-900";
      case "weak":
        return "bg-orange-100 dark:bg-orange-900";
      default:
        return "bg-red-100 dark:bg-red-900";
    }
  };

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

          {/* Email Authentication Section */}
          {result.checks.authentication?.checked &&
            result.checks.authentication.authentication && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.2 }}
                className="border-t pt-4 mt-2"
              >
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold flex items-center gap-2 text-sm">
                    <ShieldCheck className="h-4 w-4" />
                    Email Authentication
                  </h4>
                  <Badge
                    variant={
                      result.checks.authentication.authentication.score >= 80
                        ? "success"
                        : result.checks.authentication.authentication.score >= 60
                        ? "warning"
                        : "destructive"
                    }
                  >
                    {result.checks.authentication.authentication.score}/100
                  </Badge>
                </div>

                <div className="grid gap-2">
                  {/* SPF Status */}
                  <div
                    className={cn(
                      "flex items-center justify-between p-2 rounded-lg",
                      getStrengthBg(
                        result.checks.authentication.authentication.spf.strength
                      )
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      <span className="text-sm font-medium">SPF</span>
                    </div>
                    <span
                      className={cn(
                        "text-sm font-medium",
                        getStrengthColor(
                          result.checks.authentication.authentication.spf
                            .strength
                        )
                      )}
                    >
                      {result.checks.authentication.authentication.spf.exists
                        ? result.checks.authentication.authentication.spf.strength.toUpperCase()
                        : "NOT FOUND"}
                    </span>
                  </div>

                  {/* DMARC Status */}
                  <div
                    className={cn(
                      "flex items-center justify-between p-2 rounded-lg",
                      getStrengthBg(
                        result.checks.authentication.authentication.dmarc
                          .strength
                      )
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <FileKey className="h-4 w-4" />
                      <span className="text-sm font-medium">DMARC</span>
                    </div>
                    <span
                      className={cn(
                        "text-sm font-medium",
                        getStrengthColor(
                          result.checks.authentication.authentication.dmarc
                            .strength
                        )
                      )}
                    >
                      {result.checks.authentication.authentication.dmarc.exists
                        ? result.checks.authentication.authentication.dmarc.strength.toUpperCase()
                        : "NOT FOUND"}
                    </span>
                  </div>

                  {/* DKIM Status */}
                  <div
                    className={cn(
                      "flex items-center justify-between p-2 rounded-lg",
                      result.checks.authentication.authentication.dkim.found
                        ? "bg-green-100 dark:bg-green-900"
                        : "bg-yellow-100 dark:bg-yellow-900"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Key className="h-4 w-4" />
                      <span className="text-sm font-medium">DKIM</span>
                    </div>
                    <span
                      className={cn(
                        "text-sm font-medium",
                        result.checks.authentication.authentication.dkim.found
                          ? "text-green-600 dark:text-green-400"
                          : "text-yellow-600 dark:text-yellow-400"
                      )}
                    >
                      {result.checks.authentication.authentication.dkim.found
                        ? `FOUND (${result.checks.authentication.authentication.dkim.recordCount})`
                        : "NOT FOUND"}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground mt-2">
                  {result.checks.authentication.authentication.summary}
                </p>
              </motion.div>
            )}

          {/* Domain Reputation Section */}
          {result.checks.reputation?.checked &&
            result.checks.reputation.reputation && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.3 }}
                className="border-t pt-4 mt-2"
              >
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold flex items-center gap-2 text-sm">
                    <Globe className="h-4 w-4" />
                    Domain Reputation
                  </h4>
                  <Badge
                    variant={
                      result.checks.reputation.reputation.risk === "low"
                        ? "success"
                        : result.checks.reputation.reputation.risk === "medium"
                        ? "warning"
                        : "destructive"
                    }
                  >
                    {result.checks.reputation.reputation.score}/100
                  </Badge>
                </div>

                <div className="grid gap-2">
                  {/* Reputation Score */}
                  <div
                    className={cn(
                      "flex items-center justify-between p-2 rounded-lg",
                      result.checks.reputation.reputation.score >= 80
                        ? "bg-green-100 dark:bg-green-900"
                        : result.checks.reputation.reputation.score >= 60
                        ? "bg-yellow-100 dark:bg-yellow-900"
                        : result.checks.reputation.reputation.score >= 40
                        ? "bg-orange-100 dark:bg-orange-900"
                        : "bg-red-100 dark:bg-red-900"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="h-4 w-4" />
                      <span className="text-sm font-medium">Risk Level</span>
                    </div>
                    <span
                      className={cn(
                        "text-sm font-medium uppercase",
                        result.checks.reputation.reputation.risk === "low"
                          ? "text-green-600 dark:text-green-400"
                          : result.checks.reputation.reputation.risk === "medium"
                          ? "text-yellow-600 dark:text-yellow-400"
                          : result.checks.reputation.reputation.risk === "high"
                          ? "text-orange-600 dark:text-orange-400"
                          : "text-red-600 dark:text-red-400"
                      )}
                    >
                      {result.checks.reputation.reputation.risk}
                    </span>
                  </div>

                  {/* Domain Age */}
                  {result.checks.reputation.reputation.age.ageInDays !== null && (
                    <div
                      className={cn(
                        "flex items-center justify-between p-2 rounded-lg",
                        result.checks.reputation.reputation.age.isNew
                          ? "bg-red-100 dark:bg-red-900"
                          : result.checks.reputation.reputation.age.isYoung
                          ? "bg-yellow-100 dark:bg-yellow-900"
                          : "bg-green-100 dark:bg-green-900"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span className="text-sm font-medium">Domain Age</span>
                      </div>
                      <span
                        className={cn(
                          "text-sm",
                          result.checks.reputation.reputation.age.isNew
                            ? "text-red-600 dark:text-red-400"
                            : result.checks.reputation.reputation.age.isYoung
                            ? "text-yellow-600 dark:text-yellow-400"
                            : "text-green-600 dark:text-green-400"
                        )}
                      >
                        {result.checks.reputation.reputation.age.message}
                      </span>
                    </div>
                  )}

                  {/* Blocklist Status */}
                  <div
                    className={cn(
                      "flex items-center justify-between p-2 rounded-lg",
                      result.checks.reputation.reputation.blocklists.listed
                        ? "bg-red-100 dark:bg-red-900"
                        : "bg-green-100 dark:bg-green-900"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      <span className="text-sm font-medium">Blocklists</span>
                    </div>
                    <span
                      className={cn(
                        "text-sm",
                        result.checks.reputation.reputation.blocklists.listed
                          ? "text-red-600 dark:text-red-400"
                          : "text-green-600 dark:text-green-400"
                      )}
                    >
                      {result.checks.reputation.reputation.blocklists.message}
                    </span>
                  </div>
                </div>

                {/* Risk Factors */}
                {result.checks.reputation.reputation.factors.length > 0 && (
                  <div className="mt-3 space-y-1">
                    <span className="text-xs text-muted-foreground font-medium">
                      Risk Factors:
                    </span>
                    <div className="grid gap-1">
                      {result.checks.reputation.reputation.factors.map(
                        (factor, i) => (
                          <div
                            key={i}
                            className={cn(
                              "flex items-center gap-2 text-xs p-1 rounded",
                              factor.impact === "positive"
                                ? "text-green-600 dark:text-green-400"
                                : factor.impact === "negative"
                                ? "text-red-600 dark:text-red-400"
                                : "text-gray-600 dark:text-gray-400"
                            )}
                          >
                            {factor.impact === "positive" ? (
                              <TrendingUp className="h-3 w-3" />
                            ) : factor.impact === "negative" ? (
                              <TrendingDown className="h-3 w-3" />
                            ) : (
                              <span className="w-3 text-center">•</span>
                            )}
                            <span className="font-medium">{factor.name}:</span>
                            <span className="text-muted-foreground">
                              {factor.description}
                            </span>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}

                <p className="text-xs text-muted-foreground mt-2">
                  {result.checks.reputation.reputation.summary}
                </p>
              </motion.div>
            )}

          {/* Gravatar Profile Section */}
          {result.checks.gravatar?.checked && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.35 }}
              className="border-t pt-4 mt-2"
            >
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold flex items-center gap-2 text-sm">
                  <UserCircle2 className="h-4 w-4" />
                  Gravatar Profile
                </h4>
                <Badge
                  variant={
                    result.checks.gravatar.gravatar?.exists
                      ? "success"
                      : "secondary"
                  }
                >
                  {result.checks.gravatar.gravatar?.exists
                    ? "Found"
                    : "Not Found"}
                </Badge>
              </div>

              {result.checks.gravatar.gravatar?.exists ? (
                <div className="flex items-start gap-4">
                  {/* Gravatar Image */}
                  <div className="flex-shrink-0">
                    <img
                      src={result.checks.gravatar.gravatar.thumbnailUrl}
                      alt="Gravatar"
                      className="w-16 h-16 rounded-full border-2 border-green-200 dark:border-green-800"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>

                  {/* Gravatar Details */}
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-green-100 dark:bg-green-900">
                      <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                      <span className="text-sm text-green-700 dark:text-green-300">
                        Gravatar profile exists for this email
                      </span>
                    </div>

                    {result.checks.gravatar.gravatar.profileUrl && (
                      <a
                        href={result.checks.gravatar.gravatar.profileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        View Profile
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-100 dark:bg-gray-800">
                  <UserCircle2 className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {result.checks.gravatar.message}
                  </span>
                </div>
              )}
            </motion.div>
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

"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Loader2, Search, Zap, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { ValidationResult } from "./ValidationResult";
import { ValidationResultSkeleton } from "./ValidationResultSkeleton";
import { useHistoryStore } from "@/stores/history-store";
import { useValidationStore } from "@/stores/validation-store";
import { useDebounce } from "@/hooks/useDebounce";
import { DEBOUNCE_DELAYS } from "@/lib/constants";
import type { ValidationResult as ValidationResultType } from "@/types/email";

const emailSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type EmailFormData = z.infer<typeof emailSchema>;

interface EmailValidatorProps {
  initialEmail?: string;
}

/**
 * Wrapper component that reads search params and passes to EmailValidator.
 * Uses useSearchParams which requires Suspense boundary.
 */
export function EmailValidatorWrapper() {
  const searchParams = useSearchParams();
  const initialEmail = searchParams.get("email") || undefined;

  return <EmailValidator initialEmail={initialEmail} />;
}

export function EmailValidator({ initialEmail }: EmailValidatorProps) {
  const [realTimeEnabled, setRealTimeEnabled] = useState(false);
  const [previousResult, setPreviousResult] = useState<ValidationResultType | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastValidatedEmailRef = useRef<string>("");

  // Use validation store for state management
  const {
    currentResult: result,
    isValidating: isLoading,
    setResult,
    setIsValidating: setIsLoading,
    setEmail: setStoreEmail,
  } = useValidationStore();

  const addToHistory = useHistoryStore((state) => state.addItem);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    trigger,
  } = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      email: initialEmail || "",
    },
  });

  const emailValue = watch("email");
  const debouncedEmail = useDebounce(emailValue, DEBOUNCE_DELAYS.submit);

  // Validate email function with abort support
  const validateEmail = useCallback(
    async (email: string, options?: { force?: boolean }) => {
      if (!email) {
        return;
      }

      // Skip if same email already validated (unless forced)
      if (!options?.force && email === lastValidatedEmailRef.current && result) {
        return;
      }

      // Cancel any pending request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new abort controller
      abortControllerRef.current = new AbortController();
      lastValidatedEmailRef.current = email;

      setStoreEmail(email);
      setIsLoading(true);

      // Keep previous result visible while loading
      if (result) {
        setPreviousResult(result);
      }

      try {
        const response = await fetch("/api/validate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          throw new Error("Validation failed");
        }

        const validationResult = await response.json();
        setResult(validationResult);
        setPreviousResult(null);
        addToHistory(validationResult);
      } catch (error) {
        // Don't log or handle abort errors
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }
        console.error("Validation error:", error);
        // Restore previous result on error
        if (previousResult) {
          setResult(previousResult);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [addToHistory, setIsLoading, setResult, setStoreEmail, result, previousResult]
  );

  // Handle form submit
  const onSubmit = useCallback(
    async (data: EmailFormData) => {
      await validateEmail(data.email, { force: true });
    },
    [validateEmail]
  );

  // Handle blur event - immediate validation
  const handleBlur = useCallback(async () => {
    const isValid = await trigger("email");
    if (isValid && emailValue && emailValue !== lastValidatedEmailRef.current) {
      validateEmail(emailValue);
    }
  }, [emailValue, trigger, validateEmail]);

  // Auto-validate when initial email is provided (from history revalidate)
  useEffect(() => {
    if (initialEmail) {
      setValue("email", initialEmail);
      // Trigger validation after a short delay to let the form settle
      const timer = setTimeout(() => {
        validateEmail(initialEmail, { force: true });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [initialEmail, setValue, validateEmail]);

  // Real-time validation effect
  useEffect(() => {
    if (realTimeEnabled && debouncedEmail) {
      // Check if the email looks valid before making the API call
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (emailRegex.test(debouncedEmail)) {
        validateEmail(debouncedEmail);
      }
    }
  }, [realTimeEnabled, debouncedEmail, validateEmail]);

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Determine validation status icon
  const getStatusIcon = () => {
    if (isLoading) {
      return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;
    }

    if (result) {
      if (result.isValid && result.deliverability === "deliverable") {
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      }
      if (!result.isValid) {
        return <XCircle className="h-5 w-5 text-red-500" />;
      }
      if (result.deliverability === "risky" || result.risk === "high") {
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      }
      return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    }

    return <Search className="h-5 w-5 text-muted-foreground" />;
  };

  // Get input border color based on validation status
  const getInputClassName = () => {
    if (!result || isLoading) {
      return "";
    }

    if (result.isValid && result.deliverability === "deliverable") {
      return "border-green-500 focus-visible:ring-green-500/20";
    }
    if (!result.isValid) {
      return "border-red-500 focus-visible:ring-red-500/20";
    }
    if (result.deliverability === "risky" || result.risk === "high") {
      return "border-yellow-500 focus-visible:ring-yellow-500/20";
    }
    return "border-green-500 focus-visible:ring-green-500/20";
  };

  // Get the result to display (current or previous while loading)
  const displayResult = result || (isLoading ? previousResult : null);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2 text-2xl">
            <Mail className="h-6 w-6 text-primary" />
            Email Validator
          </CardTitle>
          <CardDescription>
            Enter an email address to validate its format, domain, and deliverability
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="relative">
              <Input
                {...register("email")}
                type="email"
                placeholder="Enter email address..."
                className={cn("h-12 text-lg pl-4 pr-12", getInputClassName())}
                disabled={isLoading}
                onBlur={handleBlur}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {getStatusIcon()}
              </div>
            </div>
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}

            {/* Show typo suggestion if available */}
            {result?.checks.typo.hasTypo && result.checks.typo.suggestion && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 p-2 rounded-md bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800"
              >
                <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-500 shrink-0" />
                <span className="text-sm text-yellow-800 dark:text-yellow-200">
                  Did you mean{" "}
                  <button
                    type="button"
                    className="font-medium underline hover:no-underline"
                    onClick={() => {
                      const [localPart] = emailValue.split("@");
                      const suggestedEmail = `${localPart}@${result.checks.typo.suggestion}`;
                      setValue("email", suggestedEmail);
                      validateEmail(suggestedEmail, { force: true });
                    }}
                  >
                    {emailValue.split("@")[0]}@{result.checks.typo.suggestion}
                  </button>
                  ?
                </span>
              </motion.div>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Switch
                  id="real-time"
                  checked={realTimeEnabled}
                  onCheckedChange={setRealTimeEnabled}
                />
                <Label htmlFor="real-time" className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <Zap className="h-4 w-4" />
                  Real-time validation
                </Label>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11"
              disabled={isLoading || !emailValue}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Validating...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Validate Email
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <AnimatePresence mode="wait">
        {isLoading && !displayResult && (
          <motion.div
            key="skeleton"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <ValidationResultSkeleton />
          </motion.div>
        )}
        {displayResult && (
          <motion.div
            key={displayResult.timestamp}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: isLoading ? 0.6 : 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className={cn(isLoading && "pointer-events-none")}
          >
            <ValidationResult result={displayResult} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

"use client";

import { useState, useCallback, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Loader2, Search, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ValidationResult } from "./ValidationResult";
import { ValidationResultSkeleton } from "./ValidationResultSkeleton";
import { useHistoryStore } from "@/stores/history-store";
import { useValidationStore } from "@/stores/validation-store";
import { useDebounce } from "@/hooks/useDebounce";
import { DEBOUNCE_DELAYS } from "@/lib/constants";

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
  } = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      email: initialEmail || "",
    },
  });

  const emailValue = watch("email");
  const debouncedEmail = useDebounce(emailValue, DEBOUNCE_DELAYS.submit);

  // Validate email function
  const validateEmail = useCallback(
    async (email: string) => {
      if (!email) {
        return;
      }

      setStoreEmail(email);
      setIsLoading(true);
      setResult(null);

      try {
        const response = await fetch("/api/validate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email }),
        });

        if (!response.ok) {
          throw new Error("Validation failed");
        }

        const validationResult = await response.json();
        setResult(validationResult);
        addToHistory(validationResult);
      } catch (error) {
        console.error("Validation error:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [addToHistory, setIsLoading, setResult, setStoreEmail]
  );

  // Handle form submit
  const onSubmit = useCallback(
    async (data: EmailFormData) => {
      await validateEmail(data.email);
    },
    [validateEmail]
  );

  // Auto-validate when initial email is provided (from history revalidate)
  useEffect(() => {
    if (initialEmail) {
      setValue("email", initialEmail);
      // Trigger validation after a short delay to let the form settle
      const timer = setTimeout(() => {
        validateEmail(initialEmail);
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
                className="h-12 text-lg pl-4 pr-12"
                disabled={isLoading}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                ) : (
                  <Search className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
            </div>
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
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
        {isLoading && !result && (
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
        {result && !isLoading && (
          <motion.div
            key={result.timestamp}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <ValidationResult result={result} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

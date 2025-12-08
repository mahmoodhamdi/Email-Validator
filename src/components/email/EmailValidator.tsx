"use client";

import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ValidationResult } from "./ValidationResult";
import type { ValidationResult as ValidationResultType } from "@/types/email";
import { useHistoryStore } from "@/stores/history-store";

const emailSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type EmailFormData = z.infer<typeof emailSchema>;

export function EmailValidator() {
  const [result, setResult] = useState<ValidationResultType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const addToHistory = useHistoryStore((state) => state.addItem);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
  });

  const emailValue = watch("email");

  const onSubmit = useCallback(
    async (data: EmailFormData) => {
      setIsLoading(true);
      setResult(null);

      try {
        const response = await fetch("/api/validate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email: data.email }),
        });

        if (!response.ok) {
          throw new Error("Validation failed");
        }

        const validationResult: ValidationResultType = await response.json();
        setResult(validationResult);
        addToHistory(validationResult);
      } catch (error) {
        console.error("Validation error:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [addToHistory]
  );

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
        {result && (
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

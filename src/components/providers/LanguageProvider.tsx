"use client";

import { NextIntlClientProvider } from "next-intl";
import { ReactNode } from "react";

interface LanguageProviderProps {
  children: ReactNode;
  locale: string;
  messages: Record<string, unknown>;
}

export function LanguageProvider({
  children,
  locale,
  messages,
}: LanguageProviderProps) {
  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}

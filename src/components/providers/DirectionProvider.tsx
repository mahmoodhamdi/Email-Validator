"use client";

import { useLocale } from "next-intl";
import { useEffect } from "react";

const rtlLocales = ["ar"];

export function DirectionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = useLocale();
  const isRTL = rtlLocales.includes(locale);

  useEffect(() => {
    document.documentElement.dir = isRTL ? "rtl" : "ltr";
    document.documentElement.lang = locale;
  }, [locale, isRTL]);

  return <>{children}</>;
}

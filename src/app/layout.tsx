import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { getLocale, getMessages } from "next-intl/server";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Toaster } from "@/components/ui/toaster";
import { PWAProvider } from "@/components/pwa/PWAProvider";
import { LanguageProvider } from "@/components/providers/LanguageProvider";
import { DirectionProvider } from "@/components/providers/DirectionProvider";
import { ShortcutsProvider } from "@/contexts/ShortcutsContext";
import { GlobalShortcuts } from "@/components/shortcuts/GlobalShortcuts";

const inter = Inter({ subsets: ["latin", "arabic"] });

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export const metadata: Metadata = {
  title: "Email Validator - Professional Email Validation Tool",
  description:
    "Validate email addresses with syntax checking, domain verification, MX record lookup, disposable email detection, and more.",
  keywords: [
    "email validator",
    "email verification",
    "email checker",
    "disposable email detection",
    "MX lookup",
  ],
  authors: [{ name: "Email Validator" }],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Email Validator",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: "Email Validator",
    title: "Email Validator",
    description: "Validate email addresses with comprehensive checks",
  },
  twitter: {
    card: "summary",
    title: "Email Validator",
    description: "Validate email addresses with comprehensive checks",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/icons/icon-192x192.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="/icons/icon-32x32.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href="/icons/icon-16x16.png"
        />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body className={inter.className}>
        <LanguageProvider locale={locale} messages={messages}>
          <DirectionProvider>
            <ShortcutsProvider>
              <GlobalShortcuts />
              <PWAProvider>
                <div className="relative flex min-h-screen flex-col">
                  <Header />
                  <main className="flex-1">{children}</main>
                  <Footer />
                </div>
                <Toaster />
              </PWAProvider>
            </ShortcutsProvider>
          </DirectionProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}

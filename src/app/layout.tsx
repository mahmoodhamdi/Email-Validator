import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({ subsets: ["latin"] });

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
  openGraph: {
    title: "Email Validator",
    description: "Professional email validation tool",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <div className="relative flex min-h-screen flex-col">
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </div>
        <Toaster />
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import SupabaseInitializer from "@/components/supabase-initializer";
// import "@/lib/utils/suppress-supabase-logs"; // Suppress noisy GoTrueClient debug logs - temporarily disabled due to build errors

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CareerAI - AI-Assisted Job Application Platform",
  description: "Optimize your job search with AI-generated resumes, cover letters, and job matching",
  manifest: "/manifest.json",
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#000000',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <SupabaseInitializer />
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import SupabaseInitializer from "@/components/supabase-initializer";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CareerAI - AI-Assisted Job Application Platform",
  description: "Optimize your job search with AI-generated resumes, cover letters, and job matching",
  viewport: "width=device-width, initial-scale=1, maximum-scale=5",
  themeColor: "#000000",
  manifest: "/manifest.json",
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
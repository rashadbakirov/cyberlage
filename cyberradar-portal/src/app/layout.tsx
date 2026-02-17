// © 2025 CyberLage
import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import AppShell from "@/components/layout/AppShell";
import SessionProvider from "@/components/auth/SessionProvider";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  title: "CyberLage - Your Daily Cybersecurity Situational Awareness",
  description:
    "Your daily cybersecurity situational awareness - AI-assisted and compliance-ready",
  authors: [{ name: "CyberLage" }],
  creator: "CyberLage",
  publisher: "CyberLage",
  icons: { icon: "/favicon.svg" },
  openGraph: {
    title: "CyberLage - German Cybersecurity Compliance Intelligence",
    description: "Compliance layer for SIEM/XDR. NIS2, DORA, GDPR.",
    type: "website",
    locale: "en_US",
    images: [
      {
        url: "/og-image.svg",
        width: 1200,
        height: 630,
        alt: "CyberLage - German Cybersecurity Compliance Intelligence",
      },
    ],
  },
  other: {
    author: "CyberLage",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrains.variable}`}>
      <body className="min-h-screen bg-page text-text-primary antialiased font-sans">
        <SessionProvider>
          <AppShell>{children}</AppShell>
        </SessionProvider>
      </body>
    </html>
  );
}



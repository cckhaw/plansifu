import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Suspense } from "react";
import { Header } from "@/components/Header";
import "./globals.css";

// Apple devices use SF Pro through the system stack; Inter is the fallback everywhere else.
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: { default: "PlanSifu — Compare Telco & Broadband Plans in Malaysia & Singapore", template: "%s | PlanSifu" },
  description: "Compare postpaid, prepaid, home fibre broadband and travel eSIMs from Maxis, CelcomDigi, Unifi, Singtel, M1, StarHub and more.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f2f7" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans antialiased">
        <Suspense fallback={<div className="h-14" />}>
          <Header />
        </Suspense>
        {children}
      </body>
    </html>
  );
}

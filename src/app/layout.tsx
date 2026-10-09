import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: { default: "PlanSifu — Compare Telco & Broadband Plans in Malaysia & Singapore", template: "%s | PlanSifu" },
  description: "Compare postpaid, prepaid and home fibre broadband deals from Maxis, CelcomDigi, Unifi, Singtel, M1, StarHub and more.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}

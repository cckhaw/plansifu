import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Suspense } from "react";
import { Header } from "@/components/Header";
import { JsonLd } from "@/components/seo/JsonLd";
import { SITE_NAME, SITE_URL, absoluteUrl } from "@/lib/seo-helpers";
import "./globals.css";

// Apple devices use SF Pro through the system stack; Inter is the fallback everywhere else.
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "PlanSifu 师傅: Compare Telco & Broadband Plans in Malaysia & Singapore", template: "%s | PlanSifu 师傅" },
  description: "Compare postpaid, prepaid, home fibre broadband and travel eSIMs from Maxis, CelcomDigi, Unifi, Singtel, M1, StarHub and more.",
  applicationName: "PlanSifu",
  openGraph: { type: "website", siteName: SITE_NAME },
  twitter: { card: "summary_large_image" },
  formatDetection: { telephone: false },
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
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        {/* Apply a saved light/dark choice before first paint (no flash). */}
        <script dangerouslySetInnerHTML={{ __html: `try{var t=localStorage.getItem("plansifu-theme");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}` }} />
      </head>
      <body className="font-sans antialiased">
        <Suspense fallback={<div className="h-14 md:h-16" />}>
          <Header />
        </Suspense>
        {children}
        <JsonLd data={{ "@context": "https://schema.org", "@graph": [{ "@type": "Organization", "@id": absoluteUrl("/#org"), name: "PlanSifu", alternateName: "师傅", url: SITE_URL, logo: absoluteUrl("/logo.png") }, { "@type": "WebSite", "@id": absoluteUrl("/#site"), url: SITE_URL, name: "PlanSifu", inLanguage: ["en-MY", "en-SG"], publisher: { "@id": absoluteUrl("/#org") } }] }} />
      </body>
    </html>
  );
}

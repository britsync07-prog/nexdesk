import type { Metadata, Viewport } from "next";
import { Hanken_Grotesk } from "next/font/google";
import "./globals.css";
import { Navigation } from "@/components/navigation";
import { ShopLanguageProvider } from "@/components/shop-language";
import { OfflineSync } from "@/components/offline-sync";

const hanken = Hanken_Grotesk({ subsets: ["latin"], variable: "--font-hanken" });

export const metadata: Metadata = {
  title: "Shop Khata - Shop Ledger",
  description: "Bilingual shop cash, due, and debt ledger.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Shop Khata",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#09090b",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <script dangerouslySetInnerHTML={{ __html: "try { if (localStorage.getItem('nexdesk-theme') === 'dark') document.documentElement.classList.add('theme-dark'); } catch {}" }} />
      </head>
      <body className={`${hanken.variable} min-h-screen bg-[#f2f4f7] text-[#0a0a0a] antialiased flex flex-col`}>
        <ShopLanguageProvider><OfflineSync /><Navigation />
        <main className="flex-1 pb-20 md:pb-0 md:pl-56">{children}</main></ShopLanguageProvider>

        {/* Service Worker Registration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator && (window.location.protocol === 'https:' || window.location.hostname === 'localhost')) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').catch(function(err) {
                    console.log('SW registration failed:', err);
                  });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}

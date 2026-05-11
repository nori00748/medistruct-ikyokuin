import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { jaJP } from "@clerk/localizations";
import { Inter, Noto_Sans_JP } from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegister } from "./_components/ServiceWorkerRegister";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const notoSansJp = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "医局員アプリ | 当直表メーカー Pro",
  description: "大学医局向け 医局員シフト確認・希望休提出・当直交代依頼アプリ",
  applicationName: "医局員アプリ",
  appleWebApp: {
    capable: true,
    title: "医局員アプリ",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    apple: [{ url: "/apple-icon", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#2563eb",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider localization={jaJP}>
      <html
        lang="ja"
        className={`${inter.variable} ${notoSansJp.variable} h-full antialiased`}
      >
        <body className="min-h-full flex flex-col">
          {children}
          <ServiceWorkerRegister />
        </body>
      </html>
    </ClerkProvider>
  );
}

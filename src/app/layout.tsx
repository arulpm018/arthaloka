import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Providers } from "@/components/Providers";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Arthafiloka",
  description: "Dunia keuangan Arul & Fifi — personal finance tracker untuk berdua.",
  applicationName: "Arthafiloka",
  appleWebApp: {
    capable: true,
    title: "Arthafiloka",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-16.png", sizes: "16x16", type: "image/png" },
    ],
    shortcut: "/icon-32.png",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "Arthafiloka",
    description: "Dunia keuangan Arul & Fifi.",
    siteName: "Arthafiloka",
    images: [
      {
        url: "/logo-512.png",
        width: 512,
        height: 512,
        alt: "Arthafiloka logo",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Arthafiloka",
    description: "Dunia keuangan Arul & Fifi.",
    images: ["/logo-512.png"],
  },
};

export const viewport: Viewport = {
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
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

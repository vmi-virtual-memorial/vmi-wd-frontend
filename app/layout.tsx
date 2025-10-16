import type { Metadata } from "next";
import "./globals.css";
import Footer from "@/components/Footer";
import { Analytics } from "@vercel/analytics/react";

export const metadata: Metadata = {
  title: "VMI Virtual Memorial",
  description: "Honoring VMI's fallen heroes who made the ultimate sacrifice in service to their country",
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
    apple: [
      { url: '/apple-icon.svg', type: 'image/svg+xml' },
    ],
  },
  openGraph: {
    title: "VMI Virtual Memorial",
    description: "Honoring VMI's fallen heroes who made the ultimate sacrifice in service to their country",
    siteName: "VMI Virtual Memorial",
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "VMI Virtual Memorial",
    description: "Honoring VMI's fallen heroes who made the ultimate sacrifice in service to their country",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased flex flex-col min-h-screen">
        <div className="flex-grow">
          {children}
        </div>
        <Footer />
        <Analytics />
      </body>
    </html>
  );
}
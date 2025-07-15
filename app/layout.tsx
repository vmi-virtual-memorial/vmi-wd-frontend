import type { Metadata } from "next";
import "./globals.css";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "VMI Virtual Memorial",
  description: "Honoring VMI's fallen heroes who made the ultimate sacrifice in service to their country",
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
      </body>
    </html>
  );
}
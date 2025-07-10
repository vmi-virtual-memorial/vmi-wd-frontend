import type { Metadata } from "next";
import "./globals.css";

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
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
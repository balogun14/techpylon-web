import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TechPylon — Reviewer Gate",
  description: "Clinical AI case extraction review",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

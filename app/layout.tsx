import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Landscape AI Demo - Fort Collins",
  description: "AI-powered landscape design tool using Grok Imagine",
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

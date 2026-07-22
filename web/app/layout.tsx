import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LOTrack — Inventory Management SaaS",
  description:
    "LOTrack helps small businesses track inventory, manage stock, and monitor stock movements with a modern dashboard.",
  metadataBase: new URL("https://lotrack.example"),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-slate-950 text-slate-100">{children}</body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "KOZLU GSB HUB",
  description: "Gençlik ve spor için ortak çalışma alanı",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/favicon.svg" },
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}

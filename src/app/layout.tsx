import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "日案ジェネレーター",
  description: "放課後等デイサービス 日報計画作成ツール",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}

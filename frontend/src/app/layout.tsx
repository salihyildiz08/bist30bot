import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BIST 30 AI Terminal | Teknik Analiz, Al/Sat & Portföy Yönetimi",
  description: "BIST 30 hisseleri için yapay zeka destekli teknik analiz, KAP haber radarı, risk yönetimi ve canlı portföy kâr/zarar takip sistemi.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr" className="dark">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased">
        {children}
      </body>
    </html>
  );
}

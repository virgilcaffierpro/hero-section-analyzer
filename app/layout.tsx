import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Portfolio Analyzer — Ton site vend-il vraiment ?",
  description:
    "Analyse ton portfolio de freelance en 60 secondes. Découvre pourquoi tu perds des clients avant même de leur parler et reçois un plan d'action concret.",
  keywords: [
    "portfolio freelance",
    "audit portfolio",
    "designer freelance",
    "UX UI",
    "conversion web",
    "positionnement freelance",
  ],
  openGraph: {
    title: "Portfolio Analyzer — Ton site vend-il vraiment ?",
    description:
      "Analyse ton portfolio de freelance en 60 secondes. Découvre les frictions qui font fuir tes clients et reçois un plan d'action concret.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <div className="noise-overlay" aria-hidden="true" />
        {children}
      </body>
    </html>
  );
}

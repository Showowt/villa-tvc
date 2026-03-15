import type { Metadata } from "next";
import { Inter, Playfair_Display, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
});

export const metadata: Metadata = {
  title: "Villa | Tiny Village Cartagena AI Concierge",
  description:
    "Your personal AI concierge for Tiny Village Cartagena - the world's most thoughtfully designed tiny house resort on Tierra Bomba island, Cartagena, Colombia.",
  keywords: [
    "Cartagena",
    "Colombia",
    "boutique hotel",
    "tiny house",
    "Tierra Bomba",
    "eco resort",
    "luxury accommodation",
  ],
  openGraph: {
    title: "Villa | Tiny Village Cartagena",
    description:
      "Your AI concierge for the ultimate Caribbean escape. 10 Tiny Villas, infinite experiences.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${playfair.variable} ${jetbrains.variable}`}
    >
      <body className="antialiased">{children}</body>
    </html>
  );
}

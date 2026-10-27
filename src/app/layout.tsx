import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter, Noto_Sans_Ethiopic } from "next/font/google";
import "@/styles/globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

// Inter has no Ge'ez glyphs, so Amharic would render as tofu boxes without
// this. next/font self-hosts it, so the app works offline.
const notoEthiopic = Noto_Sans_Ethiopic({
  variable: "--font-noto-ethiopic",
  weight: ["400", "500", "600", "700"],
  subsets: ["ethiopic"],
});

export const metadata: Metadata = {
  title: "Amharic Speech to Text",
  description: "Record your voice and get Amharic text, transcribed locally by VoiceStudio.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${notoEthiopic.variable}`}>
      <body className="h-full overflow-hidden bg-white font-sans text-ink">{children}</body>
    </html>
  );
}

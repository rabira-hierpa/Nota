import type { Metadata } from "next";
import type { ReactNode } from "react";
import { fontVariables } from "@/lib/fonts";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "Nota",
  description: "Amharic notes you can write or speak, transcribed on your own machine.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className={fontVariables}>
      <body className="h-full overflow-hidden bg-paper font-sans text-ink">{children}</body>
    </html>
  );
}

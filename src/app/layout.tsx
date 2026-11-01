import type { Metadata, Viewport } from "next";
import { Noto_Sans_Devanagari } from "next/font/google";
import { LangProvider } from "@/components/lang";
import "./globals.css";

const deva = Noto_Sans_Devanagari({ subsets: ["devanagari"], weight: ["400", "500", "600"], variable: "--font-deva", display: "swap" });

export const metadata: Metadata = {
  title: "Pratihar · Your business's voice receptionist",
  description: "Pratihar picks up every call in Hindi or English, books visits and tells you who needs a call back.",
  icons: { icon: "/favicon.svg" },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#fbf8f3" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={deva.variable}>
      <body>
        <LangProvider>{children}</LangProvider>
      </body>
    </html>
  );
}

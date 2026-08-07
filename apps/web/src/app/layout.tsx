import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import Providers from "@/components/Providers";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Master AEO — AI visibility for your business",
    template: "%s · Master AEO",
  },
  description:
    "Master AEO helps businesses measure how often they appear in AI assistants, then deliver a clear action plan to improve visibility.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body
        style={
          {
            "--ma-font-display": "var(--font-inter), system-ui, sans-serif",
            "--ma-font-body": "var(--font-inter), system-ui, sans-serif",
            "--ma-font-mono": "var(--font-jetbrains), ui-monospace, monospace",
          } as React.CSSProperties
        }
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

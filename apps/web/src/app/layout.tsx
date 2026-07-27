import type { Metadata } from "next";
import { Fraunces, Manrope } from "next/font/google";
import Providers from "@/components/Providers";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
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
    <html lang="en" className={`${fraunces.variable} ${manrope.variable}`}>
      <body
        style={
          {
            "--ma-font-display": "var(--font-fraunces), Georgia, serif",
            "--ma-font-body": "var(--font-manrope), system-ui, sans-serif",
          } as React.CSSProperties
        }
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

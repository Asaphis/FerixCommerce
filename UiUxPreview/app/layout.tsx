import type { Metadata } from "next";
import localFont from "next/font/local";
import { Toaster } from "sonner";
import "./globals.css";
import { FerixasProvider } from "@/lib/store";
import { DesignProvider } from "@/lib/design/design-store";

const display = localFont({
  src: [{ path: "./fonts/bricolage-grotesque.woff2", weight: "200 800", style: "normal" }],
  variable: "--font-bricolage",
  display: "swap",
  fallback: ["Georgia", "serif"],
});

const body = localFont({
  src: [{ path: "./fonts/archivo.woff2", weight: "100 900", style: "normal" }],
  variable: "--font-archivo",
  display: "swap",
  fallback: ["Helvetica", "Arial", "sans-serif"],
});

const mono = localFont({
  src: [
    { path: "./fonts/ibm-plex-mono-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/ibm-plex-mono-500.woff2", weight: "500", style: "normal" },
    { path: "./fonts/ibm-plex-mono-600.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-plex",
  display: "swap",
  fallback: ["ui-monospace", "monospace"],
});

export const metadata: Metadata = {
  title: "Ferixas Commerce — one catalog, every channel",
  description:
    "Ferixas Commerce: a multi-tenant commerce platform with a central marketplace, branded merchant storefronts and a visual store Design Engine.",
  icons: { icon: "/codewords-asterisk.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body
        className={`${display.variable} ${body.variable} ${mono.variable} antialiased`}
      >
        <FerixasProvider>
          <DesignProvider>{children}</DesignProvider>
        </FerixasProvider>
        <Toaster position="top-center" />
      </body>
    </html>
  );
}

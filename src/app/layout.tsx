import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Bonheur_Royale } from "next/font/google";
import "./globals.css";
import ServiceWorkerRegistration from "@/src/components/ServiceWorkerRegistration";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const bonheurRoyale = Bonheur_Royale({
  variable: "--font-bonheur-royale",
  subsets: ["latin"],
  weight: "400"
})

export const viewport: Viewport = {
  themeColor: "#30364F",
};

export const metadata: Metadata = {
  title: "Lord Family Cookbook",
  description: "A collection of things to nourish ourselves.",
  manifest: "/manifest.json",
  icons: {
    icon: "/fork-and-knife.svg",
    apple: "/fork-and-knife.svg",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Cookbook",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${bonheurRoyale.variable} antialiased`}
      >
        <ServiceWorkerRegistration />
        {children}
      </body>
    </html>
  );
}

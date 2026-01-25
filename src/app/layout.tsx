import type { Metadata } from "next";
import { Geist, Geist_Mono, Ballet } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const ballet = Ballet({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-ballet',
});

export const metadata: Metadata = {
  title: "Lord Family Cookbook",
  description: "A collection of things to nourish ourselves.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${ballet.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}

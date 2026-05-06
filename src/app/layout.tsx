import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import "./globals.css";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ETH Keyspace Simulator",
  description:
    "Educational visualisation of Ethereum keypair generation throughput and the math behind vanity addresses. Runs locally in your browser, no network calls.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-black font-mono text-lime-200">
        {children}
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "./components/Navbar";
import Link from "next/link";
import { AuthProvider } from "./context/AuthContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Naild. - AI-Powered Interview Practice",
  description:
    "Master your interview skills with real-time AI feedback on facial expressions, voice tone, and responses.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
        <Navbar /> {/* Reuse Navbar component here */}

        {children}

        {/* Footer */}
        
        </AuthProvider>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "./components/Navbar";
import Link from "next/link";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Naild - AI-Powered Interview Practice",
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
        <Navbar /> {/* Reuse Navbar component here */}

        {children}

        {/* Footer */}
        <footer className="bg-gray-50">
          <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="col-span-1 md:col-span-2">
                <Link href="/" className="text-2xl font-bold text-blue-600">
                  Naild
                </Link>
                <p className="mt-4 text-gray-600">
                  Empowering students to ace their interviews with AI-powered
                  practice and feedback.
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900 tracking-wider uppercase">
                  Product
                </h3>
                <ul className="mt-4 space-y-4">
                  <li>
                    <Link
                      href="/features"
                      className="text-gray-600 hover:text-gray-900"
                    >
                      Features
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/pricing"
                      className="text-gray-600 hover:text-gray-900"
                    >
                      Pricing
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/demo"
                      className="text-gray-600 hover:text-gray-900"
                    >
                      Demo
                    </Link>
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900 tracking-wider uppercase">
                  Company
                </h3>
                <ul className="mt-4 space-y-4">
                  <li>
                    <Link
                      href="/about"
                      className="text-gray-600 hover:text-gray-900"
                    >
                      About
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/contact"
                      className="text-gray-600 hover:text-gray-900"
                    >
                      Contact
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/privacy"
                      className="text-gray-600 hover:text-gray-900"
                    >
                      Privacy
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
            <div className="mt-8 border-t border-gray-200 pt-8">
              <p className="text-center text-gray-400">
                © {new Date().getFullYear()} Naild. All rights reserved.
              </p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}

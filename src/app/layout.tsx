import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "./context/AuthContext";
import LayoutWrapper from "./components/LayoutWrapper";
import { AUREON_NAME } from "./lib/modelConfig";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

export const metadata: Metadata = {
  title: `Knappi`,
  description:
    `Practice explaining technical ideas out loud with ${AUREON_NAME} feedback on clarity, correctness, depth, and audience fit.`,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={spaceGrotesk.variable}>
      <body>
        <AuthProvider>
          <LayoutWrapper>{children}</LayoutWrapper>
        </AuthProvider>
      </body>
    </html>
  );
}

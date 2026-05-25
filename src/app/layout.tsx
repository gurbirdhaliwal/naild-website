import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "./context/AuthContext";
import LayoutWrapper from "./components/LayoutWrapper";
import { AUREON_NAME } from "./lib/modelConfig";

export const metadata: Metadata = {
  title: `Knappi`,
  description:
    `Practice explaining technical ideas out loud with ${AUREON_NAME} feedback on clarity, correctness, depth, and audience fit.`,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <LayoutWrapper>{children}</LayoutWrapper>
        </AuthProvider>
      </body>
    </html>
  );
}

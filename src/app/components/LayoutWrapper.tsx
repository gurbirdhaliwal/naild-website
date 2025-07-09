"use client";

import { usePathname } from "next/navigation";
import Navbar from "./Navbar";
import React from "react";

export default function LayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAuthPage = pathname === "/login" || pathname === "/signup" || pathname === "/interview";

  return (
    <>
      {!isAuthPage && <Navbar />}
      {children}
    </>
  );
}

"use client";

import { usePathname } from "next/navigation";
import Navbar from "./Navbar";
import React from "react";
import SessionReauthModal from "./SessionReauthModal";

export default function LayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAuthPage =
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password" ||
    pathname === "/interview";
  const shouldHideNavbar = isAuthPage;

  return (
    <>
      {!shouldHideNavbar && <Navbar />}
      {children}
      <SessionReauthModal />
    </>
  );
}

"use client";

import { usePathname } from "next/navigation";
import Navbar from "./Navbar";
import React from "react";
import { useAuth } from "../context/AuthContext";
import { POST_AUTH_REDIRECT_STORAGE_KEY } from "../services/safeRedirect";

export default function LayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { loading } = useAuth();
  const isAuthPage = pathname === "/login" || pathname === "/signup" || pathname === "/interview";
  const hasPendingPostAuthRedirect =
    typeof window !== "undefined" &&
    Boolean(window.sessionStorage.getItem(POST_AUTH_REDIRECT_STORAGE_KEY));
  const shouldHideNavbar = isAuthPage || loading || hasPendingPostAuthRedirect;

  return (
    <>
      {!shouldHideNavbar && <Navbar />}
      {children}
    </>
  );
}

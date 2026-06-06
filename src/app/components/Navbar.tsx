'use client';

import Image from "next/image";
import Link from "next/link";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, loading } = useAuth();

  return (
    <nav className="fixed top-3 left-1/2 transform -translate-x-1/2 z-50 w-[100%] max-w-7xl rounded-2xl border border-gray-200 bg-white/80 backdrop-blur-md px-15 py-0 font-['Space_Grotesk']">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo */}
          <div className="flex items-center space-x-2 -ml-20">
            <Link href="/" className="flex items-center space-x-2">
              <Image
                src="/knappi_logo.png"
                alt="Knappi Logo"
                width={40}
                height={40}
                className="h-10 w-10 object-contain mr-0 mb-1"
              />
              <span className="text-2xl font-regular text-black tracking-tight">
                Knappi
              </span>
            </Link>
          </div>

          {/* Auth Section */}
          <div className="hidden sm:flex sm:items-center sm:space-x-4 relative -mr-20">
            {loading || !user ? (
              <>
                <Link href="/login" className="nav-link font-['Space_Grotesk'] px-6 py-2 bg-gray-200 border border-gray-400 rounded-full">Log in</Link>
                <Link
  href="/signup"
  className="nav-link font-['Space_Grotesk'] px-6 py-2 rounded-full border text-gray-800 font-semibold bg-[#b0efcb] border-[#00b86b] hover:bg-[#a2e7c0] transition">Sign up</Link>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </nav>
  );
}

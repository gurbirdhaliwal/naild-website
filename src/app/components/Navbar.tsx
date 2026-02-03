'use client';

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { VscAccount } from "react-icons/vsc";
import { MdOutlinePersonPin, MdLogout } from "react-icons/md";
import { IoSettingsOutline } from "react-icons/io5";
import { useAuth } from "../context/AuthContext";
import { API_BASE } from "../services/api";

export default function Navbar() {
  const { user, loading, setUser } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
      setUser(null);
      window.location.href = "/";
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  return (
    <nav className="fixed top-3 left-1/2 transform -translate-x-1/2 z-50 w-[100%] max-w-7xl rounded-2xl border border-gray-200 bg-white/80 backdrop-blur-md px-15 py-0 font-['Space_Grotesk']">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo */}
          <div className="flex items-center space-x-2 -ml-20">
            <Link href="/" className="flex items-center space-x-2">
              <img
                src="/naild_logo.png"
                alt="Naild Logo"
                className="h-10 w-10 object-contain mr-0 mb-1"
              />
              <span className="text-2xl font-regular text-black tracking-tight">
                naild.
              </span>
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="hidden sm:flex sm:space-x-8 -ml-170 mt-1">
            <Link href="/features" className="nav-link font-['Space_Grotesk']">Features</Link>
            <Link href="/pricing" className="nav-link font-['Space_Grotesk']">Pricing</Link>
            <Link href="/about" className="nav-link font-['Space_Grotesk']">About</Link>
          </div>

          {/* Auth Section */}
          <div className="hidden sm:flex sm:items-center sm:space-x-4 relative -mr-20" ref={dropdownRef}>
            {!loading && user ? (
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen((prev) => !prev)}
                  className="flex items-center space-x-2 text-sm text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md font-medium cursor-pointer hover:bg-gray-100 transition"
                >
                  <VscAccount className="text-xl text-green-600" />
                  <span>Hi {user.firstname}</span>
                </button>
                <AnimatePresence>
                  {dropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.2 }}
                      className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-10"
                    >
                      <Link href="/profile" className="dropdown-link">
                        <MdOutlinePersonPin className="text-lg text-green-600" />
                        Profile
                      </Link>
                      <Link href="/settings" className="dropdown-link">
                        <IoSettingsOutline className="text-lg text-green-600" />
                        Settings
                      </Link>
                      <button onClick={handleLogout} className="dropdown-link text-red-600">
                        <MdLogout className="text-lg" />
                        Logout
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : !loading ? (
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

"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { VscAccount } from "react-icons/vsc";
import { MdOutlinePersonPin, MdLogout } from "react-icons/md";
import { IoSettingsOutline } from "react-icons/io5";

export default function Navbar() {
  const [user, setUser] = useState<{ firstname: string } | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    fetch("http://localhost:8080/api/v1/auth/me", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("Unauthorized");
        const userData = await res.json();
        setUser(userData);
      })
      .catch(() => {
        localStorage.removeItem("token");
        setUser(null);
      });
  }, []);

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

  const handleLogout = () => {
    localStorage.removeItem("token");
    setUser(null);
    window.location.href = "/";
  };

  return (
    <nav className="bg-white shadow-sm sticky top-0 z-50 backdrop-blur bg-white/90 shadow-sm">
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
                <span className="text-2xl font-regular text-black tracking-tight font-naild">naild.</span>
            </Link>
            </div>

          {/* Navigation Links */}
          <div className="hidden sm:flex sm:space-x-8 -ml-170 mt-1">
            <Link
              href="/features"
              className="text-gray-500 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium tracking-widest"
            >
              Features
            </Link>
            <Link
              href="/pricing"
              className="text-gray-500 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium tracking-widest"
            >
              Pricing
            </Link>
            <Link
              href="/about"
              className="text-gray-500 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium tracking-widest"
            >
              About
            </Link>
          </div>

          {/* Auth Section */}
          <div className="hidden sm:flex sm:items-center sm:space-x-4 relative -mr-20" ref={dropdownRef}>
            {user ? (
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
                      <Link
                    href="/profile"
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                    <MdOutlinePersonPin className="text-lg text-green-600" />
                    Profile
                    </Link>
                    <Link
                    href="/settings"
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                    <IoSettingsOutline className="text-lg text-green-600" />
                    Settings
                    </Link>
                    <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-red-600 cursor-pointer hover:bg-gray-100"
                    >
                    <MdLogout className="text-lg" />
                    Logout
                    </button>

                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Log in
                </Link>
                <Link
                  href="/signup"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

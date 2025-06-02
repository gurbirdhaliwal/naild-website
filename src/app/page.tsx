'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';

export default function Home() {
  return (
    <main className="mt-28 min-h-screen flex flex-col items-center bg-gradient-to-b from-white via-[#f4fff7] to-[#b8ffdc]">

      {/* Hero Section */}
      <section className="relative isolate overflow-hidden py-24 sm:py-32 w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-black">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-4xl font-semibold sm:text-6xl tracking-tight"
          >
            from nervous to naild
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mt-4 text-3xl sm:text-5xl max-w-3xl mx-auto text-gray-900"
          >
            — we’ve got <span className="text-green-500 font-medium">you.</span>
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="mt-10"
          >
            <Link
              href="/demo"
              className="px-8 py-3 rounded-full font-medium text-lg button-gradient"
            >
              Get Started
            </Link>
          </motion.div>
        </div>

        {/* Media Box */}
        <div className="mt-12 max-w-7xl mx-auto rounded-2xl bg-gray-300 w-full h-[650px] relative flex items-start justify-start">
          
        </div>

        {/* Logos Row */}
        <div className="flex justify-center items-center mt-10 flex-wrap gap-6">
          {[
            'usna', 'princeton', 'yale', 'harvard', 'mit', 'stanford', 'utoronto'
          ].map((name, i) => (
            <Image
              key={i}
              src={`/logos/${name}.png`}
              alt={`${name} logo`}
              width={48}
              height={48}
              className="object-contain"
            />
          ))}
        </div>
      </section>
    </main>
  );
}

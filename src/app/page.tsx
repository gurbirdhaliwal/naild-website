'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <section className="relative animated-gradient isolate overflow-hidden py-24 sm:py-50">
      <div className="absolute inset-0 bg-black/10 z-0" />
      <div className="absolute bottom-0 left-0 w-full h-100 z-10 pointer-events-none fade-to-white" />


  <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-black">
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
      className="mt-6 text-xl sm:text-6xl max-w-3xl mx-auto"
    >
      we've got you.
    </motion.p>
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.4 }}
      className="mt-10"
    >
     <Link
  href="/demo"
  className="px-8 py-3 rounded-full font-regular text-lg button-gradient"
>
  Get Started
</Link>
      </motion.div>
      </div>
      </section>
    </main>
  );
}

'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-l from-green-600 to-green-710 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-4xl sm:text-6xl font-bold tracking-tight"
            >
              Master Your Interview Skills with AI
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="mt-6 text-xl sm:text-2xl max-w-3xl mx-auto"
            >
              Practice behavioral interviews with real-time AI feedback on your facial expressions, voice tone, and responses.
            </motion.p>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="mt-10"
            >
              <Link 
                href="/demo"
                className="bg-white text-green-600 px-8 py-3 rounded-full font-semibold text-lg hover:bg-green-50 transition-colors"
              >
                Try Demo
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900">Why Choose Naild?</h2>
            <p className="mt-4 text-lg text-gray-600">Advanced AI technology to help you succeed in interviews</p>
          </div>

          <div className="mt-20 grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-3">
            {/* Feature 1 */}
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="bg-gray-50 rounded-xl p-8"
            >
              <div className="text-green-600 text-2xl mb-4">
                👤
              </div>
              <h3 className="text-xl font-semibold text-gray-900">Facial Expression Analysis</h3>
              <p className="mt-4 text-gray-600">Real-time feedback on your facial expressions and body language during interviews.</p>
            </motion.div>

            {/* Feature 2 */}
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="bg-gray-50 rounded-xl p-8"
            >
              <div className="text-green-600 text-2xl mb-4">
                🎤
              </div>
              <h3 className="text-xl font-semibold text-gray-900">Voice Analysis</h3>
              <p className="mt-4 text-gray-600">Get insights on your tone, pace, and clarity of speech during responses.</p>
            </motion.div>

            {/* Feature 3 */}
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="bg-gray-50 rounded-xl p-8"
            >
              <div className="text-green-600 text-2xl mb-4">
                🤖
              </div>
              <h3 className="text-xl font-semibold text-gray-900">AI-Powered Feedback</h3>
              <p className="mt-4 text-gray-600">Detailed analysis and suggestions to improve your interview performance.</p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-green-600 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold">Ready to Ace Your Next Interview?</h2>
          <p className="mt-4 text-xl">Start practicing with Naild today and build your confidence.</p>
          <div className="mt-10">
            <Link 
              href="/signup"
              className="bg-white text-green-600 px-8 py-3 rounded-full font-semibold text-lg hover:bg-green-50 transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

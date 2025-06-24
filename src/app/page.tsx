"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useAuth } from './context/AuthContext';

const NaildLanding = () => {
  const [activeTab, setActiveTab] = useState('feedback');
  const [isVideoMuted, setIsVideoMuted] = useState(true);

  const tabs = [
    { id: 'feedback', label: 'Feedback' },
    { id: 'scores', label: 'Scores' },
    { id: 'personas', label: 'Personas' },
    { id: 'replay', label: 'Replay' }
  ];

  const router = useRouter();
  const { user, loading } = useAuth();

  const handleGetStarted = () => {
    if (loading) return;
    if (user) {
      router.push('/interview');
    } else {
      window.history.pushState({}, '', '/');
      router.push('/login?redirect=/interview');
    }
  };

  return (
    <div className="font-['Space_Grotesk'] text-center">

      {/* Hero Section */}
      <section className="bg-white pt-24 px-5">
        <div className="max-w-6xl mx-auto">
          <h1 className="my-30 text-6xl md:text-7xl font-regular mb-10 text-black leading-tight">
            from nervous to naild<br />
            — we’ve got <span className="text-green-500">you</span>.
          </h1>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="mt-10"
          >
            <button
              onClick={handleGetStarted}
              className="px-8 py-3 rounded-xl outline outline-green-500 outline-offset-2 font-medium text-lg button-gradient"
            >
              Get Started
            </button>
          </motion.div>
        </div>
      </section>

      {/* Demo Section */}
      <section className="bg-[linear-gradient(to_bottom,_#ffffff_0%,_#e0fdee_30%,_#b2f5cb_60%,_#ffffff_100%)] py-24 px-5">
        <div className="max-w-6xl mx-auto">
          <div className="relative max-w-4xl mx-auto mb-16 rounded-3xl overflow-hidden shadow-2xl bg-gray-400 aspect-video flex items-center justify-center">
            <button
              onClick={() => setIsVideoMuted(!isVideoMuted)}
              className="absolute top-5 left-5 w-10 h-10 bg-white/90 rounded-full flex items-center justify-center hover:bg-white transition-all duration-200 z-10"
              aria-label="Toggle video sound"
            >
              {isVideoMuted ? '🔇' : '🔊'}
            </button>
            <div className="w-full h-full bg-gradient-to-br from-gray-300 to-gray-500 flex items-center justify-center text-white/70 text-lg">
              Demo Video Placeholder
            </div>
          </div>

          <div className="flex justify-center items-center gap-8 md:gap-12 flex-wrap opacity-80 mb-10">
            {[
              { name: 'Princeton', bg: 'bg-gradient-to-br from-orange-500 to-orange-400', shape: 'rounded-full' },
              { name: 'Blackstone', bg: 'bg-black', shape: 'polygon' },
              { name: 'BCG', bg: 'bg-blue-800', shape: 'rounded-lg' },
              { name: 'Harvard', bg: 'bg-red-800', shape: 'rounded-full' },
              { name: 'MIT', bg: 'bg-red-900', shape: 'rounded' },
              { name: 'Stanford', bg: 'bg-red-700', shape: 'rounded-full' },
              { name: 'Yale', bg: 'bg-blue-900', shape: 'rounded' }
            ].map((logo, index) => (
              <div
                key={index}
                className={`flex items-center justify-center ${logo.bg} ${logo.shape} hover:opacity-100 transition-opacity duration-200`}
                style={{
                  width: '60px',
                  height: '60px',
                  clipPath: logo.name === 'Blackstone' ? 'polygon(50% 0%, 0% 100%, 100% 100%)' : 'none'
                }}
                title={logo.name}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-white pt-24 pb-24 px-5">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-5xl font-normal mb-4 text-black">
            Level up your interview skills with <span className="text-green-500">naild</span>.
          </h2>
          <p className="text-xl text-gray-500 mb-10 font-normal">
            Feed in the job details, watch AI craft targeted questions, and start<br />
            practicing instantly.
          </p>

          <div className="flex justify-center gap-4 mb-14 flex-wrap">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 border rounded-full transition-all duration-200 font-normal shadow-sm ${
                  activeTab === tab.id
                    ? 'bg-green-500 text-white border-green-500'
                    : 'bg-white/80 text-gray-600 border-black/10 hover:bg-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="max-w-4xl mx-auto bg-gray-400 rounded-3xl aspect-video overflow-hidden shadow-2xl flex">
            <div className="w-2/5 bg-gray-300/90 flex items-center justify-center rounded-l-3xl">
              <div className="text-gray-600 text-center">
                <div className="text-lg font-medium mb-2">{tabs.find(t => t.id === activeTab)?.label}</div>
                <div className="text-sm">Feature demo for {activeTab}</div>
              </div>
            </div>
            <div className="w-3/5 flex items-center justify-center text-white/70 text-lg">
              Main Interface
            </div>
          </div>
        </div>
      </section>

      {/* Plans Section */}
      <section className="bg-white pt-24 pb-32 px-5">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-5xl font-normal mb-4 text-black">
            Let’s get you <span className="text-green-500">hired</span>.
          </h2>
          <p className="text-xl text-gray-500 mb-20 font-normal">
            From first interviews to dream jobs, our plans are designed<br />
            to support you with affordable, effective prep.
          </p>

          <div className="flex justify-center">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl w-full">
              {['Basic', 'Pro', 'Enterprise'].map((plan, index) => (
                <div
                  key={index}
                  className="bg-gray-300/40 rounded-3xl aspect-[3/4] hover:transform hover:-translate-y-1 hover:shadow-lg transition-all duration-200 flex items-center justify-center"
                >
                  <div className="text-center text-gray-600">
                    <div className="text-xl font-medium mb-2">{plan}</div>
                    <div className="text-sm">Coming Soon</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-[linear-gradient(to_bottom,_#ffffff_0%,_#e6faef_20%,_#c3f3d8_60%,_#b0efcb_100%)] py-32 flex items-center justify-center text-center px-5">
        <div className="relative bg-white rounded-full px-12 py-8 shadow-lg max-w-xl w-full">
          <h3 className="text-3xl font-normal mb-6 text-black">
            Smarter Interviews Start <span className="text-green-500">Here</span>.
          </h3>
          <button
            onClick={handleGetStarted}
            className="px-8 py-3 bg-green-500 text-white rounded-full font-medium hover:bg-green-600 transition-all duration-200"
          >
            Get Started
          </button>
          <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-t-[16px] border-l-transparent border-r-transparent border-t-white"></div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-black/5 pt-12 pb-8 px-5">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-16 mb-8 text-left">
            <div>
              <h4 className="font-medium mb-2 text-black text-lg">naild.</h4>
              <p className="text-gray-500 text-sm mb-4">© 2025 naild. Toronto, ON</p>
              <div className="flex gap-4">
                {['Discord', 'Twitter', 'YouTube', 'Instagram', 'LinkedIn'].map((social, index) => (
                  <a
                    key={index}
                    href="#"
                    className="w-6 h-6 bg-gray-500 rounded hover:bg-black transition-colors duration-200"
                    aria-label={social}
                  />
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-medium mb-4 text-black">Company</h4>
              {['Contact Us', 'Careers', 'Ethos', 'Help'].map((link, index) => (
                <a
                  key={index}
                  href="#"
                  className="block text-gray-500 text-sm mb-3 hover:text-black transition-colors duration-200"
                >
                  {link}
                </a>
              ))}
            </div>
            <div>
              <h4 className="font-medium mb-4 text-black">Legal</h4>
              {['Terms of Service', 'Privacy Policy', 'Acts Notices', 'Labs'].map((link, index) => (
                <a
                  key={index}
                  href="#"
                  className="block text-gray-500 text-sm mb-3 hover:text-black transition-colors duration-200"
                >
                  {link}
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default NaildLanding;

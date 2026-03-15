"use client";

import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useAuth } from './context/AuthContext';
import {
  broadcastLogout,
  clearOAuthHandoffRedirect,
  getOAuthHandoffRedirect,
  requestLogout,
} from './services/authSession';

const tabs = [
  {
    id: 'feedback',
    label: 'Feedback',
    title: 'Get feedback that improves how you explain technical ideas.',
    description:
      'Naild scores clarity, correctness, depth, and audience fit so every drill ends with specific direction for the next retry.',
    previewLabel: 'AI Coach Feedback',
    previewTitle: 'Explain why you chose retrieval-augmented generation over fine-tuning.',
    previewDetail: 'Audience: Non-technical stakeholder',
    bullets: ['Clarity: 82', 'Correctness: 79', 'Depth: 74', 'Audience fit: 88'],
  },
  {
    id: 'scores',
    label: 'Scores',
    title: 'Track communication as a skill, not just a one-off practice session.',
    description:
      'Watch your strongest and weakest communication instincts over time instead of treating each drill like an isolated exercise.',
    previewLabel: 'Progress Snapshot',
    previewTitle: 'Weekly practice target: 4 drills',
    previewDetail: '2-week trend: +11 clarity, +8 depth',
    bullets: ['4 drills completed', '3 retries', 'Best audience: PM', 'Needs work: tradeoffs'],
  },
  {
    id: 'personas',
    label: 'Audience',
    title: 'Practice the same idea for different listeners.',
    description:
      'A product manager, recruiter, and senior engineer should not hear the same explanation. Naild changes the drill and grading based on audience.',
    previewLabel: 'Audience Variation',
    previewTitle: 'Precision vs recall',
    previewDetail: 'Compare how you explain it to a PM vs a peer engineer',
    bullets: ['Product manager', 'Peer engineer', 'Senior engineer', 'Recruiter'],
  },
  {
    id: 'replay',
    label: 'Replay',
    title: 'Retry the same drill until the explanation actually lands.',
    description:
      'Use the transcript, missing points, and improved outline to tighten the answer instead of guessing what to change.',
    previewLabel: 'Retry Loop',
    previewTitle: 'Redis vs database caching for a high-read service',
    previewDetail: 'Try again with sharper tradeoff framing',
    bullets: ['Transcript saved', 'Missing point highlighted', 'Improved outline suggested', 'Retry advice generated'],
  },
] as const;

type LandingTab = (typeof tabs)[number]['id'];

const NaildLanding = () => {
  const [activeTab, setActiveTab] = useState<LandingTab>('feedback');
  const [isVideoMuted, setIsVideoMuted] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isRedirectingToInterview, setIsRedirectingToInterview] = useState(false);

  const router = useRouter();
  const { user, loading, setUser } = useAuth();

  React.useEffect(() => {
    if (loading || !user) return;

    const oauthTarget = getOAuthHandoffRedirect();
    if (oauthTarget) {
      setIsRedirectingToInterview(true);
      router.replace(oauthTarget);
      return;
    }

    let active = true;
    setIsLoggingOut(true);

    (async () => {
      try {
        await requestLogout();
      } catch (err) {
        console.error('Landing auto-logout failed:', err);
      } finally {
        if (!active) return;
        setUser(null);
        broadcastLogout();
        setIsLoggingOut(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [loading, router, user, setUser]);

  React.useEffect(() => {
    if (loading || user) return;
    clearOAuthHandoffRedirect();
  }, [loading, user]);

  const handleGetStarted = () => {
    if (loading || isLoggingOut) return;
    window.history.pushState({}, '', '/');
    router.push('/login?redirect=/interview');
  };

  const activeFeature = useMemo(
    () => tabs.find((tab) => tab.id === activeTab) ?? tabs[0],
    [activeTab]
  );

  if (loading || isLoggingOut || isRedirectingToInterview) {
    return <div className="min-h-screen bg-white" />;
  }

  return (
    <div className="font-['Space_Grotesk'] text-center">
      <section className="bg-white px-5 pt-24">
        <div className="mx-auto max-w-6xl">
          <h1 className="my-30 mb-10 text-6xl font-regular leading-tight text-black md:text-7xl">
            Explain complex
            <br />
            software ideas clearly.
          </h1>
          <p className="mx-auto max-w-3xl text-xl font-normal leading-9 text-gray-500">
            AI-powered drills, feedback, retries, and progress tracking.
          </p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="mt-10"
          >
            <button
              onClick={handleGetStarted}
              className="button-gradient rounded-xl px-8 py-3 text-lg font-medium outline outline-green-500 outline-offset-2"
            >
              Start Practicing
            </button>
          </motion.div>
        </div>
      </section>

      <section className="bg-[linear-gradient(to_bottom,_#ffffff_0%,_#e0fdee_30%,_#b2f5cb_60%,_#ffffff_100%)] px-5 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="relative mx-auto mb-16 flex aspect-video max-w-4xl items-center justify-center overflow-hidden rounded-3xl bg-gray-400 shadow-2xl">
            <button
              onClick={() => setIsVideoMuted(!isVideoMuted)}
              className="absolute left-5 top-5 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 transition-all duration-200 hover:bg-white"
              aria-label="Toggle video sound"
            >
              {isVideoMuted ? '🔇' : '🔊'}
            </button>
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-300 to-gray-500 text-lg text-white/70">
              Technical Communication Demo Placeholder
            </div>
          </div>

          <div className="mb-10 flex flex-wrap items-center justify-center gap-8 opacity-80 md:gap-12">
            {[
              { name: 'Princeton', bg: 'bg-gradient-to-br from-orange-500 to-orange-400', shape: 'rounded-full' },
              { name: 'Blackstone', bg: 'bg-black', shape: 'polygon' },
              { name: 'BCG', bg: 'bg-blue-800', shape: 'rounded-lg' },
              { name: 'Harvard', bg: 'bg-red-800', shape: 'rounded-full' },
              { name: 'MIT', bg: 'bg-red-900', shape: 'rounded' },
              { name: 'Stanford', bg: 'bg-red-700', shape: 'rounded-full' },
              { name: 'Yale', bg: 'bg-blue-900', shape: 'rounded' },
            ].map((logo, index) => (
              <div
                key={index}
                className={`flex items-center justify-center ${logo.bg} ${logo.shape} transition-opacity duration-200 hover:opacity-100`}
                style={{
                  width: '60px',
                  height: '60px',
                  clipPath: logo.name === 'Blackstone' ? 'polygon(50% 0%, 0% 100%, 100% 100%)' : 'none',
                }}
                title={logo.name}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white px-5 pb-24 pt-24">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-4 text-5xl font-normal text-black">
            Train the communication skills strong engineers use every week.
          </h2>
          <p className="mb-10 text-xl font-normal text-gray-500">
            Pick your field, audience, and scenario. Naild generates the drill,
            <br />
            listens to your answer, and tells you how to tighten it.
          </p>

          <div className="mb-14 flex flex-wrap justify-center gap-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-full border px-6 py-3 font-normal shadow-sm transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'border-green-500 bg-green-500 text-white'
                    : 'border-black/10 bg-white/80 text-gray-600 hover:bg-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="mx-auto flex aspect-video max-w-4xl overflow-hidden rounded-3xl bg-gray-400 shadow-2xl">
            <div className="flex w-2/5 items-center justify-center rounded-l-3xl bg-gray-300/90">
              <div className="px-8 text-center text-gray-700">
                <div className="mb-2 text-lg font-medium">{activeFeature.previewLabel}</div>
                <div className="text-sm leading-6">{activeFeature.description}</div>
              </div>
            </div>
            <div className="flex w-3/5 items-center justify-center px-8">
              <div className="w-full max-w-sm rounded-3xl bg-white/90 p-6 text-left text-gray-700 shadow-lg">
                <div className="text-xs font-medium uppercase tracking-[0.18em] text-green-600">
                  {activeFeature.label}
                </div>
                <div className="mt-3 text-lg font-medium text-gray-900">
                  {activeFeature.previewTitle}
                </div>
                <div className="mt-2 text-sm text-gray-500">{activeFeature.previewDetail}</div>
                <div className="mt-5 grid gap-2">
                  {activeFeature.bullets.map((bullet) => (
                    <div
                      key={bullet}
                      className="rounded-2xl border border-black/5 bg-gray-50 px-4 py-3 text-sm"
                    >
                      {bullet}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white px-5 pb-32 pt-24">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-4 text-5xl font-normal text-black">
            Build the habit before the high-stakes conversation.
          </h2>
          <p className="mb-20 text-xl font-normal text-gray-500">
            Whether you are preparing for interviews, design reviews, or stakeholder updates,
            <br />
            Naild gives you a repeatable way to practice out loud.
          </p>

          <div className="flex justify-center">
            <div className="grid w-full max-w-4xl grid-cols-1 gap-8 md:grid-cols-3">
              {[
                { name: 'Starter', detail: 'Practice communication fundamentals' },
                { name: 'Growth', detail: 'Sharpen role-specific drills and retries' },
                { name: 'Teams', detail: 'Train technical communication across your org' },
              ].map((plan, index) => (
                <div
                  key={index}
                  className="flex aspect-[3/4] items-center justify-center rounded-3xl bg-gray-300/40 transition-all duration-200 hover:-translate-y-1 hover:transform hover:shadow-lg"
                >
                  <div className="text-center text-gray-600">
                    <div className="mb-2 text-xl font-medium">{plan.name}</div>
                    <div className="text-sm">{plan.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[linear-gradient(to_bottom,_#ffffff_0%,_#e6faef_20%,_#c3f3d8_60%,_#b0efcb_100%)] px-5 py-32 text-center">
        <div className="relative mx-auto w-full max-w-xl rounded-full bg-white px-12 py-8 shadow-lg">
          <h3 className="mb-6 text-3xl font-normal text-black">
            Practice the way strong
            <br />
            engineers <span className="text-green-500">explain</span>.
          </h3>
          <button
            onClick={handleGetStarted}
            className="rounded-full bg-green-500 px-8 py-3 font-medium text-white transition-all duration-200 hover:bg-green-600"
          >
            Start Practicing
          </button>
          <div className="absolute -bottom-2 left-1/2 h-0 w-0 -translate-x-1/2 transform border-l-8 border-r-8 border-t-[16px] border-l-transparent border-r-transparent border-t-white"></div>
        </div>
      </section>

      <footer className="border-t border-black/5 bg-white px-5 pb-8 pt-12">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 grid grid-cols-1 gap-16 text-left md:grid-cols-3">
            <div>
              <h4 className="mb-2 text-lg font-medium text-black">naild.</h4>
              <p className="mb-4 text-sm text-gray-500">© 2026 naild. Toronto, ON</p>
              <div className="flex gap-4">
                {['Discord', 'Twitter', 'YouTube', 'Instagram', 'LinkedIn'].map((social, index) => (
                  <a
                    key={index}
                    href="#"
                    className="h-6 w-6 rounded bg-gray-500 transition-colors duration-200 hover:bg-black"
                    aria-label={social}
                  />
                ))}
              </div>
            </div>
            <div>
              <h4 className="mb-4 font-medium text-black">Company</h4>
              {['Contact Us', 'Careers', 'Ethos', 'Help'].map((link, index) => (
                <a
                  key={index}
                  href="#"
                  className="mb-3 block text-sm text-gray-500 transition-colors duration-200 hover:text-black"
                >
                  {link}
                </a>
              ))}
            </div>
            <div>
              <h4 className="mb-4 font-medium text-black">Legal</h4>
              {['Terms of Service', 'Privacy Policy', 'Acts Notices', 'Labs'].map((link, index) => (
                <a
                  key={index}
                  href="#"
                  className="mb-3 block text-sm text-gray-500 transition-colors duration-200 hover:text-black"
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

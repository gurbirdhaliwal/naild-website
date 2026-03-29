"use client";

import React, { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from './context/AuthContext';
import { AUREON_NAME } from './lib/modelConfig';
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
    previewLabel: `${AUREON_NAME} Feedback`,
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

const heroHeadline = 'Explain complex\nsoftware ideas clearly.';
const universityLogos = [
  {
    name: 'Wilfrid Laurier University',
    logoSrc: '/universities/WilfridLaurierUniversity.png',
    width: 417,
    height: 83,
  },
  {
    name: 'University of Waterloo',
    logoSrc: '/universities/UniversityofWaterloo.png',
    width: 342,
    height: 194,
  },
  {
    name: 'University of Guelph',
    logoSrc: '/universities/UniversityofGuelph.png',
    width: 369,
    height: 113,
  },
  {
    name: 'Western University',
    logoSrc: '/universities/WesternUniversity.png',
    width: 345,
    height: 107,
  },
  {
    name: 'University of Toronto',
    logoSrc: '/universities/UniversityofToronto.png',
    width: 354,
    height: 146,
  },
  {
    name: 'McMaster University',
    logoSrc: '/universities/McMasterUniversity.png',
    width: 326,
    height: 104,
  },
  {
    name: 'McGill University',
    logoSrc: '/universities/McGillUniversity.png',
    width: 330,
    height: 97,
  },
] as const;
const planCards = [
  { name: 'Starter', detail: 'Practice communication fundamentals' },
  { name: 'Growth', detail: 'Sharpen role-specific drills and retries' },
  { name: 'Teams', detail: 'Train technical communication across your org' },
] as const;
const planCardOffsets = [
  { x: -20, y: 0 },
  { x: 0, y: 20 },
  { x: 20, y: 0 },
] as const;
const founderProfiles = [
  {
    id: 'cofounder-01',
    linkedinPlaceholder: 'LinkedIn URL placeholder',
  },
  {
    id: 'cofounder-02',
    linkedinPlaceholder: 'LinkedIn URL placeholder',
  },
] as const;

// ─── Sticky Scroll Features Section ───────────────────────────────────────────

function StickyFeaturesSection({ prefersReducedMotion }: { prefersReducedMotion: boolean | null }) {
  const [scrollState, setScrollState] = useState({
    activeIndex: 0,
    backdropOpacity: 0,
    sectionProgress: 0,
    surfaceProgress: 0,
  });
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const activeFeature = tabs[scrollState.activeIndex];
  const hasDarkBackdrop =
    scrollState.backdropOpacity >= 0.55 || scrollState.activeIndex > 0;
  const surfaceScale = prefersReducedMotion
    ? 1
    : 0.9 + scrollState.surfaceProgress * 0.1;
  const surfaceY = prefersReducedMotion
    ? 0
    : (1 - scrollState.surfaceProgress) * 112;
  const surfaceRadius = prefersReducedMotion
    ? 0
    : (1 - scrollState.surfaceProgress) * 56;
  const glowProgress = prefersReducedMotion
    ? 1
    : Math.min(1, Math.max(0, (scrollState.sectionProgress - 0.08) / 0.84));
  const glowOpacity =
    scrollState.backdropOpacity *
    (prefersReducedMotion ? 0.78 : 0.18 + glowProgress * 0.92);
  const glowHaloOpacity = prefersReducedMotion
    ? 0.52
    : 0.14 + glowProgress * 0.52;
  const glowCoreOpacity = prefersReducedMotion
    ? 0.42
    : 0.1 + glowProgress * 0.48;
  const glowHotspotOpacity = prefersReducedMotion
    ? 0.32
    : 0.06 + glowProgress * 0.42;
  const glowHaloScale = prefersReducedMotion
    ? 2.35
    : 0.9 + glowProgress * 2.1;
  const glowCoreScale = prefersReducedMotion
    ? 1.94
    : 0.72 + glowProgress * 1.55;
  const glowHotspotScale = prefersReducedMotion
    ? 1.36
    : 0.58 + glowProgress * 1.02;

  useEffect(() => {
    let frameId: number | null = null;

    const updateScrollState = () => {
      const section = sectionRef.current;

      if (!section) {
        return;
      }

      const sectionRect = section.getBoundingClientRect();
      const viewportHeight = Math.max(window.innerHeight, 1);
      const totalScrollable = Math.max(
        sectionRect.height - viewportHeight,
        1
      );
      const sectionProgress = Math.min(
        1,
        Math.max(0, -sectionRect.top / totalScrollable)
      );
      const surfaceProgress = prefersReducedMotion
        ? 1
        : Math.min(
            1,
            Math.max(
              0,
              (viewportHeight - sectionRect.top) / (viewportHeight * 0.9)
            )
          );
      const stageProgress = sectionProgress * tabs.length;
      const nextIndex = Math.min(
        tabs.length - 1,
        Math.max(0, Math.floor(stageProgress))
      );
      const firstStageProgress = Math.min(1, Math.max(0, stageProgress));
      const fadeStart = 0.02;
      const fadeEnd = 0.1;
      const nextOpacity = prefersReducedMotion
        ? nextIndex > 0
          ? 1
          : 0
        : firstStageProgress <= fadeStart
        ? 0
        : firstStageProgress >= fadeEnd
        ? 1
        : (firstStageProgress - fadeStart) / (fadeEnd - fadeStart);

      setScrollState((currentState) => {
        const indexChanged = currentState.activeIndex !== nextIndex;
        const opacityChanged =
          Math.abs(currentState.backdropOpacity - nextOpacity) >= 0.01;
        const progressChanged =
          Math.abs(currentState.sectionProgress - sectionProgress) >= 0.01;
        const surfaceChanged =
          Math.abs(currentState.surfaceProgress - surfaceProgress) >= 0.01;

        if (!indexChanged && !opacityChanged && !progressChanged && !surfaceChanged) {
          return currentState;
        }

        return {
          activeIndex: nextIndex,
          backdropOpacity: opacityChanged
            ? nextOpacity
            : currentState.backdropOpacity,
          sectionProgress: progressChanged
            ? sectionProgress
            : currentState.sectionProgress,
          surfaceProgress: surfaceChanged
            ? surfaceProgress
            : currentState.surfaceProgress,
        };
      });

      frameId = null;
    };

    const handleViewportChange = () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }

      frameId = window.requestAnimationFrame(updateScrollState);
    };

    handleViewportChange();
    window.addEventListener('scroll', handleViewportChange, { passive: true });
    document.addEventListener('scroll', handleViewportChange, {
      capture: true,
      passive: true,
    });
    window.addEventListener('resize', handleViewportChange);

    return () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }

      window.removeEventListener('scroll', handleViewportChange);
      document.removeEventListener('scroll', handleViewportChange, true);
      window.removeEventListener('resize', handleViewportChange);
    };
  }, [prefersReducedMotion]);

  return (
    <section
      ref={sectionRef}
      className="relative z-20 mt-24 bg-white md:mt-32"
      style={{ height: `${(tabs.length + 1) * 100}vh` }}
    >
      {/* Sticky container — locks in place while section scrolls past */}
      <div className="sticky top-0 z-20 h-screen overflow-hidden bg-white px-5 py-4 md:py-6">
        <motion.div
          className="pointer-events-none absolute inset-0 bg-black"
          initial={false}
          animate={{ opacity: scrollState.backdropOpacity }}
          transition={{
            duration: prefersReducedMotion ? 0 : 0.75,
            ease: [0.22, 1, 0.36, 1],
          }}
        />
        <motion.div
          className="pointer-events-none absolute inset-0 overflow-hidden"
          initial={false}
          animate={{ opacity: glowOpacity }}
          transition={{
            duration: prefersReducedMotion ? 0 : 0.75,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          <div
            className="absolute left-1/2 top-[38%] h-[12rem] w-[52rem] -translate-x-1/2 -translate-y-1/2 md:h-[16rem] md:w-[78rem]"
          >
            <div
              className="h-full w-full rounded-full blur-[120px] md:blur-[144px]"
              style={{
                opacity: glowHaloOpacity,
                transform: `scale(${glowHaloScale})`,
                background:
                  'radial-gradient(circle, rgba(209,250,229,0.34) 0%, rgba(167,243,208,0.28) 18%, rgba(52,211,153,0.18) 36%, rgba(16,185,129,0.08) 58%, rgba(16,185,129,0) 76%)',
              }}
            />
          </div>
          <div
            className="absolute left-1/2 top-[38%] h-[8rem] w-[38rem] -translate-x-1/2 -translate-y-1/2 md:h-[11rem] md:w-[56rem]"
          >
            <div
              className="h-full w-full rounded-full blur-[60px] md:blur-[72px]"
              style={{
                opacity: glowCoreOpacity,
                transform: `scale(${glowCoreScale})`,
                background:
                  'radial-gradient(circle, rgba(255,255,255,0.46) 0%, rgba(209,250,229,0.34) 18%, rgba(110,231,183,0.22) 38%, rgba(16,185,129,0.1) 60%, rgba(16,185,129,0) 80%)',
              }}
            />
          </div>
          <div
            className="absolute left-[52%] top-[37%] h-[4.5rem] w-[20rem] -translate-x-1/2 -translate-y-1/2 md:h-[6rem] md:w-[28rem]"
          >
            <div
              className="h-full w-full rounded-full blur-[24px] md:blur-[28px]"
              style={{
                opacity: glowHotspotOpacity,
                transform: `scale(${glowHotspotScale})`,
                background:
                  'radial-gradient(circle, rgba(255,255,255,0.62) 0%, rgba(236,253,245,0.4) 24%, rgba(110,231,183,0.2) 52%, rgba(16,185,129,0) 76%)',
              }}
            />
          </div>
        </motion.div>
        <div className="pointer-events-none absolute left-4 top-1/2 z-20 hidden -translate-y-1/2 md:flex md:flex-col md:items-center">
          <div
            className={`relative h-44 w-px overflow-hidden rounded-full transition-colors duration-700 ${
              hasDarkBackdrop ? 'bg-white/12' : 'bg-black/10'
            }`}
          >
            <motion.div
              className="absolute inset-x-0 bottom-0 rounded-full bg-green-400"
              initial={false}
              animate={{ height: `${Math.max(scrollState.sectionProgress * 100, 6)}%` }}
              transition={{
                duration: prefersReducedMotion ? 0 : 0.18,
                ease: 'linear',
              }}
            />
          </div>
        </div>
        <div
          className="relative h-[calc(100vh-2rem)] overflow-hidden will-change-transform md:h-[calc(100vh-3rem)]"
          style={{
            transform: `translate3d(0, ${surfaceY}px, 0) scale(${surfaceScale})`,
            transformOrigin: 'center top',
            borderRadius: `${surfaceRadius}px`,
          }}
        >
        <div className="relative z-10 mx-auto flex h-full max-w-6xl flex-col justify-center py-20">

          {/* Section header */}
          <div className="mb-12 text-center">
            <h2
              className={`mb-3 text-5xl font-normal transition-colors duration-700 ${
                hasDarkBackdrop ? 'text-white' : 'text-black'
              }`}
            >
              Train the communication skills strong engineers use every week.
            </h2>
            <p
              className={`text-xl font-normal transition-colors duration-700 ${
                hasDarkBackdrop ? 'text-gray-300' : 'text-gray-500'
              }`}
            >
              Pick your field, audience, and scenario. Naild generates the drill,
              <br />
              listens to your answer, and tells you how to tighten it.
            </p>
          </div>

          {/* Main content — step indicators + animated card */}
          <div className="flex items-start gap-12">

            {/* Left: vertical step list */}
            <div className="flex w-64 shrink-0 flex-col gap-1">
              {tabs.map((tab, i) => (
                <div
                  key={tab.id}
                  className="flex items-start gap-4 rounded-2xl p-4 text-left"
                >
                  {/* Progress bar + number */}
                  <div className="flex flex-col items-center gap-1 pt-1">
                    <div
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-all duration-300 ${
                        i === scrollState.activeIndex
                          ? 'bg-green-500 text-white'
                          : i < scrollState.activeIndex
                          ? hasDarkBackdrop
                            ? 'bg-green-950 text-green-300'
                            : 'bg-green-100 text-green-600'
                          : hasDarkBackdrop
                          ? 'bg-zinc-800 text-zinc-500'
                          : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      {i < scrollState.activeIndex ? '✓' : i + 1}
                    </div>
                    {i < tabs.length - 1 && (
                      <div
                        className={`relative h-10 w-0.5 overflow-hidden rounded-full transition-colors duration-700 ${
                          hasDarkBackdrop ? 'bg-zinc-800' : 'bg-gray-100'
                        }`}
                      >
                        <motion.div
                          className="absolute inset-x-0 top-0 rounded-full bg-green-400"
                          animate={{ height: i < scrollState.activeIndex ? '100%' : '0%' }}
                          transition={{ duration: 0.4, ease: 'easeOut' }}
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <div
                      className={`text-sm font-semibold uppercase tracking-widest transition-colors duration-300 ${
                        i === scrollState.activeIndex
                          ? hasDarkBackdrop
                            ? 'text-green-400'
                            : 'text-green-600'
                          : hasDarkBackdrop
                          ? 'text-zinc-500'
                          : 'text-gray-400'
                      }`}
                    >
                      {tab.label}
                    </div>
                    <div
                      className={`mt-0.5 text-sm leading-snug transition-all duration-300 ${
                        i === scrollState.activeIndex
                          ? hasDarkBackdrop
                            ? 'max-h-20 text-zinc-200 opacity-100'
                            : 'max-h-20 text-gray-700 opacity-100'
                          : 'max-h-0 overflow-hidden opacity-0'
                      }`}
                    >
                      {tab.title}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Right: animated preview card */}
            <div className="relative flex-1">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={activeFeature.id}
                  initial={
                    prefersReducedMotion
                      ? { opacity: 0 }
                      : { opacity: 0, y: 32, scale: 0.97 }
                  }
                  animate={
                    prefersReducedMotion
                      ? { opacity: 1 }
                      : { opacity: 1, y: 0, scale: 1 }
                  }
                  exit={
                    prefersReducedMotion
                      ? { opacity: 0 }
                      : { opacity: 0, y: -32, scale: 0.97 }
                  }
                  transition={{
                    duration: prefersReducedMotion ? 0.15 : 0.42,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="flex aspect-video overflow-hidden rounded-3xl bg-gray-400 shadow-2xl"
                >
                  {/* Left pane: label + description */}
                  <motion.div
                    initial={prefersReducedMotion ? undefined : { x: -20, opacity: 0 }}
                    animate={prefersReducedMotion ? undefined : { x: 0, opacity: 1 }}
                    transition={{ duration: 0.32, delay: 0.08 }}
                    className="flex w-2/5 items-center justify-center rounded-l-3xl bg-gray-300/90"
                  >
                    <div className="px-8 text-center text-gray-700">
                      <div className="mb-2 text-lg font-medium">
                        {activeFeature.previewLabel}
                      </div>
                      <div className="text-sm leading-6">
                        {activeFeature.description}
                      </div>
                    </div>
                  </motion.div>

                  {/* Right pane: detail card */}
                  <motion.div
                    initial={prefersReducedMotion ? undefined : { x: 20, opacity: 0 }}
                    animate={prefersReducedMotion ? undefined : { x: 0, opacity: 1 }}
                    transition={{ duration: 0.32, delay: 0.12 }}
                    className="flex w-3/5 items-center justify-center px-8"
                  >
                    <div className="w-full max-w-sm rounded-3xl bg-white/90 p-6 text-left text-gray-700 shadow-lg">
                      <div className="text-xs font-medium uppercase tracking-[0.18em] text-green-600">
                        {activeFeature.label}
                      </div>
                      <div className="mt-3 text-lg font-medium text-gray-900">
                        {activeFeature.previewTitle}
                      </div>
                      <div className="mt-2 text-sm text-gray-500">
                        {activeFeature.previewDetail}
                      </div>
                      <div className="mt-5 grid gap-2">
                        {activeFeature.bullets.map((bullet, index) => (
                          <motion.div
                            key={bullet}
                            initial={
                              prefersReducedMotion
                                ? undefined
                                : { opacity: 0, y: 12 }
                            }
                            animate={
                              prefersReducedMotion
                                ? undefined
                                : { opacity: 1, y: 0 }
                            }
                            transition={{
                              duration: 0.26,
                              delay: 0.2 + index * 0.07,
                            }}
                            className="rounded-2xl border border-black/5 bg-gray-50 px-4 py-3 text-sm"
                          >
                            {bullet}
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              </AnimatePresence>

            </div>
          </div>
        </div>
        </div>
      </div>
    </section>
  );
}

function HabitDepthSection({ prefersReducedMotion }: { prefersReducedMotion: boolean | null }) {
  const [transitionState, setTransitionState] = useState({
    backdropOpacity: 0,
    surfaceProgress: 0,
  });
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const surfaceContentOpacity = prefersReducedMotion
    ? 1
    : Math.min(1, Math.max(0, (transitionState.surfaceProgress - 0.28) / 0.22));
  const surfaceScale = prefersReducedMotion
    ? 1
    : 0.9 + transitionState.surfaceProgress * 0.1;
  const surfaceY = prefersReducedMotion
    ? 0
    : (1 - transitionState.surfaceProgress) * 112;
  const surfaceRadius = prefersReducedMotion
    ? 0
    : (1 - transitionState.surfaceProgress) * 56;
  const cardsVisible = prefersReducedMotion || transitionState.surfaceProgress >= 0.45;

  useEffect(() => {
    let frameId: number | null = null;

    const updateTransitionState = () => {
      const section = sectionRef.current;

      if (!section) {
        return;
      }

      const sectionRect = section.getBoundingClientRect();
      const viewportHeight = Math.max(window.innerHeight, 1);
      const totalScrollable = Math.max(sectionRect.height - viewportHeight, 1);
      const sectionProgress = Math.min(
        1,
        Math.max(0, -sectionRect.top / totalScrollable)
      );
      const surfaceProgress = prefersReducedMotion
        ? 1
        : Math.min(1, Math.max(0, (sectionProgress - 0.2) / 0.58));
      const backdropOpacity = prefersReducedMotion
        ? 1
        : Math.min(1, Math.max(0, sectionProgress / 0.42));

      setTransitionState((currentState) => {
        const opacityChanged =
          Math.abs(currentState.backdropOpacity - backdropOpacity) >= 0.01;
        const surfaceChanged =
          Math.abs(currentState.surfaceProgress - surfaceProgress) >= 0.01;

        if (!opacityChanged && !surfaceChanged) {
          return currentState;
        }

        return {
          backdropOpacity: opacityChanged
            ? backdropOpacity
            : currentState.backdropOpacity,
          surfaceProgress: surfaceChanged
            ? surfaceProgress
            : currentState.surfaceProgress,
        };
      });

      frameId = null;
    };

    const handleViewportChange = () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }

      frameId = window.requestAnimationFrame(updateTransitionState);
    };

    handleViewportChange();
    window.addEventListener('scroll', handleViewportChange, { passive: true });
    document.addEventListener('scroll', handleViewportChange, {
      capture: true,
      passive: true,
    });
    window.addEventListener('resize', handleViewportChange);

    return () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }

      window.removeEventListener('scroll', handleViewportChange);
      document.removeEventListener('scroll', handleViewportChange, true);
      window.removeEventListener('resize', handleViewportChange);
    };
  }, [prefersReducedMotion]);

  return (
    <section
      ref={sectionRef}
      className="relative z-20 -mt-16 bg-black md:-mt-24"
      style={{ height: '200vh' }}
    >
      <div className="sticky top-0 h-screen overflow-hidden bg-black px-5 py-4 md:py-6">
        <motion.div
          className="pointer-events-none absolute inset-0 bg-white"
          initial={false}
          animate={{ opacity: transitionState.backdropOpacity }}
          transition={{
            duration: prefersReducedMotion ? 0 : 0.75,
            ease: [0.22, 1, 0.36, 1],
          }}
        />
        <div
          className="relative h-[calc(100vh-2rem)] overflow-hidden will-change-transform md:h-[calc(100vh-3rem)]"
          style={{
            transform: `translate3d(0, ${surfaceY}px, 0) scale(${surfaceScale})`,
            transformOrigin: 'center top',
            borderRadius: `${surfaceRadius}px`,
          }}
        >
          <div
            className="mx-auto flex h-full max-w-6xl flex-col justify-center py-24"
            style={{ opacity: surfaceContentOpacity }}
          >
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
                {planCards.map((plan, index) => (
                  <motion.div
                    key={plan.name}
                    initial={prefersReducedMotion ? false : { opacity: 0, ...planCardOffsets[index] }}
                    animate={
                      prefersReducedMotion
                        ? { opacity: 1, x: 0, y: 0 }
                        : cardsVisible
                        ? { opacity: 1, x: 0, y: 0 }
                        : { opacity: 0, ...planCardOffsets[index] }
                    }
                    transition={{
                      duration: prefersReducedMotion ? 0 : 0.45,
                      delay: prefersReducedMotion ? 0 : index * 0.08,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    className="flex aspect-[3/4] items-center justify-center rounded-3xl bg-gray-300/40 transition-all duration-200 hover:-translate-y-1 hover:transform hover:shadow-lg"
                  >
                    <div className="text-center text-gray-600">
                      <div className="mb-2 text-xl font-medium">{plan.name}</div>
                      <div className="text-sm">{plan.detail}</div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FoundersShowcaseSection({ prefersReducedMotion }: { prefersReducedMotion: boolean | null }) {
  const foundersHeading = 'Meet the Founders';
  const [typedHeading, setTypedHeading] = useState(
    prefersReducedMotion ? foundersHeading : ''
  );
  const [hasEnteredView, setHasEnteredView] = useState(Boolean(prefersReducedMotion));
  const sectionRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (prefersReducedMotion) {
      setTypedHeading(foundersHeading);
      setHasEnteredView(true);
      return;
    }

    const section = sectionRef.current;

    if (!section) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setHasEnteredView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.35 }
    );

    observer.observe(section);

    return () => observer.disconnect();
  }, [prefersReducedMotion]);

  useEffect(() => {
    if (!hasEnteredView) {
      return;
    }

    if (prefersReducedMotion) {
      setTypedHeading(foundersHeading);
      return;
    }

    setTypedHeading('');
    let currentIndex = 0;
    let intervalId: ReturnType<typeof setInterval> | undefined;

    const startDelayId = setTimeout(() => {
      intervalId = setInterval(() => {
        currentIndex += 1;
        setTypedHeading(foundersHeading.slice(0, currentIndex));

        if (currentIndex >= foundersHeading.length && intervalId !== undefined) {
          clearInterval(intervalId);
        }
      }, 60);
    }, 120);

    return () => {
      clearTimeout(startDelayId);
      if (intervalId !== undefined) {
        clearInterval(intervalId);
      }
    };
  }, [foundersHeading, hasEnteredView, prefersReducedMotion]);

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden bg-[linear-gradient(to_bottom,_#000000_0%,_#05140c_42%,_#020604_82%,_#000000_100%)] px-5 pb-40 pt-28 md:pb-48 md:pt-32"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mb-14 text-center">
          <div className="mb-4 text-sm font-medium uppercase tracking-[0.24em] text-emerald-300/70">
            The Team Behind Naild
          </div>
          <h2
            aria-label={foundersHeading}
            className="min-h-[3.5rem] text-5xl font-normal text-white md:min-h-[4.5rem] md:text-6xl"
          >
            <span aria-hidden="true">
              {typedHeading}
              {!prefersReducedMotion && hasEnteredView && typedHeading.length < foundersHeading.length ? (
                <span className="ml-1 inline-block h-[0.85em] w-[2px] translate-y-1 animate-pulse bg-white align-middle" />
              ) : null}
            </span>
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-zinc-300">
            Add founder portraits here when they are ready, along with final bios and LinkedIn
            profiles. The layout is already in place for both co-founders.
          </p>
        </div>

        <div className="mx-auto grid max-w-[53rem] gap-5 md:grid-cols-2 md:gap-6">
          {founderProfiles.map((founder, index) => (
            <motion.article
              key={founder.id}
              initial={
                prefersReducedMotion
                  ? undefined
                  : { opacity: 0, y: 36, scale: 0.98 }
              }
              whileInView={
                prefersReducedMotion
                  ? undefined
                  : { opacity: 1, y: 0, scale: 1 }
              }
              viewport={{ once: true, amount: 0.35 }}
              transition={{
                duration: prefersReducedMotion ? 0 : 0.5,
                delay: prefersReducedMotion ? 0 : index * 0.08,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="mx-auto w-full max-w-[25.5rem]"
            >
              <div className="relative flex aspect-[4/4.8] items-center justify-center rounded-[1.75rem] border border-dashed border-white/20 bg-[linear-gradient(180deg,_rgba(255,255,255,0.08)_0%,_rgba(255,255,255,0.03)_100%)] px-8 text-center">
                <div className="max-w-xs">
                  <div className="text-xs font-medium uppercase tracking-[0.28em] text-emerald-300/80">
                    Photo Placeholder
                  </div>
                  <div className="mt-3 text-xl font-medium text-white">
                    Add Founder Portrait Here
                  </div>
                  <div className="mt-2 text-sm leading-6 text-zinc-400">
                    Replace this placeholder with the real image once you provide it.
                  </div>
                </div>
                <div className="absolute bottom-4 right-4 rounded-full border border-emerald-400/20 bg-black/45 px-4 py-2 text-xs font-medium uppercase tracking-[0.2em] text-emerald-200 backdrop-blur-sm">
                  {founder.linkedinPlaceholder}
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-black md:h-52" />
    </section>
  );
}

// ─── Main Landing Page ─────────────────────────────────────────────────────────

const NaildLanding = () => {
  const [isVideoMuted, setIsVideoMuted] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isRedirectingToInterview, setIsRedirectingToInterview] = useState(false);
  const [typedHeroHeadline, setTypedHeroHeadline] = useState('');

  const prefersReducedMotion = useReducedMotion();
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

  React.useEffect(() => {
    if (prefersReducedMotion) {
      setTypedHeroHeadline(heroHeadline);
      return;
    }

    setTypedHeroHeadline('');
    let currentIndex = 0;
    let intervalId: ReturnType<typeof setInterval> | undefined;

    const startDelayId = setTimeout(() => {
      intervalId = setInterval(() => {
        currentIndex += 1;
        setTypedHeroHeadline(heroHeadline.slice(0, currentIndex));
        if (currentIndex >= heroHeadline.length) clearInterval(intervalId);
      }, 45);
    }, 180);

    return () => {
      clearTimeout(startDelayId);
      if (intervalId !== undefined) clearInterval(intervalId);
    };
  }, [prefersReducedMotion]);

  const handleGetStarted = () => {
    if (loading || isLoggingOut) return;
    window.history.pushState({}, '', '/');
    router.push('/login?redirect=/interview');
  };

  if (loading || isLoggingOut || isRedirectingToInterview) {
    return <div className="min-h-screen bg-white" />;
  }

  return (
    <div className="font-['Space_Grotesk'] text-center">
      {/* ── Hero ── */}
      <section className="bg-white px-5 pt-24">
        <div className="mx-auto max-w-6xl">
          <h1
            aria-label={heroHeadline.replace('\n', ' ')}
            className="relative my-30 mb-10 text-6xl font-regular leading-tight text-black md:text-7xl"
          >
            <span aria-hidden="true" className="invisible whitespace-pre-line">
              {heroHeadline}
            </span>
            <span aria-hidden="true" className="absolute inset-0 whitespace-pre-line">
              {typedHeroHeadline}
              {!prefersReducedMotion && typedHeroHeadline.length < heroHeadline.length ? (
                <span className="ml-1 inline-block h-[0.85em] w-[2px] translate-y-1 animate-pulse bg-current align-middle" />
              ) : null}
            </span>
          </h1>
          <div className="mt-10">
            <button
              onClick={handleGetStarted}
              className="button-gradient rounded-xl px-8 py-3 text-lg font-medium outline outline-green-500 outline-offset-2"
            >
              Start Practicing
            </button>
          </div>
        </div>
      </section>

      {/* ── Demo video + universities ── */}
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

          <div className="mb-10">
            <p className="mb-4 text-center text-sm font-medium uppercase tracking-[0.24em] text-gray-500">
              Trusted by students at
            </p>
            <div className="university-carousel-mask mx-auto w-full max-w-[42rem] py-2">
              <div className="university-carousel-track flex w-max">
                {[0, 1].map((copyIndex) => (
                  <div
                    key={copyIndex}
                    className="flex shrink-0 items-center gap-5 pr-5 md:gap-6 md:pr-6"
                    aria-hidden={copyIndex === 1}
                  >
                    {universityLogos.map((university) => (
                      <div
                        key={`${copyIndex}-${university.name}`}
                        className="flex h-16 min-w-[7.5rem] items-center justify-center px-2 opacity-80 transition-opacity duration-200 hover:opacity-100 md:h-20 md:min-w-[9rem]"
                        title={university.name}
                      >
                        <Image
                          src={university.logoSrc}
                          alt={`${university.name} logo`}
                          width={university.width}
                          height={university.height}
                          unoptimized
                          className="h-auto max-h-10 w-auto max-w-[6.5rem] object-contain md:max-h-14 md:max-w-[8rem]"
                        />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Sticky scroll features ── */}
      <StickyFeaturesSection prefersReducedMotion={prefersReducedMotion} />

      {/* ── Founders showcase ── */}
      <FoundersShowcaseSection prefersReducedMotion={prefersReducedMotion} />

      {/* ── Habit / plan cards ── */}
      <HabitDepthSection prefersReducedMotion={prefersReducedMotion} />

      {/* ── CTA ── */}
      <section className="bg-[linear-gradient(to_bottom,_#ffffff_0%,_#e6faef_20%,_#c3f3d8_60%,_#b0efcb_100%)] px-5 py-40 text-center md:py-48">
        <div className="mx-auto flex w-full max-w-xl flex-col items-center">
          <h3 className="mb-6 text-[4.5rem] font-normal leading-none text-black md:text-[5.625rem]">
            Try Naild Now.
          </h3>
          <button
            onClick={handleGetStarted}
            className="rounded-full bg-white px-8 py-3 font-medium text-green-700 shadow-[0_20px_45px_-28px_rgba(21,128,61,0.55)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/92"
          >
            Start Practicing
          </button>
        </div>
      </section>

      {/* ── Footer ── */}
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

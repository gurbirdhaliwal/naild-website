"use client";

import React, { useState, useRef, useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { FaLinkedinIn } from 'react-icons/fa6';
import { useAuth } from './context/AuthContext';
import {
  clearOAuthHandoffRedirect,
  getOAuthHandoffRedirect,
} from './services/authSession';

const heroHeadline = 'Tech talk, made clear.';
const mediaBlurDataUrl =
  'data:image/webp;base64,UklGRlIAAABXRUJQVlA4IEYAAABwAgCdASoQABAABUB8JbACdLoB+AADsAD+8r0M3L7JZV0z8x8Dz6nK8ptq6g4VtAAAAA==';
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
  {
    name: 'Starter',
    price: '$0/mo',
    ctaLabel: null,
    imageSrc: '/media-optimized/knappi_starter.webp',
    imageAlt: 'Starter tier illustration',
    imageWidth: 343,
    imageHeight: 350,
    imageClassName: 'w-[11rem] md:w-[12.5rem]',
  },
  {
    name: 'Growth',
    price: '$15/mo',
    ctaLabel: 'Coming Soon',
    imageSrc: '/media-optimized/knappi_growth.webp',
    imageAlt: 'Growth tier illustration',
    imageWidth: 387,
    imageHeight: 384,
    imageClassName: 'w-[13.5rem] md:w-[15.25rem]',
  },
  {
    name: 'Teams',
    price: '$25/mo',
    ctaLabel: 'Coming Soon',
    imageSrc: '/media-optimized/knappi_teams.webp',
    imageAlt: 'Teams tier illustration',
    imageWidth: 375,
    imageHeight: 384,
    imageClassName: 'w-[16.5rem] md:w-[19rem]',
  },
] as const;
const planCardOffsets = [
  { x: -20, y: 0 },
  { x: 0, y: 20 },
  { x: 20, y: 0 },
] as const;
const founderProfiles = [
  {
    id: 'cofounder-01',
    name: 'Gurbir Dhaliwal',
    imageSrc: '/media-optimized/GurbirDhaliwal.webp',
    imageAlt: 'Portrait of Gurbir Dhaliwal',
    imagePosition: 'center 18%',
    linkedinUrl: 'https://www.linkedin.com/in/gurbir-dhaliwal-575995275/',
  },
  {
    id: 'cofounder-02',
    name: 'Asvin Eswarathas',
    imageSrc: '/media-optimized/AssvinEswarathas.webp',
    imageAlt: 'Portrait of Asvin Eswarathas',
    imagePosition: 'center 12%',
    linkedinUrl: 'https://www.linkedin.com/in/asvin-eswarathas-739b6a238/',
  },
] as const;

const companyFooterLinks = [
  {
    label: 'Contact Us',
    href: 'mailto:support@knappi.ca',
  },
  {
    label: 'Careers',
    href: '#',
  },
  {
    label: 'Ethos',
    href: '#',
  },
  {
    label: 'Help',
    href: '#',
  },
] as const;
const legalFooterLinks = [
  {
    label: 'Terms of Service',
    href: '/terms',
  },
  {
    label: 'Privacy Policy',
    href: '/privacy',
  },
  {
    label: 'Cookie Notice',
    href: '/cookies',
  },
  {
    label: 'AI Disclaimer',
    href: '/ai-disclaimer',
  },
] as const;

const howItWorksSteps = [
  {
    id: 'scenario',
    label: 'Scenario',
    title: 'Pick your Scenario.',
    description:
      'Choose the right session for you, ranging from different types of technical communication scenarios.',
    videoSrc: '/scenario.mp4',
    videoLabel: 'Scenario preview',
  },
  {
    id: 'customize',
    label: 'Customize',
    title: 'Shape your session.',
    description:
      'Set the role, audience, topic, and goal so the session matches the pressure you actually face.',
    videoLabel: 'Customization preview',
  },
  {
    id: 'practice',
    label: 'Practice',
    title: 'Explain it out loud.',
    description:
      'Speak through your answer naturally while Knappi tracks clarity, structure, precision, and audience fit.',
    videoLabel: 'Practice preview',
  },
  {
    id: 'grading',
    label: 'Grading',
    title: 'Get feedback you can act on.',
    description:
      'Review what landed, what was missing, and how to tighten the explanation before the next attempt.',
    videoLabel: 'Grading preview',
  },
] as const;

const whyKnappiReasons = [
  {
    phase: '01',
    title: 'Deliberate practice in a safe environment.',
    description:
      'Rehearse high-stakes communication scenarios like interviews, stakeholder meetings, and design discussions without real consequences. Experiment, fumble, and improve before explaining to an actual hiring manager or VP.',
  },
  {
    phase: '02',
    title: 'Adaptive simulation.',
    description:
      'Knappi role-plays a specific audience, which is the hard part of real technical communication. Explaining a database index to a recruiter is different from explaining it to a senior engineer, so users learn to adapt instead of recite.',
  },
  {
    phase: '03',
    title: 'Structured feedback and skill measurement.',
    description:
      'Post-session grading closes the loop. By scoring each session, Knappi turns vague practice time into measurable skill progression, helping users track whether they are actually getting better.',
  },
] as const;

type WhyKnappiVideoKey =
  | 'phase1'
  | 'phase1-2transition'
  | 'phase2'
  | 'phase2-3transition'
  | 'phase3';

type WhyKnappiPhaseIndex = 0 | 1 | 2;

const whyKnappiVideos: Record<
  WhyKnappiVideoKey,
  { mp4Src: string; webmSrc: string; posterSrc: string; isTransition: boolean }
> = {
  phase1: {
    mp4Src: '/media-optimized/landing_page_scroll_animation/phase1.mp4',
    webmSrc: '/media-optimized/landing_page_scroll_animation/phase1.webm',
    posterSrc: '/media-optimized/landing_page_scroll_animation/phase1-poster.webp',
    isTransition: false,
  },
  'phase1-2transition': {
    mp4Src: '/media-optimized/landing_page_scroll_animation/phase1-2transition.mp4',
    webmSrc: '/media-optimized/landing_page_scroll_animation/phase1-2transition.webm',
    posterSrc: '/media-optimized/landing_page_scroll_animation/phase1-2transition-poster.webp',
    isTransition: true,
  },
  phase2: {
    mp4Src: '/media-optimized/landing_page_scroll_animation/phase2.mp4',
    webmSrc: '/media-optimized/landing_page_scroll_animation/phase2.webm',
    posterSrc: '/media-optimized/landing_page_scroll_animation/phase2-poster.webp',
    isTransition: false,
  },
  'phase2-3transition': {
    mp4Src: '/media-optimized/landing_page_scroll_animation/phase2-3transition.mp4',
    webmSrc: '/media-optimized/landing_page_scroll_animation/phase2-3transition.webm',
    posterSrc: '/media-optimized/landing_page_scroll_animation/phase2-3transition-poster.webp',
    isTransition: true,
  },
  phase3: {
    mp4Src: '/media-optimized/landing_page_scroll_animation/phase3.mp4',
    webmSrc: '/media-optimized/landing_page_scroll_animation/phase3.webm',
    posterSrc: '/media-optimized/landing_page_scroll_animation/phase3-poster.webp',
    isTransition: false,
  },
};

const whyKnappiPhaseVideos: Record<WhyKnappiPhaseIndex, WhyKnappiVideoKey> = {
  0: 'phase1',
  1: 'phase2',
  2: 'phase3',
};

function getWhyKnappiPhaseIndex(progress: number): WhyKnappiPhaseIndex {
  if (progress < 0.34) {
    return 0;
  }

  if (progress < 0.67) {
    return 1;
  }

  return 2;
}

function getWhyKnappiTransitionVideo(
  fromPhase: WhyKnappiPhaseIndex,
  toPhase: WhyKnappiPhaseIndex
): WhyKnappiVideoKey {
  return Math.min(fromPhase, toPhase) === 0
    ? 'phase1-2transition'
    : 'phase2-3transition';
}

function HabitDepthSection({ prefersReducedMotion }: { prefersReducedMotion: boolean | null }) {
  const [transitionState, setTransitionState] = useState({
    surfaceProgress: 0,
  });
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const surfaceScale = prefersReducedMotion
    ? 1
    : 0.9 + transitionState.surfaceProgress * 0.1;
  const surfaceY = prefersReducedMotion
    ? 0
    : (1 - transitionState.surfaceProgress) * 112;
  const surfaceRadius = prefersReducedMotion
    ? 0
    : (1 - transitionState.surfaceProgress) * 56;
  const cardsVisible = prefersReducedMotion || transitionState.surfaceProgress >= 0.18;

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
        : Math.min(1, Math.max(0, (sectionProgress - 0.05) / 0.36));

      setTransitionState((currentState) => {
        const surfaceChanged =
          Math.abs(currentState.surfaceProgress - surfaceProgress) >= 0.01;

        if (!surfaceChanged) {
          return currentState;
        }

        return {
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
      className="relative z-20 bg-white"
      style={{ height: '145vh' }}
    >
      <div className="sticky top-0 h-screen overflow-hidden bg-white px-5 py-4 md:py-6">
        <div
          className="relative h-[calc(100vh-2rem)] overflow-hidden will-change-transform md:h-[calc(100vh-3rem)]"
          style={{
            transform: `translate3d(0, ${surfaceY}px, 0) scale(${surfaceScale})`,
            transformOrigin: 'center top',
            borderRadius: `${surfaceRadius}px`,
          }}
        >
          <div className="mx-auto flex h-full max-w-6xl flex-col justify-center py-24">
            <motion.div
              initial={prefersReducedMotion ? false : { opacity: 0, y: 18 }}
              animate={
                prefersReducedMotion
                  ? { opacity: 1, y: 0 }
                  : cardsVisible
                  ? { opacity: 1, y: 0 }
                  : { opacity: 0, y: 18 }
              }
              transition={{
                duration: prefersReducedMotion ? 0 : 0.45,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              <h2 className="mb-4 text-5xl font-normal text-black">
                Build the habit before the high-stakes conversation.
              </h2>
              <p className="mb-10 text-xl font-normal text-gray-500">
                Whether you are preparing for interviews, design reviews, or stakeholder updates,
                <br />
                Knappi gives you a repeatable way to practice out loud.
              </p>
            </motion.div>

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
                    className="flex flex-col items-center"
                  >
                    <div className="flex min-h-[15rem] items-end justify-center md:min-h-[18rem]">
                      <Image
                        src={plan.imageSrc}
                        alt={plan.imageAlt}
                        width={plan.imageWidth}
                        height={plan.imageHeight}
                        sizes="(min-width: 768px) 19rem, 70vw"
                        placeholder="blur"
                        blurDataURL={mediaBlurDataUrl}
                        className={`h-auto object-contain ${plan.imageClassName}`}
                      />
                    </div>
                    <div className="px-3 pt-5 text-center text-gray-700">
                      <div className="text-xl font-medium">{plan.name}</div>
                      <div className="mt-2 text-lg font-medium text-gray-900">{plan.price}</div>
                      {plan.ctaLabel ? (
                        <button
                          type="button"
                          className="mt-4 rounded-full border border-black/10 bg-black px-5 py-2 text-sm font-medium text-white"
                        >
                          {plan.ctaLabel}
                        </button>
                      ) : null}
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

function WhyKnappiSection({ prefersReducedMotion }: { prefersReducedMotion: boolean | null }) {
  const [shouldLoadVideos, setShouldLoadVideos] = useState(Boolean(prefersReducedMotion));
  const [targetPhaseIndex, setTargetPhaseIndex] = useState<WhyKnappiPhaseIndex>(0);
  const [visiblePhaseIndex, setVisiblePhaseIndex] = useState<WhyKnappiPhaseIndex>(0);
  const [visibleVideoKey, setVisibleVideoKey] = useState<WhyKnappiVideoKey>('phase1');
  const [transitionStep, setTransitionStep] = useState(0);
  const [sectionProgress, setSectionProgress] = useState(0);
  const [typedReason, setTypedReason] = useState<{ title: string; description: string }>({
    title: whyKnappiReasons[0].title,
    description: whyKnappiReasons[0].description,
  });
  const [isTypingReason, setIsTypingReason] = useState(false);
  const sectionRef = useRef<HTMLElement | null>(null);
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const currentPhaseRef = useRef<WhyKnappiPhaseIndex>(0);
  const targetPhaseRef = useRef<WhyKnappiPhaseIndex>(0);
  const reverseFrameRef = useRef<number | null>(null);
  const activeReason = whyKnappiReasons[visiblePhaseIndex];
  const activePhaseScale = [0.738, 0.864, 0.972][visiblePhaseIndex];

  useEffect(() => {
    if (prefersReducedMotion) {
      setShouldLoadVideos(true);
      return;
    }

    const section = sectionRef.current;

    if (!section || shouldLoadVideos) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShouldLoadVideos(true);
          observer.disconnect();
        }
      },
      { rootMargin: '600px 0px', threshold: 0.01 }
    );

    observer.observe(section);

    return () => observer.disconnect();
  }, [prefersReducedMotion, shouldLoadVideos]);

  useEffect(() => {
    if (prefersReducedMotion) {
      setTypedReason({
        title: activeReason.title,
        description: activeReason.description,
      });
      setIsTypingReason(false);
      return;
    }

    setTypedReason({ title: '', description: '' });
    setIsTypingReason(true);

    let titleIndex = 0;
    let descriptionIndex = 0;
    let descriptionIntervalId: ReturnType<typeof setInterval> | undefined;

    const titleIntervalId = setInterval(() => {
      titleIndex += 1;
      setTypedReason((currentReason) => ({
        ...currentReason,
        title: activeReason.title.slice(0, titleIndex),
      }));

      if (titleIndex >= activeReason.title.length) {
        clearInterval(titleIntervalId);

        descriptionIntervalId = setInterval(() => {
          descriptionIndex += 1;
          setTypedReason((currentReason) => ({
            ...currentReason,
            description: activeReason.description.slice(0, descriptionIndex),
          }));

          if (descriptionIndex >= activeReason.description.length) {
            if (descriptionIntervalId !== undefined) {
              clearInterval(descriptionIntervalId);
            }
            setIsTypingReason(false);
          }
        }, 9);
      }
    }, 22);

    return () => {
      clearInterval(titleIntervalId);
      if (descriptionIntervalId !== undefined) {
        clearInterval(descriptionIntervalId);
      }
    };
  }, [activeReason.description, activeReason.title, prefersReducedMotion]);

  useEffect(() => {
    let frameId: number | null = null;

    const updateScrollState = () => {
      const section = sectionRef.current;

      if (!section) {
        return;
      }

      const sectionRect = section.getBoundingClientRect();
      const viewportHeight = Math.max(window.innerHeight, 1);
      const totalScrollable = Math.max(sectionRect.height - viewportHeight, 1);
      const progress = prefersReducedMotion
        ? 1
        : Math.min(1, Math.max(0, -sectionRect.top / totalScrollable));

      setSectionProgress(progress);
      setTargetPhaseIndex(getWhyKnappiPhaseIndex(progress));
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

  useEffect(() => {
    targetPhaseRef.current = targetPhaseIndex;

    if (!shouldLoadVideos) {
      return;
    }

    if (reverseFrameRef.current !== null) {
      window.cancelAnimationFrame(reverseFrameRef.current);
      reverseFrameRef.current = null;
    }

    const completePhase = (phaseIndex: WhyKnappiPhaseIndex) => {
      currentPhaseRef.current = phaseIndex;
      setVisiblePhaseIndex(phaseIndex);
      setVisibleVideoKey(whyKnappiPhaseVideos[phaseIndex]);
    };

    if (prefersReducedMotion) {
      completePhase(targetPhaseIndex);
      return;
    }

    const fromPhase = currentPhaseRef.current;

    if (fromPhase === targetPhaseIndex) {
      completePhase(targetPhaseIndex);
      return;
    }

    const toPhase = (fromPhase + (targetPhaseIndex > fromPhase ? 1 : -1)) as WhyKnappiPhaseIndex;
    const transitionVideoKey = getWhyKnappiTransitionVideo(fromPhase, toPhase);
    const transitionVideo = videoRefs.current[transitionVideoKey];

    setVisiblePhaseIndex(toPhase);
    setVisibleVideoKey(transitionVideoKey);

    if (!transitionVideo) {
      completePhase(toPhase);
      return;
    }

    const continueTowardTarget = () => {
      completePhase(toPhase);

      if (targetPhaseRef.current !== toPhase) {
        setTransitionStep((currentStep) => currentStep + 1);
      }
    };

    const playForward = () => {
      transitionVideo.pause();
      transitionVideo.currentTime = 0;
      transitionVideo.playbackRate = 1;
      transitionVideo.play().catch(() => undefined);
    };

    const playReverse = () => {
      const duration = Number.isFinite(transitionVideo.duration)
        ? transitionVideo.duration
        : 0;

      if (duration <= 0) {
        return;
      }

      const animationDurationMs = Math.max(duration * 1000, 450);
      const startTime = performance.now();
      transitionVideo.pause();
      transitionVideo.currentTime = Math.max(duration - 0.05, 0);

      const step = (timestamp: number) => {
        const progress = Math.min(1, (timestamp - startTime) / animationDurationMs);
        transitionVideo.currentTime = Math.max((1 - progress) * duration, 0);

        if (progress < 1) {
          reverseFrameRef.current = window.requestAnimationFrame(step);
          return;
        }

        reverseFrameRef.current = null;
        continueTowardTarget();
      };

      reverseFrameRef.current = window.requestAnimationFrame(step);
    };

    const handleMetadataReady = () => {
      if (toPhase > fromPhase) {
        playForward();
      } else {
        playReverse();
      }
    };

    if (toPhase > fromPhase) {
      transitionVideo.addEventListener('ended', continueTowardTarget, { once: true });
    }

    if (Number.isFinite(transitionVideo.duration) && transitionVideo.duration > 0) {
      handleMetadataReady();
    } else {
      transitionVideo.addEventListener('loadedmetadata', handleMetadataReady, { once: true });
    }

    return () => {
      transitionVideo.pause();
      transitionVideo.removeEventListener('ended', continueTowardTarget);
      transitionVideo.removeEventListener('loadedmetadata', handleMetadataReady);

      if (reverseFrameRef.current !== null) {
        window.cancelAnimationFrame(reverseFrameRef.current);
        reverseFrameRef.current = null;
      }
    };
  }, [prefersReducedMotion, shouldLoadVideos, targetPhaseIndex, transitionStep]);

  useEffect(() => {
    if (!shouldLoadVideos) {
      return;
    }

    const visibleVideo = videoRefs.current[visibleVideoKey];

    Object.entries(videoRefs.current).forEach(([key, video]) => {
      if (video && key !== visibleVideoKey && !whyKnappiVideos[key as WhyKnappiVideoKey].isTransition) {
        video.pause();
      }
    });

    if (visibleVideo && !whyKnappiVideos[visibleVideoKey].isTransition) {
      visibleVideo.play().catch(() => undefined);
    }
  }, [shouldLoadVideos, visibleVideoKey]);

  return (
    <section
      ref={sectionRef}
      className="relative z-20 bg-white"
      style={{ height: prefersReducedMotion ? 'auto' : '380vh' }}
    >
      <div className="sticky top-0 h-screen overflow-hidden bg-white px-5 py-6 text-left md:py-8">
        <div className="mx-auto grid h-full max-w-7xl items-center gap-6 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)] lg:gap-10">
          <div>
            <div className="mb-3 text-xs font-medium uppercase tracking-[0.22em] text-emerald-700 md:text-sm">
              Why Knappi?
            </div>
            <h2 className="max-w-xl text-4xl font-normal leading-tight text-black md:text-[3.5rem]">
              Turn knowing into saying.
            </h2>

            <div className="mt-8 flex gap-5 py-7 md:mt-10 md:gap-6 md:py-8">
              <div
                className="relative mt-1 h-36 w-px shrink-0 overflow-hidden rounded-full bg-black/10 md:h-44"
                aria-hidden="true"
              >
                <div
                  className="absolute left-0 top-0 w-full rounded-full bg-emerald-500"
                  style={{ height: `${sectionProgress * 100}%` }}
                />
              </div>

              <div>
                <div className="flex items-start gap-3 text-black">
                  <span className="pt-1 text-xs font-medium text-emerald-700 md:text-sm">
                    {activeReason.phase}
                  </span>
                  <h3
                    aria-label={activeReason.title}
                    className="min-h-[4rem] text-2xl font-normal leading-tight md:min-h-[4.5rem] md:text-3xl"
                  >
                    <span aria-hidden="true">
                      {typedReason.title}
                      {isTypingReason && typedReason.description.length === 0 ? (
                        <span className="ml-1 inline-block h-[0.85em] w-px translate-y-1 animate-pulse bg-black align-middle" />
                      ) : null}
                    </span>
                  </h3>
                </div>
                <p
                  aria-label={activeReason.description}
                  className="mt-4 min-h-[10.5rem] max-w-xl pl-8 text-base leading-7 text-gray-600 md:min-h-[11rem] md:text-lg"
                >
                  <span aria-hidden="true">
                    {typedReason.description}
                    {isTypingReason && typedReason.description.length > 0 ? (
                      <span className="ml-1 inline-block h-[0.85em] w-px translate-y-1 animate-pulse bg-gray-600 align-middle" />
                    ) : null}
                  </span>
                </p>
              </div>
            </div>
          </div>

          <div className="relative h-[38vh] min-h-[16rem] overflow-hidden bg-white md:h-auto md:max-h-[72vh] md:aspect-[16/10]">
            {(Object.entries(whyKnappiVideos) as [WhyKnappiVideoKey, (typeof whyKnappiVideos)[WhyKnappiVideoKey]][]).map(
              ([key, video]) => (
                <video
                  key={key}
                  ref={(element) => {
                    videoRefs.current[key] = element;
                  }}
                  className={`absolute inset-0 h-full w-full object-cover ${
                    key === visibleVideoKey ? 'opacity-100' : 'opacity-0'
                  }`}
                  style={{ transform: `scale(${activePhaseScale})` }}
                  poster={video.posterSrc}
                  muted
                  playsInline
                  preload={shouldLoadVideos && key === visibleVideoKey ? 'metadata' : 'none'}
                  autoPlay={shouldLoadVideos && key === visibleVideoKey && !video.isTransition}
                  loop={!video.isTransition}
                  aria-hidden={key !== visibleVideoKey}
                >
                  {shouldLoadVideos ? (
                    <>
                      <source src={video.webmSrc} type="video/webm" />
                      <source src={video.mp4Src} type="video/mp4" />
                    </>
                  ) : null}
                </video>
              )
            )}
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
      className="relative z-20 bg-white pb-8 pt-20 md:pb-10 md:pt-24"
    >
      <div className="relative z-10 mx-auto w-full rounded-[6rem] bg-emerald-50 px-5 py-20 md:px-10 md:py-24">
        <div className="mb-14 text-center">
          <div className="mb-4 text-sm font-medium uppercase tracking-[0.24em] text-emerald-700">
            The Team Behind Knappi
          </div>
          <h2
            aria-label={foundersHeading}
            className="min-h-[3.5rem] text-5xl font-normal text-black md:min-h-[4.5rem] md:text-6xl"
          >
            <span aria-hidden="true">
              {typedHeading}
              {!prefersReducedMotion && hasEnteredView && typedHeading.length < foundersHeading.length ? (
                <span className="ml-1 inline-block h-[0.85em] w-[2px] translate-y-1 animate-pulse bg-black align-middle" />
              ) : null}
            </span>
          </h2>
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
              <div className="relative aspect-[4/4.8] overflow-hidden rounded-[2.5rem] border border-emerald-100 bg-emerald-100">
                <Image
                  src={founder.imageSrc}
                  alt={founder.imageAlt}
                  fill
                  sizes="(min-width: 768px) 25.5rem, 100vw"
                  placeholder="blur"
                  blurDataURL={mediaBlurDataUrl}
                  className="object-cover"
                  style={{ objectPosition: founder.imagePosition }}
                />
                <div className="absolute inset-0 bg-emerald-950/5" />
                <div className="absolute bottom-4 left-4 rounded-full border border-emerald-200 bg-emerald-50/85 px-4 py-2 text-xs font-medium uppercase tracking-[0.2em] text-emerald-950 backdrop-blur-sm">
                  {founder.name}
                </div>
                <a
                  href={founder.linkedinUrl}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`${founder.name} LinkedIn profile`}
                  className="absolute bottom-4 right-4 flex h-11 w-11 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50/85 text-emerald-800 backdrop-blur-sm transition-colors duration-200 hover:bg-emerald-600 hover:text-white"
                >
                  <FaLinkedinIn className="h-4 w-4" />
                </a>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Main Landing Page ─────────────────────────────────────────────────────────

const KnappiLanding = () => {
  const [isRedirectingToInterview, setIsRedirectingToInterview] = useState(false);
  const [typedHeroHeadline, setTypedHeroHeadline] = useState('');
  const [activeHowItWorksStepId, setActiveHowItWorksStepId] =
    useState<(typeof howItWorksSteps)[number]['id']>('scenario');

  const prefersReducedMotion = useReducedMotion();
  const router = useRouter();
  const { user, loading } = useAuth();
  const activeHowItWorksStep =
    howItWorksSteps.find((step) => step.id === activeHowItWorksStepId) ??
    howItWorksSteps[0];

  React.useEffect(() => {
    if (loading || !user) return;

    const oauthTarget = getOAuthHandoffRedirect();
    if (!oauthTarget) return;

    setIsRedirectingToInterview(true);
    router.replace(oauthTarget);
  }, [loading, router, user]);

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
    window.history.pushState({}, '', '/');
    router.push('/login?redirect=/interview');
  };

  if (isRedirectingToInterview) {
    return <div className="min-h-screen bg-white" />;
  }

  return (
    <div className="font-['Space_Grotesk'] text-center">
      {/* ── Hero ── */}
      <section className="bg-white pt-16">
        <div className="mx-auto max-w-6xl px-5">
          <h1
            aria-label={heroHeadline.replace('\n', ' ')}
            className="relative mb-5 mt-20 text-7xl font-regular leading-none text-black sm:text-8xl md:text-[6rem]"
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
          <p className="mx-auto max-w-3xl text-xl font-regular leading-relaxed md:text-xl">
            Practice technical communication with
          </p>
          <p className="mx-auto max-w-3xl text-xl font-regular leading-relaxed md:text-xl">
            an AI that actually pushes back
          </p>
          <div className="mt-5">
            <button
              onClick={handleGetStarted}
              className="button-gradient rounded-xl px-8 py-3 text-lg font-medium outline outline-green-500 outline-offset-2"
            >
              Start Practicing
            </button>
          </div>
        </div>
        <div className="relative aspect-[1881/560] w-full overflow-hidden">
          <Image
            src="/media-optimized/knappiherosectionpicture.webp"
            alt="Knappi technical communication practice interface"
            width={1881}
            height={836}
            priority
            sizes="100vw"
            placeholder="blur"
            blurDataURL={mediaBlurDataUrl}
            className="absolute left-1/2 top-1/2 h-auto w-full -translate-x-1/2 -translate-y-1/2 object-contain"
          />
        </div>
      </section>

      {/* ── Demo video + universities ── */}
      <section className="bg-white pb-24 pt-8">
        <div className="mx-auto w-full rounded-[6rem] bg-emerald-50 px-5 py-10 md:px-10 md:py-12 md:mt-20">
          <h2 className="mx-auto mb-8 mt-2 text-4xl font-normal leading-tight text-black md:mt-4 md:text-5xl">
            Better communication starts with speaking more.
          </h2>
          <div className="relative mx-auto mb-16 flex aspect-video max-w-4xl items-center justify-center overflow-hidden rounded-[2.5rem] border border-emerald-100 bg-gray-300">
            <div className="flex h-full w-full items-center justify-center bg-slate-300 text-lg text-slate-600">
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

      {/* ── How it works ── */}
      <section className="bg-white px-5 pb-12 pt-4 md:pb-16 md:pt-6">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-14 text-5xl font-normal leading-tight text-black md:mb-16 md:text-[5.5rem]">
            Practice until it <span className="text-emerald-600">clicks</span>
          </h2>

          <div className="grid gap-8 text-left lg:grid-cols-[12rem_1fr] lg:gap-10">
            <div className="self-start border-y border-black/10">
              {howItWorksSteps.map((step) => {
                const isActive = step.id === activeHowItWorksStep.id;

                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => setActiveHowItWorksStepId(step.id)}
                    className={`group flex w-full items-center justify-between border-b border-black/10 py-3 text-left text-lg font-normal transition-colors last:border-b-0 ${
                      isActive ? 'text-black' : 'text-gray-500 hover:text-black'
                    }`}
                    aria-pressed={isActive}
                  >
                    <span className="relative inline-block pb-1">
                      {step.label}
                      <span
                        aria-hidden="true"
                        className={`absolute inset-x-0 bottom-0 h-px origin-left bg-current transition-transform duration-300 ease-out ${
                          isActive ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
                        }`}
                      />
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="grid gap-8 lg:grid-cols-[minmax(0,0.75fr)_1px_minmax(0,1.45fr)] lg:items-center">
              <div className="flex h-full flex-col">
                <div>
                  <h3 className="max-w-2xl text-3xl font-normal leading-tight text-black md:text-4xl">
                    {activeHowItWorksStep.title}
                  </h3>
                  <p className="mt-4 max-w-2xl text-base leading-7 text-gray-600 md:text-lg">
                    {activeHowItWorksStep.description}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleGetStarted}
                  className="mt-8 inline-flex w-fit items-center rounded-lg border border-emerald-200 bg-emerald-50 px-5 py-2.5 text-sm font-medium text-emerald-800 transition-colors duration-200 hover:border-emerald-300 hover:bg-emerald-100 lg:mt-auto"
                >
                  Try Knappi for Free
                </button>
              </div>

              <div className="hidden h-full min-h-64 w-px bg-black/10 lg:block" />

              <div className="relative flex aspect-[16/10] w-full items-center justify-center overflow-hidden rounded-[2.5rem] border border-emerald-100 bg-emerald-50 text-base font-medium text-emerald-900/70">
                {'videoSrc' in activeHowItWorksStep ? (
                  <video
                    key={activeHowItWorksStep.videoSrc}
                    className="h-full w-full object-cover"
                    style={{ objectPosition: '65% center' }}
                    muted
                    playsInline
                    autoPlay={!prefersReducedMotion}
                    loop={!prefersReducedMotion}
                    preload="metadata"
                    controls={Boolean(prefersReducedMotion)}
                    aria-label={activeHowItWorksStep.videoLabel}
                  >
                    <source src={activeHowItWorksStep.videoSrc} type="video/mp4" />
                  </video>
                ) : (
                  activeHowItWorksStep.videoLabel
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Why Knappi scroll animation ── */}
      <WhyKnappiSection prefersReducedMotion={prefersReducedMotion} />

      {/* ── Founders showcase ── */}
      <FoundersShowcaseSection prefersReducedMotion={prefersReducedMotion} />

      {/* ── Habit / plan cards ── */}
      <HabitDepthSection prefersReducedMotion={prefersReducedMotion} />

      {/* ── CTA ── */}
      <section className="bg-[linear-gradient(to_bottom,_#ffffff_0%,_#e6faef_20%,_#c3f3d8_60%,_#b0efcb_100%)] px-5 py-40 text-center md:py-48">
        <div className="mx-auto flex w-full max-w-xl flex-col items-center">
          <h3 className="mb-6 text-[4.5rem] font-normal leading-none text-black md:text-[5.625rem]">
            Try Knappi Now.
          </h3>
          <button
            onClick={handleGetStarted}
            className="rounded-full bg-white px-8 py-3 font-medium text-green-700 transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/90"
          >
            Start Practicing
          </button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-[#b0efcb] px-5 pb-8 pt-12">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 grid grid-cols-1 gap-16 text-left md:grid-cols-3">
            <div>
              <h4 className="mb-2 text-lg font-medium text-black">Knappi</h4>
              <p className="mb-4 text-sm text-gray-500">© 2026 Knappi. Toronto, ON</p>
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
              {companyFooterLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="mb-3 block text-sm text-gray-500 transition-colors duration-200 hover:text-black"
                >
                  {link.label}
                </a>
              ))}
            </div>
            <div>
              <h4 className="mb-4 font-medium text-black">Legal</h4>
              {legalFooterLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="mb-3 block text-sm text-gray-500 transition-colors duration-200 hover:text-black"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default KnappiLanding;

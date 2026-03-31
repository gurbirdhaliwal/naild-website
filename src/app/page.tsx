"use client";

import React, { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { AlertCircle, Check, CheckCircle2, Sparkles } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { FaLinkedinIn } from 'react-icons/fa6';
import { useAuth } from './context/AuthContext';
import {
  AUDIENCE_OPTIONS,
  COMMUNICATION_FIELDS,
  COMMUNICATION_PRACTICE_MODES,
} from './lib/practiceConfig';
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
  },
  {
    id: 'scores',
    label: 'Scores',
    title: 'Track communication as a skill, not just a one-off practice session.',
    description:
      'Watch your strongest and weakest communication instincts over time instead of treating each drill like an isolated exercise.',
  },
  {
    id: 'personas',
    label: 'Audience',
    title: 'Practice the same idea for different listeners.',
    description:
      'A product manager, recruiter, and senior engineer should not hear the same explanation. Naild changes the drill and grading based on audience.',
  },
  {
    id: 'replay',
    label: 'Replay',
    title: 'Retry the same drill until the explanation actually lands.',
    description:
      'Use the transcript, missing points, and improved outline to tighten the answer instead of guessing what to change.',
  },
] as const;
type FeatureId = (typeof tabs)[number]['id'];

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
  {
    name: 'Starter',
    price: '$0/mo',
    ctaLabel: null,
    imageSrc: '/naild_starter.png',
    imageAlt: 'Starter tier illustration',
    imageWidth: 343,
    imageHeight: 350,
    imageClassName: 'w-[11rem] md:w-[12.5rem]',
  },
  {
    name: 'Growth',
    price: '$15/mo',
    ctaLabel: 'Coming Soon',
    imageSrc: '/naild_growth.png',
    imageAlt: 'Growth tier illustration',
    imageWidth: 387,
    imageHeight: 384,
    imageClassName: 'w-[13.5rem] md:w-[15.25rem]',
  },
  {
    name: 'Teams',
    price: '$25/mo',
    ctaLabel: 'Coming Soon',
    imageSrc: '/naild_teams.png',
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
    imageSrc: '/GurbirDhaliwal.png',
    imageAlt: 'Portrait of Gurbir Dhaliwal',
    imagePosition: 'center 18%',
    linkedinUrl: 'https://www.linkedin.com/in/gurbir-dhaliwal-575995275/',
  },
  {
    id: 'cofounder-02',
    name: 'Assvin Eswarathas',
    imageSrc: '/AssvinEswarathas.png',
    imageAlt: 'Portrait of Assvin Eswarathas',
    imagePosition: 'center 12%',
    linkedinUrl: 'https://www.linkedin.com/in/assvin-eswarathas-739b6a238/',
  },
] as const;

const featureSetupSteps = ['Field', 'Mode', 'Audience', 'Context', 'Confirm'] as const;
const featureFeedbackCategories = [
  {
    label: 'Clarity',
    score: 82,
    feedback: 'Lead with the tradeoff before you name the implementation choice.',
  },
  {
    label: 'Correctness',
    score: 79,
    feedback: 'Your explanation of retrieval scope was accurate but buried too late.',
  },
  {
    label: 'Depth',
    score: 74,
    feedback: 'Bring in latency and update cadence when you justify the approach.',
  },
  {
    label: 'Audience fit',
    score: 88,
    feedback: 'You translated model limits into business risk without overexplaining.',
  },
] as const;
const featureScoreHistory = [
  {
    title: 'Rate limiting for a high-traffic API',
    audience: 'Product manager',
    mode: 'Explain a tradeoff',
    score: 84,
  },
  {
    title: 'Redis vs database caching',
    audience: 'Peer engineer',
    mode: 'Explain a decision',
    score: 78,
  },
  {
    title: 'Precision vs recall in search',
    audience: 'Recruiter',
    mode: 'Explain a concept',
    score: 72,
  },
] as const;
const featureScoreTrends = [
  { label: 'Clarity', score: 84, delta: '+11' },
  { label: 'Correctness', score: 80, delta: '+7' },
  { label: 'Depth', score: 76, delta: '+8' },
  { label: 'Audience fit', score: 89, delta: '+13' },
] as const;
const featureAudiencePreview = AUDIENCE_OPTIONS.filter((option) =>
  ['peer-engineer', 'senior-engineer', 'product-manager', 'non-technical-stakeholder'].includes(
    option.value
  )
);
const featureReplayTranscript = [
  'We used Redis because the service is read heavy and we wanted to avoid hitting Postgres on every request.',
  'The first version of my answer named Redis quickly, but I did not explain the eviction tradeoff or failure mode.',
  'On the retry, I framed it as faster reads with an explicit fallback path when cached data is stale.',
] as const;
const featureReplayChecklist = [
  'Name the failure mode if Redis is unavailable.',
  'Explain when the database remains the source of truth.',
  'Clarify the latency win before describing the tooling.',
] as const;
const featureReplayOutline = [
  'Start with user impact: faster reads during peak traffic.',
  'State the boundary: Redis is a cache, not the system of record.',
  'Close with the tradeoff: lower latency in exchange for cache invalidation work.',
] as const;

const getFeatureBarColorClassName = (score: number) => {
  if (score >= 85) {
    return 'bg-emerald-500';
  }

  if (score >= 75) {
    return 'bg-green-500';
  }

  if (score >= 65) {
    return 'bg-amber-400';
  }

  return 'bg-rose-400';
};

function FeatureWorkspacePreview({
  featureId,
  label,
  hasDarkBackdrop,
}: {
  featureId: FeatureId;
  label: string;
  hasDarkBackdrop: boolean;
}) {
  const shadowClassName = hasDarkBackdrop
    ? 'shadow-[0_36px_120px_-44px_rgba(16,24,40,0.95)]'
    : 'shadow-[0_30px_90px_-40px_rgba(15,23,42,0.35)]';

  return (
    <div
      className={`relative aspect-[1.36/1] overflow-hidden rounded-[2rem] border border-black/5 bg-[linear-gradient(180deg,#fbfefb_0%,#f0f8f3_100%)] ${shadowClassName}`}
    >
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top,_rgba(167,243,208,0.42),_transparent_72%)]"
      />
      <div className="relative flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-black/5 bg-white/80 px-4 py-3 backdrop-blur-sm md:px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
              <Sparkles size={18} />
            </div>
            <div>
              <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-gray-500">
                {AUREON_NAME} workspace
              </div>
              <div className="text-sm font-semibold text-gray-900">
                Technical communication
              </div>
            </div>
          </div>
          <div className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-emerald-700">
            {label}
          </div>
        </div>

        <div className="flex-1 p-4 md:p-5">
          {featureId === 'feedback' ? (
            <div className="grid h-full gap-4 lg:grid-cols-[1.12fr_0.88fr]">
              <div className="rounded-[1.6rem] bg-white p-5 shadow-[0_18px_60px_-36px_rgba(15,23,42,0.35)]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-xs font-medium uppercase tracking-[0.16em] text-gray-500">
                      Drill Results
                    </div>
                    <div className="mt-2 max-w-md text-lg font-semibold leading-7 text-gray-900">
                      Why we chose retrieval-augmented generation over fine-tuning
                    </div>
                    <div className="mt-2 text-sm text-gray-500">
                      Audience: Non-technical stakeholder
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-gray-900">81%</div>
                    <div className="mt-1 text-xs font-medium text-gray-500">
                      Overall communication score
                    </div>
                  </div>
                </div>

                <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-gray-200">
                  <div
                    className={`${getFeatureBarColorClassName(81)} h-full rounded-full`}
                    style={{ width: '81%' }}
                  />
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {featureFeedbackCategories.map((category) => (
                    <div
                      key={category.label}
                      className="rounded-2xl border border-gray-200 bg-gray-50/85 p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-semibold text-gray-900">
                          {category.label}
                        </div>
                        <div className="text-sm font-medium text-gray-600">
                          {category.score}%
                        </div>
                      </div>
                      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-200">
                        <div
                          className={`${getFeatureBarColorClassName(category.score)} h-full rounded-full`}
                          style={{ width: `${category.score}%` }}
                        />
                      </div>
                      <p className="mt-3 text-sm leading-6 text-gray-600">
                        {category.feedback}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-4">
                <div className="rounded-[1.6rem] border border-emerald-200 bg-emerald-50/80 p-5">
                  <div className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
                    <CheckCircle2 size={18} />
                    Strong signals
                  </div>
                  <ul className="mt-4 space-y-3 text-sm leading-6 text-emerald-950">
                    <li>• You explained the choice in terms of reliability and cost.</li>
                    <li>• The business impact was clear before the technical detail.</li>
                    <li>• You avoided jargon that this audience would not use.</li>
                  </ul>
                </div>

                <div className="rounded-[1.6rem] border border-amber-200 bg-amber-50/85 p-5">
                  <div className="flex items-center gap-2 text-sm font-semibold text-amber-900">
                    <AlertCircle size={18} />
                    Tighten next
                  </div>
                  <ul className="mt-4 space-y-3 text-sm leading-6 text-amber-950">
                    <li>• State the main tradeoff before describing the implementation.</li>
                    <li>• Mention when fine-tuning would have been the better choice.</li>
                    <li>• Keep the retrieval explanation to one clean sentence.</li>
                  </ul>
                </div>
              </div>
            </div>
          ) : null}

          {featureId === 'scores' ? (
            <div className="grid h-full gap-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-[1.5rem] bg-white px-5 py-4 shadow-[0_16px_50px_-36px_rgba(15,23,42,0.35)]">
                  <div className="text-xs font-medium uppercase tracking-[0.16em] text-gray-500">
                    Weekly target
                  </div>
                  <div className="mt-2 text-3xl font-bold text-gray-900">4</div>
                  <div className="mt-2 text-sm text-gray-500">Drills completed this week</div>
                </div>
                <div className="rounded-[1.5rem] bg-white px-5 py-4 shadow-[0_16px_50px_-36px_rgba(15,23,42,0.35)]">
                  <div className="text-xs font-medium uppercase tracking-[0.16em] text-gray-500">
                    Best audience
                  </div>
                  <div className="mt-2 text-3xl font-bold text-gray-900">PM</div>
                  <div className="mt-2 text-sm text-gray-500">Highest recent audience-fit scores</div>
                </div>
                <div className="rounded-[1.5rem] bg-white px-5 py-4 shadow-[0_16px_50px_-36px_rgba(15,23,42,0.35)]">
                  <div className="text-xs font-medium uppercase tracking-[0.16em] text-gray-500">
                    Retry loop
                  </div>
                  <div className="mt-2 text-3xl font-bold text-gray-900">3</div>
                  <div className="mt-2 text-sm text-gray-500">Sessions improved after a second attempt</div>
                </div>
              </div>

              <div className="grid flex-1 gap-4 lg:grid-cols-[0.98fr_1.02fr]">
                <div className="rounded-[1.6rem] bg-white p-5 shadow-[0_18px_60px_-36px_rgba(15,23,42,0.35)]">
                  <div className="text-xs font-medium uppercase tracking-[0.16em] text-gray-500">
                    Recent drills
                  </div>
                  <div className="mt-4 space-y-3">
                    {featureScoreHistory.map((session) => (
                      <div
                        key={session.title}
                        className="rounded-2xl border border-gray-200 bg-gray-50/80 p-4"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="text-sm font-semibold text-gray-900">
                              {session.title}
                            </div>
                            <div className="mt-1 text-xs text-gray-500">
                              {session.audience} • {session.mode}
                            </div>
                          </div>
                          <div className="text-sm font-semibold text-gray-700">
                            {session.score}%
                          </div>
                        </div>
                        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-200">
                          <div
                            className={`${getFeatureBarColorClassName(session.score)} h-full rounded-full`}
                            style={{ width: `${session.score}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[1.6rem] bg-white p-5 shadow-[0_18px_60px_-36px_rgba(15,23,42,0.35)]">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-xs font-medium uppercase tracking-[0.16em] text-gray-500">
                        Category movement
                      </div>
                      <div className="mt-2 text-lg font-semibold text-gray-900">
                        Last 2 weeks
                      </div>
                    </div>
                    <div className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                      Trending up
                    </div>
                  </div>

                  <div className="mt-5 space-y-4">
                    {featureScoreTrends.map((trend) => (
                      <div key={trend.label}>
                        <div className="flex items-center justify-between gap-4">
                          <div className="text-sm font-semibold text-gray-900">
                            {trend.label}
                          </div>
                          <div className="text-sm font-medium text-emerald-600">
                            {trend.delta}
                          </div>
                        </div>
                        <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-gray-200">
                          <div
                            className={`${getFeatureBarColorClassName(trend.score)} h-full rounded-full`}
                            style={{ width: `${trend.score}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50/75 p-4">
                    <div className="text-sm font-semibold text-emerald-900">
                      Best momentum right now
                    </div>
                    <p className="mt-2 text-sm leading-6 text-emerald-950">
                      Audience fit is rising fastest because your openings now match who you are speaking to.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {featureId === 'personas' ? (
            <div className="h-full rounded-[1.6rem] bg-white p-5 shadow-[0_18px_60px_-36px_rgba(15,23,42,0.35)]">
              <div className="flex flex-wrap gap-2">
                {featureSetupSteps.map((step) => {
                  const isActive = step === 'Audience';

                  return (
                    <div
                      key={step}
                      className={`rounded-full px-3 py-1.5 text-xs font-medium uppercase tracking-[0.14em] ${
                        isActive
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {step}
                    </div>
                  );
                })}
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-[0.42fr_0.58fr]">
                <div className="rounded-[1.4rem] border border-gray-200 bg-gray-50/85 p-4">
                  <div className="text-xs font-medium uppercase tracking-[0.16em] text-gray-500">
                    Current drill
                  </div>
                  <div className="mt-4 space-y-3">
                    <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3">
                      <div className="text-xs font-medium uppercase tracking-[0.14em] text-gray-500">
                        Field
                      </div>
                      <div className="mt-1 text-sm font-semibold text-gray-900">
                        {COMMUNICATION_FIELDS[1]}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3">
                      <div className="text-xs font-medium uppercase tracking-[0.14em] text-gray-500">
                        Mode
                      </div>
                      <div className="mt-1 text-sm font-semibold text-gray-900">
                        {COMMUNICATION_PRACTICE_MODES[2].label}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3">
                      <div className="text-xs font-medium uppercase tracking-[0.14em] text-gray-500">
                        Topic
                      </div>
                      <div className="mt-1 text-sm font-semibold text-gray-900">
                        Precision vs recall in search results
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-sm font-semibold text-gray-900">
                    Choose who you need to make the idea click for.
                  </div>
                  <div className="mt-1 text-sm text-gray-500">
                    The prompt and scoring shift depending on the listener you pick.
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {featureAudiencePreview.map((audience) => {
                      const isSelected = audience.value === 'product-manager';

                      return (
                        <div
                          key={audience.value}
                          className={`rounded-2xl border px-4 py-4 ${
                            isSelected
                              ? 'border-emerald-300 bg-emerald-50 shadow-sm'
                              : 'border-gray-200 bg-white'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-sm font-semibold text-gray-900">
                                {audience.label}
                              </div>
                              <div className="mt-1 text-xs leading-5 text-gray-500">
                                {audience.description}
                              </div>
                            </div>
                            {isSelected ? (
                              <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-emerald-600">
                                <Check size={16} />
                              </div>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50/85 px-4 py-3">
                    <div className="text-xs font-medium uppercase tracking-[0.14em] text-gray-500">
                      Prompt direction
                    </div>
                    <div className="mt-2 text-sm text-gray-700">
                      Explain the tradeoff in user impact, accuracy, and implementation cost.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {featureId === 'replay' ? (
            <div className="grid h-full gap-4 lg:grid-cols-[1.08fr_0.92fr]">
              <div className="rounded-[1.6rem] bg-white p-5 shadow-[0_18px_60px_-36px_rgba(15,23,42,0.35)]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-xs font-medium uppercase tracking-[0.16em] text-gray-500">
                      Saved transcript
                    </div>
                    <div className="mt-2 text-lg font-semibold text-gray-900">
                      Redis vs database caching for a high-read service
                    </div>
                    <div className="mt-2 text-sm text-gray-500">
                      Audience: Peer engineer
                    </div>
                  </div>
                  <div className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                    Retry #3
                  </div>
                </div>

                <div className="mt-4 rounded-[1.4rem] border border-gray-200 bg-gray-50/80 p-4">
                  <div className="space-y-3 text-sm leading-6 text-gray-700">
                    {featureReplayTranscript.map((line) => (
                      <p key={line}>{line}</p>
                    ))}
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <div className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600">
                    Transcript saved
                  </div>
                  <div className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600">
                    Missing points highlighted
                  </div>
                  <div className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600">
                    Retry outline generated
                  </div>
                </div>
              </div>

              <div className="grid gap-4">
                <div className="rounded-[1.6rem] border border-amber-200 bg-amber-50/85 p-5">
                  <div className="flex items-center gap-2 text-sm font-semibold text-amber-900">
                    <AlertCircle size={18} />
                    Missing points
                  </div>
                  <ul className="mt-4 space-y-3 text-sm leading-6 text-amber-950">
                    {featureReplayChecklist.map((item) => (
                      <li key={item}>• {item}</li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-[1.6rem] border border-emerald-200 bg-emerald-50/80 p-5">
                  <div className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
                    <CheckCircle2 size={18} />
                    Retry outline
                  </div>
                  <ul className="mt-4 space-y-3 text-sm leading-6 text-emerald-950">
                    {featureReplayOutline.map((item) => (
                      <li key={item}>• {item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

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
                  className="relative"
                >
                  <FeatureWorkspacePreview
                    featureId={activeFeature.id}
                    label={activeFeature.label}
                    hasDarkBackdrop={hasDarkBackdrop}
                  />
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
                    className="flex flex-col items-center"
                  >
                    <div className="flex min-h-[15rem] items-end justify-center md:min-h-[18rem]">
                      <Image
                        src={plan.imageSrc}
                        alt={plan.imageAlt}
                        width={plan.imageWidth}
                        height={plan.imageHeight}
                        sizes="(min-width: 768px) 19rem, 70vw"
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
              <div className="relative aspect-[4/4.8] overflow-hidden rounded-[1.75rem] border border-white/15 bg-black/25">
                <Image
                  src={founder.imageSrc}
                  alt={founder.imageAlt}
                  fill
                  sizes="(min-width: 768px) 25.5rem, 100vw"
                  className="object-cover"
                  style={{ objectPosition: founder.imagePosition }}
                />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,_rgba(2,6,23,0.08)_0%,_rgba(2,6,23,0)_40%,_rgba(2,6,23,0.58)_100%)]" />
                <div className="absolute bottom-4 left-4 rounded-full border border-white/15 bg-black/45 px-4 py-2 text-xs font-medium uppercase tracking-[0.2em] text-emerald-100 backdrop-blur-sm">
                  {founder.name}
                </div>
                <a
                  href={founder.linkedinUrl}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`${founder.name} LinkedIn profile`}
                  className="absolute bottom-4 right-4 flex h-11 w-11 items-center justify-center rounded-full border border-emerald-400/20 bg-black/45 text-emerald-200 backdrop-blur-sm transition-colors duration-200 hover:bg-emerald-500 hover:text-white"
                >
                  <FaLinkedinIn className="h-4 w-4" />
                </a>
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
      <footer className="border-t border-emerald-500/10 bg-[linear-gradient(to_bottom,_#b0efcb_0%,_#bdf2d4_48%,_#cbf6df_100%)] px-5 pb-8 pt-12">
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

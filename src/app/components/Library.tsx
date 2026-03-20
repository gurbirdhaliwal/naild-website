import React, { useMemo, useState } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Lightbulb,
  MessageSquareText,
  Scale,
  Sparkles,
  Waypoints,
} from 'lucide-react'
import { AUREON_NAME } from '../lib/modelConfig'

const LIBRARY_NOTES = [
  {
    id: 'lead-with-the-point',
    title: 'Lead With The Point',
    subtitle: 'Strong explanations start with the answer, then justify it.',
    description: 'Use this when your answer is technically correct but takes too long to land.',
    tags: ['Structure', 'Clarity'],
    icon: MessageSquareText,
    diagnosis:
      'This is the pattern behind answers that feel careful but still lose the room. You give the setup, the project history, and the side context before you ever name the actual decision or idea.',
    weakExample:
      'In my last role we were seeing a lot of read pressure, looked at a few options, and eventually landed on Redis to help performance.',
    strongExample:
      'We added Redis because database reads had become the bottleneck. It sped up hot paths, but we accepted extra cache invalidation complexity.',
    coachListensFor: [
      'The decision or concept shows up in the first sentence.',
      'The concrete problem is named early.',
      'The rest of the answer expands the point instead of circling it.',
    ],
    quickDrill:
      'Take one architecture choice you made recently and explain it in exactly two sentences: decision first, reason second.',
    useThisWhen: [
      'Interview questions about architecture choices',
      'Design review summaries',
      'Project updates where people need the takeaway fast',
    ],
  },
  {
    id: 'shape-for-the-audience',
    title: 'Shape For The Audience',
    subtitle: 'The same idea should sound different to a PM, recruiter, and staff engineer.',
    description: 'Use this when your explanation sounds smart to peers and fuzzy to everyone else.',
    tags: ['Audience', 'Judgment'],
    icon: Sparkles,
    diagnosis:
      'The problem is usually not a lack of knowledge. It is that you are explaining at the level that feels natural to you instead of the level the listener needs to make a decision.',
    weakExample:
      'We used a message broker to decouple producers and consumers, improve backpressure handling, and smooth event ingestion.',
    strongExample:
      'We added a queue so traffic spikes would not overwhelm the service. It gave us a buffer during peak load, at the cost of a little more system complexity.',
    coachListensFor: [
      'The level of detail feels chosen on purpose.',
      'Technical choices are translated into speed, risk, cost, or customer impact.',
      'Jargon only appears when it helps this audience act.',
    ],
    quickDrill:
      'Explain the same system change twice: once to a PM and once to a senior engineer. Keep the goal fixed and change only the framing.',
    useThisWhen: [
      'Stakeholder updates',
      'Recruiter and manager screens',
      'Cross-functional reviews',
    ],
  },
  {
    id: 'make-the-mechanism-clear',
    title: 'Make The Mechanism Clear',
    subtitle: 'Definitions are not enough. Show how the thing actually behaves.',
    description: 'Use this when your answer names the concept but never proves you understand the system.',
    tags: ['Depth', 'Accuracy'],
    icon: Waypoints,
    diagnosis:
      'A lot of answers sound polished because the terms are familiar. They still feel shallow because the listener never hears the flow, the moving parts, or the constraint that shaped the design.',
    weakExample:
      'Kubernetes helps orchestrate containers and makes deployments scalable and resilient.',
    strongExample:
      'Kubernetes keeps the desired number of containers running, replaces unhealthy pods, and shifts traffic during rollout. That is what makes deployments recover without manual intervention.',
    coachListensFor: [
      'You explain how the parts interact, not just what they are called.',
      'There is a trigger to behavior to outcome flow.',
      'A constraint or failure mode makes the explanation feel real.',
    ],
    quickDrill:
      'Pick one system you use every week and explain it as a three-step flow: what starts it, what happens in the middle, and what the user or system sees at the end.',
    useThisWhen: [
      'System design interviews',
      'Deep technical follow-ups',
      'Explaining infra, data, or ML systems',
    ],
  },
  {
    id: 'show-the-tradeoff',
    title: 'Show The Tradeoff',
    subtitle: 'Good explanations make the decision boundary visible.',
    description: 'Use this when your answer sounds one-sided or too confident to be believable.',
    tags: ['Tradeoffs', 'Decision Making'],
    icon: Scale,
    diagnosis:
      'Weak tradeoff answers usually sound like sales pitches. You describe what you chose, but not what you gave up, what mattered most, or when you would choose differently.',
    weakExample:
      'We chose microservices because it made the architecture more scalable and flexible.',
    strongExample:
      'We split the service because deploy speed and team ownership mattered more than local simplicity. We gained isolation and faster iteration, but accepted more operational overhead.',
    coachListensFor: [
      'At least two viable options are visible.',
      'The deciding constraint is explicit.',
      'You name the downside without trying to hide it.',
    ],
    quickDrill:
      'Answer one design question with this frame: we chose X over Y because Z mattered most; the downside was ___.',
    useThisWhen: [
      'Architecture decisions',
      'Postmortems and retros',
      'Senior or staff-level interviews',
    ],
  },
  {
    id: 'close-with-impact',
    title: 'Close With Impact',
    subtitle: 'Strong answers end with what changed, not just what you built.',
    description: 'Use this when your answer ends at implementation instead of outcome.',
    tags: ['Impact', 'Confidence'],
    icon: Lightbulb,
    diagnosis:
      'A lot of answers stop right after the implementation detail. The listener hears the work, but not why it mattered, what changed, or why they should remember it.',
    weakExample:
      'We added retries, improved logging, and refactored the worker to handle failures better.',
    strongExample:
      'We added retries and better failure handling, which reduced dropped jobs during peak traffic and cut on-call noise for the team.',
    coachListensFor: [
      'The ending answers the silent question: so what?',
      'Impact is tied to reliability, speed, cost, delivery, or team efficiency.',
      'The outcome sounds concrete instead of vague.',
    ],
    quickDrill:
      'Take your last project answer and add one closing sentence that begins with: The result was...',
    useThisWhen: [
      'Behavioral stories',
      'Project retros',
      'Stakeholder summaries',
    ],
  },
] as const

const LIBRARY_GUIDE_SECTION = {
  id: 'aureon-guide',
  title: `${AUREON_NAME} Guide`,
  subtitle: `Use ${AUREON_NAME} as a practice partner, not just an answer generator.`,
  description: `Documentation for getting the strongest results from ${AUREON_NAME}.`,
  tags: ['Guide', 'Aureon'],
  icon: Sparkles,
} as const

const AUREON_DOC_SECTIONS = [
  {
    title: 'Set up the session intentionally',
    body:
      'Before you begin, decide what you want to practice and who the listener is. Aureon gives better feedback when the communication goal is explicit.',
    bullets: [
      'Explain a technical concept to a beginner.',
      'Walk through a system design.',
      'Defend a decision or summarize a bug.',
      'Describe a project from your resume to a recruiter, PM, engineer, classmate, or customer.',
    ],
  },
  {
    title: 'Treat Aureon like a real audience',
    body:
      'Do not just dump information. Communicate as if another person genuinely needs to understand you. Structure the answer, define terms when needed, and focus on teaching, clarifying, or justifying.',
    bullets: [
      'Lead with the point before adding detail.',
      'Define terms only when they help the listener follow.',
      'Aim to make each sentence easier to understand than the last.',
    ],
  },
  {
    title: 'Ask Aureon to challenge you',
    body:
      'Improvement is faster when the conversation pushes back. Use Aureon to surface the parts of your explanation that would lose a real listener.',
    bullets: [
      'Point out unclear wording.',
      'Ask follow-up questions.',
      'Challenge weak logic.',
      'Highlight missing assumptions.',
      'Identify language that is too technical for the audience.',
    ],
  },
  {
    title: 'Prefer clarity before complexity',
    body:
      'Strong explanations are usually simple first and detailed second. Practice the same idea in multiple forms so you build control instead of memorizing one script.',
    bullets: [
      'Explain it in one sentence.',
      'Explain it in plain language.',
      'Explain it for a technical audience.',
      'Explain it with a business-impact angle.',
      'Use analogies, examples, inputs and outputs, or before-and-after comparisons.',
    ],
  },
] as const
const AUREON_PRACTICE_LOOP = [
  'Explain the idea.',
  'Get feedback.',
  'Rewrite it more clearly.',
  'Try again for a different audience.',
] as const
const AUREON_FEEDBACK_DIMENSIONS = [
  'Clarity',
  'Conciseness',
  'Structure',
  'Technical accuracy',
  'Confidence',
  'Audience fit',
  'Persuasiveness',
] as const
const AUREON_BEST_PRACTICES = [
  'Give each session a clear audience and goal.',
  'Explain ideas in your own words before asking for help.',
  'Ask for honest, direct feedback instead of broad encouragement.',
  'Revise after feedback instead of moving on immediately.',
  'Practice the same concept at different difficulty levels.',
  'Focus on being understood, not just sounding technical.',
] as const

export type LibraryNoteId = (typeof LIBRARY_NOTES)[number]['id']
export type LibrarySectionId = LibraryNoteId | typeof LIBRARY_GUIDE_SECTION.id
const LIBRARY_SECTIONS = [LIBRARY_GUIDE_SECTION, ...LIBRARY_NOTES] as const

interface LibraryProps {
  selectedSectionId: LibrarySectionId
  onSelectSection: (sectionId: LibrarySectionId) => void
}

const Library: React.FC<LibraryProps> = ({ selectedSectionId, onSelectSection }) => {
  const [topicMenuOpen, setTopicMenuOpen] = useState(false)

  const selectedSection = useMemo(
    () =>
      LIBRARY_SECTIONS.find((section) => section.id === selectedSectionId) ?? LIBRARY_GUIDE_SECTION,
    [selectedSectionId]
  )

  const selectedTopic = useMemo(
    () => LIBRARY_NOTES.find((topic) => topic.id === selectedSectionId) ?? LIBRARY_NOTES[0],
    [selectedSectionId]
  )

  const handleSectionChange = (sectionId: LibrarySectionId) => {
    onSelectSection(sectionId)
    setTopicMenuOpen(false)
  }

  const isGuideSelected = selectedSection.id === LIBRARY_GUIDE_SECTION.id
  const SelectedIcon = selectedTopic.icon

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-b from-white to-gray-50 px-6 py-8 lg:px-10">
      <div className="mx-auto max-w-5xl">
        <div className="rounded-[32px] border border-gray-200 bg-white/90 p-6 shadow-[0_24px_70px_-42px_rgba(15,23,42,0.28)] backdrop-blur sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-emerald-700">
                <Sparkles size={14} />
                Library
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
                Learn what strong answers sound like.
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-7 text-gray-600 sm:text-base">
                This library should not read like communication cliches. Each entry shows the failure mode, what a weak answer sounds like, what a stronger version sounds like, and how to give {AUREON_NAME} enough signal to coach you well.
              </p>
            </div>

            <div className="relative w-full max-w-sm lg:max-w-xs">
              <button
                type="button"
                onClick={() => setTopicMenuOpen((prev) => !prev)}
                className={`flex w-full items-center justify-between rounded-[22px] border bg-white px-4 py-3 text-left transition-colors ${
                  topicMenuOpen ? 'border-emerald-400 shadow-sm' : 'border-emerald-200 hover:border-emerald-300'
                }`}
                aria-haspopup="menu"
                aria-expanded={topicMenuOpen}
              >
                <div className="min-w-0">
                  <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-emerald-700">
                    Library section
                  </div>
                  <div className="mt-1 truncate text-sm font-semibold text-gray-900">
                    {selectedSection.title}
                  </div>
                </div>
                <ChevronDown
                  size={16}
                  className={`ml-3 flex-shrink-0 text-gray-500 transition-transform ${topicMenuOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {topicMenuOpen ? (
                <div className="absolute right-0 top-full z-20 mt-3 w-full overflow-hidden rounded-[24px] border border-emerald-100 bg-white p-2 shadow-[0_24px_70px_-28px_rgba(15,23,42,0.3)]">
                  <div className="max-h-[340px] overflow-y-auto">
                    {LIBRARY_SECTIONS.map((section) => {
                      const Icon = section.icon
                      const isSelected = section.id === selectedSection.id

                      return (
                        <button
                          key={section.id}
                          type="button"
                          onClick={() => handleSectionChange(section.id)}
                          className={`flex w-full items-start gap-3 rounded-[18px] px-3 py-3 text-left transition-colors ${
                            isSelected ? 'bg-emerald-50 text-emerald-900' : 'text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <div
                            className={`inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${
                              isSelected ? 'bg-white text-emerald-700' : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            <Icon size={17} />
                          </div>
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold">{section.title}</div>
                            <p className="mt-1 text-xs leading-5 text-gray-600">{section.description}</p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {isGuideSelected ? (
            <section className="mt-8 border-t border-gray-200 pt-8">
              <div className="max-w-3xl">
                <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-emerald-700">
                  <Sparkles size={14} />
                  {AUREON_NAME} guide
                </div>
                <h2 className="mt-4 text-2xl font-semibold text-gray-900 sm:text-3xl">
                  How to get the most out of {AUREON_NAME}
                </h2>
                <p className="mt-3 text-sm leading-7 text-gray-600 sm:text-base">
                  {AUREON_NAME} is built to help you explain technical ideas clearly, accurately, and
                  confidently. The more intentional the session, the more useful the feedback
                  becomes.
                </p>
              </div>

              <div className="mt-8 max-w-3xl space-y-8">
                {AUREON_DOC_SECTIONS.map((section) => (
                  <section key={section.title} className="border-t border-gray-200 pt-6">
                    <h3 className="text-lg font-semibold text-gray-900">{section.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-gray-600 sm:text-base">
                      {section.body}
                    </p>
                    <ul className="mt-4 space-y-2 text-sm leading-7 text-gray-700 sm:text-base">
                      {section.bullets.map((bullet) => (
                        <li key={bullet} className="relative pl-5">
                          <span className="absolute left-0 top-[0.82rem] h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          {bullet}
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}

                <section className="border-t border-gray-200 pt-6">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Practice revision, not just first attempts
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-gray-600 sm:text-base">
                    Your first explanation does not need to be perfect. One of the best ways to
                    improve is to explain something, get feedback, revise it, and try again.
                  </p>
                  <ol className="mt-4 space-y-2 text-sm leading-7 text-gray-700 sm:text-base">
                    {AUREON_PRACTICE_LOOP.map((item, index) => (
                      <li key={item}>
                        <span className="font-semibold text-gray-900">{index + 1}.</span> {item}
                      </li>
                    ))}
                  </ol>
                </section>

                <section className="border-t border-gray-200 pt-6">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Ask for feedback on specific dimensions
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-gray-600 sm:text-base">
                    Broad feedback can help, but focused feedback is easier to act on and measure over
                    time.
                  </p>
                  <ul className="mt-4 grid gap-2 text-sm leading-7 text-gray-700 sm:grid-cols-2 sm:text-base">
                    {AUREON_FEEDBACK_DIMENSIONS.map((dimension) => (
                      <li key={dimension} className="relative pl-5">
                        <span className="absolute left-0 top-[0.82rem] h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        {dimension}
                      </li>
                    ))}
                  </ul>
                </section>

                <section className="border-t border-gray-200 pt-6">
                  <h3 className="text-lg font-semibold text-gray-900">Best practices</h3>
                  <ul className="mt-4 space-y-2 text-sm leading-7 text-gray-700 sm:text-base">
                    {AUREON_BEST_PRACTICES.map((practice) => (
                      <li key={practice} className="relative pl-5">
                        <span className="absolute left-0 top-[0.82rem] h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        {practice}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-4 text-sm leading-7 text-gray-600 sm:text-base">
                    Real communication is rarely perfectly scripted, so your practice should not be
                    either. Short, focused sessions done consistently will usually beat occasional
                    long sessions.
                  </p>
                </section>
              </div>
            </section>
          ) : (
          <div className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
            <section className="rounded-[28px] border border-gray-200 bg-gray-50/80 p-5 sm:p-6">
              <div className="flex items-start gap-4">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-emerald-700 shadow-sm">
                  <SelectedIcon size={22} />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900">{selectedTopic.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-gray-600">{selectedTopic.subtitle}</p>
                </div>
              </div>

              <p className="mt-5 max-w-2xl text-base leading-7 text-gray-700">
                {selectedTopic.description}
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                {selectedTopic.tags.map((tag) => (
                  <span
                    key={`${selectedTopic.id}-${tag}`}
                    className="rounded-full bg-white px-3 py-1 text-xs font-medium text-gray-700"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <div className="mt-6 rounded-[24px] border border-gray-200 bg-white p-5">
                <div className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-gray-500">
                  <AlertCircle size={14} />
                  Where answers start to slip
                </div>
                <p className="mt-3 text-sm leading-7 text-gray-700">{selectedTopic.diagnosis}</p>
              </div>

              <div className="mt-6 grid gap-4 xl:grid-cols-2">
                <div className="rounded-[24px] border border-rose-200 bg-rose-50/80 p-5">
                  <div className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-rose-700">
                    <AlertCircle size={14} />
                    Sounds weak
                  </div>
                  <p className="mt-3 text-sm leading-7 text-gray-700">{selectedTopic.weakExample}</p>
                </div>

                <div className="rounded-[24px] border border-emerald-200 bg-emerald-50/80 p-5">
                  <div className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-emerald-700">
                    <CheckCircle2 size={14} />
                    Sounds stronger
                  </div>
                  <p className="mt-3 text-sm leading-7 text-gray-700">{selectedTopic.strongExample}</p>
                </div>
              </div>
            </section>

            <section className="space-y-5">
              <div className="rounded-[28px] border border-emerald-200 bg-emerald-50/80 p-5 sm:p-6">
                <div className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-emerald-700">
                  <CheckCircle2 size={14} />
                  What {AUREON_NAME} listens for
                </div>
                <div className="mt-4 space-y-4">
                  {selectedTopic.coachListensFor.map((item) => (
                    <div key={item.slice(0, 18)} className="flex items-start gap-3">
                      <CheckCircle2 size={18} className="mt-0.5 flex-shrink-0 text-emerald-600" />
                      <p className="text-sm leading-7 text-gray-700">{item}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[28px] border border-sky-200 bg-sky-50/80 p-5 sm:p-6">
                <div className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-sky-700">
                  <Lightbulb size={14} />
                  Try this in 30 seconds
                </div>
                <p className="mt-4 text-sm leading-7 text-gray-700">{selectedTopic.quickDrill}</p>
              </div>

              <div className="rounded-[28px] border border-gray-200 bg-white p-5 sm:p-6">
                <div className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-gray-500">
                  <Sparkles size={14} />
                  Use this when
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {selectedTopic.useThisWhen.map((item) => (
                    <span
                      key={item}
                      className="rounded-full bg-gray-100 px-3 py-2 text-xs font-medium text-gray-700"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </section>
          </div>
          )}
        </div>
      </div>
    </div>
  )
}

export { LIBRARY_GUIDE_SECTION, LIBRARY_NOTES, LIBRARY_SECTIONS }
export default Library

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

const COACH_NOTES = [
  {
    id: 'lead-with-the-point',
    title: 'Lead With The Point',
    subtitle: 'Strong explanations start with the answer, not the backstory.',
    description:
      'If your listener has to wait too long to understand what you are explaining, the rest of the answer feels harder than it needs to.',
    tags: ['Structure', 'Clarity'],
    icon: MessageSquareText,
    whyItMatters: [
      'Engineers often start with context because they are trying to be precise. In practice, that can bury the actual point.',
      'A strong answer gives the listener a mental map in the first sentence or two, then fills in the detail underneath it.',
    ],
    checklist: [
      'State the concept, decision, or tradeoff immediately.',
      'Name the specific problem it solves.',
      'Use the rest of the answer to justify and expand that opening line.',
    ],
    commonMisses: [
      'Starting with the project history before naming the actual technical point.',
      'Making the listener infer your conclusion from scattered details.',
      'Explaining every branch of the problem before answering the direct question.',
    ],
  },
  {
    id: 'shape-for-the-audience',
    title: 'Shape For The Audience',
    subtitle: 'The same technical idea should sound different to a PM than to a staff engineer.',
    description:
      'Audience fit is not dumbing things down. It is deciding which details matter for this listener and which details only create friction.',
    tags: ['Audience', 'Judgment'],
    icon: Sparkles,
    whyItMatters: [
      'Your explanation should make the next decision easier for the listener you chose.',
      'When audience fit is missing, even a technically correct answer feels miscalibrated.',
    ],
    checklist: [
      'Decide what this audience already knows.',
      'Translate the explanation into the level of detail they need to act.',
      'Make the benefit, cost, or implication legible for that person.',
    ],
    commonMisses: [
      'Using peer-level jargon with a non-technical stakeholder.',
      'Oversimplifying for a technical reviewer until the answer sounds shallow.',
      'Forgetting to explain why this decision matters to the audience at all.',
    ],
  },
  {
    id: 'make-the-mechanism-clear',
    title: 'Make The Mechanism Clear',
    subtitle: 'Definitions are not enough. Show how the thing actually works.',
    description:
      'Depth shows up when you explain the moving parts, not when you stack more buzzwords into the answer.',
    tags: ['Depth', 'Accuracy'],
    icon: Waypoints,
    whyItMatters: [
      'If you cannot explain the mechanism, the answer sounds memorized.',
      'Mechanism is what lets another engineer trust that you understand the system instead of only its headline.',
    ],
    checklist: [
      'Break the idea into the few components that matter most.',
      'Explain the flow from trigger to outcome.',
      'Name the constraint or failure mode that changes the design.',
    ],
    commonMisses: [
      'Repeating a textbook definition without explaining the system behavior.',
      'Listing tools and components without connecting how they interact.',
      'Skipping the “why” behind the design because the terms sound familiar.',
    ],
  },
  {
    id: 'show-the-tradeoff',
    title: 'Show The Tradeoff',
    subtitle: 'Good technical communication makes the decision boundary visible.',
    description:
      'Tradeoff explanations get strong when the listener can see what you optimized for, what you gave up, and when you would choose differently.',
    tags: ['Tradeoffs', 'Decision Making'],
    icon: Scale,
    whyItMatters: [
      'Tradeoffs reveal judgment. They show you know there was not one perfect answer.',
      'A clean tradeoff explanation is often the fastest way to sound like an engineer who can reason in production constraints.',
    ],
    checklist: [
      'Name the competing options clearly.',
      'Explain the deciding constraint or priority.',
      'Say what you accepted as the downside of your choice.',
    ],
    commonMisses: [
      'Describing one option in detail and barely naming the alternative.',
      'Pretending your chosen design had no downside.',
      'Leaving out the condition that would make you choose something else.',
    ],
  },
  {
    id: 'close-with-impact',
    title: 'Close With Impact',
    subtitle: 'An explanation should end with what changed, not just what you did.',
    description:
      'When you end on impact, the listener understands why the explanation mattered and what outcome the reasoning enabled.',
    tags: ['Impact', 'Confidence'],
    icon: Lightbulb,
    whyItMatters: [
      'Impact gives the answer a reason to exist beyond sounding smart.',
      'It also keeps technical explanations connected to execution, product, and team outcomes.',
    ],
    checklist: [
      'State the result of the concept, decision, or tradeoff.',
      'Tie the explanation back to reliability, speed, cost, or delivery.',
      'End with the effect on the system or the team, not a generic summary line.',
    ],
    commonMisses: [
      'Stopping right after the implementation detail.',
      'Ending with a vague statement like “and it worked well.”',
      'Forgetting to connect the explanation to a decision or outcome anyone cares about.',
    ],
  },
] as const

export type CoachNoteId = (typeof COACH_NOTES)[number]['id']

interface CoachNotesProps {
  selectedTopicId: CoachNoteId
  onSelectTopic: (topicId: CoachNoteId) => void
}

const CoachNotes: React.FC<CoachNotesProps> = ({ selectedTopicId, onSelectTopic }) => {
  const [topicMenuOpen, setTopicMenuOpen] = useState(false)

  const selectedTopic = useMemo(
    () => COACH_NOTES.find((topic) => topic.id === selectedTopicId) ?? COACH_NOTES[0],
    [selectedTopicId]
  )

  const handleTopicChange = (topicId: CoachNoteId) => {
    onSelectTopic(topicId)
    setTopicMenuOpen(false)
  }

  const SelectedIcon = selectedTopic.icon

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-b from-white to-gray-50 px-6 py-8 lg:px-10">
      <div className="mx-auto max-w-5xl">
        <div className="rounded-[32px] border border-gray-200 bg-white/90 p-6 shadow-[0_24px_70px_-42px_rgba(15,23,42,0.28)] backdrop-blur sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-emerald-700">
                <Sparkles size={14} />
                Coach notes
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
                Build stronger technical explanations.
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-7 text-gray-600 sm:text-base">
                These notes are not prompts. They are the habits the coach expects to hear when you explain a concept, a decision, or a tradeoff out loud.
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
                    Current note
                  </div>
                  <div className="mt-1 truncate text-sm font-semibold text-gray-900">
                    {selectedTopic.title}
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
                    {COACH_NOTES.map((topic) => {
                      const Icon = topic.icon
                      const isSelected = topic.id === selectedTopic.id

                      return (
                        <button
                          key={topic.id}
                          type="button"
                          onClick={() => handleTopicChange(topic.id)}
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
                            <div className="truncate text-sm font-semibold">{topic.title}</div>
                            <p className="mt-1 text-xs leading-5 text-gray-600">{topic.description}</p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

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

              <div className="mt-6 space-y-4">
                {selectedTopic.whyItMatters.map((paragraph) => (
                  <p key={paragraph.slice(0, 20)} className="text-sm leading-7 text-gray-700">
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>

            <section className="space-y-5">
              <div className="rounded-[28px] border border-emerald-200 bg-emerald-50/80 p-5 sm:p-6">
                <div className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-emerald-700">
                  <CheckCircle2 size={14} />
                  What strong answers do
                </div>
                <div className="mt-4 space-y-4">
                  {selectedTopic.checklist.map((item) => (
                    <div key={item.slice(0, 18)} className="flex items-start gap-3">
                      <CheckCircle2 size={18} className="mt-0.5 flex-shrink-0 text-emerald-600" />
                      <p className="text-sm leading-7 text-gray-700">{item}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[28px] border border-amber-200 bg-amber-50/80 p-5 sm:p-6">
                <div className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-amber-700">
                  <AlertCircle size={14} />
                  Common misses
                </div>
                <div className="mt-4 space-y-4">
                  {selectedTopic.commonMisses.map((item) => (
                    <div key={item.slice(0, 18)} className="flex items-start gap-3">
                      <AlertCircle size={18} className="mt-0.5 flex-shrink-0 text-amber-600" />
                      <p className="text-sm leading-7 text-gray-700">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}

export { COACH_NOTES }
export default CoachNotes

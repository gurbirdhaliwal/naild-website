import React, { useMemo, useState } from 'react'
import {
  ChevronDown,
  Lightbulb,
  MessageSquareText,
  Sparkles,
  Waypoints,
} from 'lucide-react'
import { AUREON_NAME } from '../lib/modelConfig'

const AUREON_GUIDE_SECTION = {
  id: 'aureon-guide',
  title: `Getting the Most out of ${AUREON_NAME}`,
  subtitle: `Use ${AUREON_NAME} as a practice partner, not just an answer generator.`,
  description: `Documentation for getting the strongest results from ${AUREON_NAME}.`,
  tags: ['Guide', 'Aureon'],
  icon: Sparkles,
  status: 'ready',
} as const

const EFFECTIVE_COMMUNICATION_SECTION = {
  id: 'effective-communication-study',
  title: 'Effective Communication Study Guide',
  subtitle: 'Study the habits that make technical explanations clear, balanced, and memorable.',
  description: 'Documentation for explaining technical ideas with speed, audience awareness, tradeoffs, and impact.',
  tags: ['Study Guide', 'Communication'],
  icon: MessageSquareText,
  status: 'ready',
} as const

const FUTURE_LIBRARY_SECTION_ONE = {
  id: 'behavioral-communication-guide',
  title: 'Behavioral Communication Guide',
  subtitle: 'Reserved for a future guide on telling clearer, sharper behavioral stories.',
  description: 'Coming soon.',
  tags: ['Coming Soon', 'Behavioral'],
  icon: Lightbulb,
  status: 'soon',
} as const

const FUTURE_LIBRARY_SECTION_TWO = {
  id: 'design-review-communication-guide',
  title: 'Design Review Communication Guide',
  subtitle: 'Reserved for a future guide on presenting technical decisions in reviews and writeups.',
  description: 'Coming soon.',
  tags: ['Coming Soon', 'Design Review'],
  icon: Waypoints,
  status: 'soon',
} as const

const LIBRARY_SECTIONS = [
  AUREON_GUIDE_SECTION,
  EFFECTIVE_COMMUNICATION_SECTION,
  FUTURE_LIBRARY_SECTION_ONE,
  FUTURE_LIBRARY_SECTION_TWO,
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

const AUREON_AUDIENCE_EXAMPLES = [
  'A non technical stakeholder',
  'A recruiter',
  'A software engineer',
  'A product manager',
  'A classmate',
  'A customer',
] as const

const AUREON_CHALLENGE_PROMPTS = [
  'Point out unclear wording.',
  'Ask follow up questions.',
  'Challenge weak logic.',
  'Highlight missing assumptions.',
  'Identify overly technical language.',
  'Tell you where the explanation loses the audience.',
] as const

const AUREON_CLARITY_VARIATIONS = [
  'In one sentence.',
  'In plain language.',
  'For a technical audience.',
  'With an example.',
  'With a business impact angle.',
] as const

const AUREON_EXAMPLE_TYPES = [
  'Analogies.',
  'Small examples.',
  'Real use cases.',
  'Input and output examples.',
  'Before and after comparisons.',
] as const

const EFFECTIVE_COMMUNICATION_DOC_SECTIONS = [
  {
    title: 'Lead with the point so the answer lands faster',
    body:
      'Being technically correct is not always enough. Strong explanations land quickly because they begin with meaning first, then add support.',
    bullets: [
      'Use point, then reason, then evidence, then detail if needed.',
      'State the main idea in the first one or two sentences.',
      'Avoid unnecessary setup and shorten the path to understanding.',
      'Separate what is essential from what is just background.',
    ],
  },
  {
    title: 'Shape the answer for the audience',
    body:
      'The same idea should sound different to an engineer, product manager, recruiter, or non-technical stakeholder. Clarity depends on relevance and accessibility.',
    bullets: [
      'Ask what the listener already knows.',
      'Ask what they care about most.',
      'Choose the level of detail that is actually useful.',
      'Explain the same concept differently for a beginner, technical peer, hiring manager, or stakeholder.',
    ],
  },
  {
    title: 'Show tradeoffs so your answer sounds thoughtful',
    body:
      'Strong technical communication shows judgment. It makes clear what you chose, what you gained, what became harder, and why that tradeoff still made sense.',
    bullets: [
      'Use language like: we chose X because it improved A, even though it made B harder, because our priority was C.',
      'Make alternatives and constraints visible.',
      'Answer: what did you choose, what did you gain, and what did you give up?',
      'Balance makes the explanation more credible in interviews, meetings, and design reviews.',
    ],
  },
  {
    title: 'Close with impact instead of stopping at implementation',
    body:
      'Implementation matters, but outcome is what gives the work meaning. Strong answers end by showing what changed, who benefited, and why it mattered.',
    bullets: [
      'Show user impact, business impact, or team impact.',
      'Call out time saved, risk reduced, performance improved, or quality improved.',
      'Use impact to answer why the work mattered in practice.',
      'Make the answer memorable by connecting action to result.',
    ],
  },
] as const

const EFFECTIVE_COMMUNICATION_FRAMEWORK = [
  'Start with the main point.',
  'Add only the context the listener needs.',
  'Adjust the answer for the audience.',
  'Show the tradeoff.',
  'End with impact.',
] as const

const EFFECTIVE_COMMUNICATION_PRACTICE_PROMPTS = [
  'Explain a technical concept in under 30 seconds.',
  'Explain the same concept for two different audiences.',
  'Justify a design choice and include the tradeoff.',
  'Describe a project and end with measurable impact.',
  'Rewrite a long answer so the key point lands earlier.',
  'Turn a peer-level explanation into one a non-technical person can follow.',
] as const

const EFFECTIVE_COMMUNICATION_REVIEW_QUESTIONS = [
  'Where did my answer take too long to get to the point?',
  'Which parts assumed too much technical knowledge?',
  'Did I explain the tradeoff clearly?',
  'Did my answer sound one-sided or overconfident?',
  'Did I stop at implementation instead of outcome?',
  'How would you rewrite this for a less technical audience?',
] as const

const EFFECTIVE_COMMUNICATION_AUDIENCE_QUESTIONS = [
  'What does this person already know?',
  'What do they care about most?',
  'What level of detail is actually useful here?',
  'Which terms need explanation, and which do not?',
] as const

const EFFECTIVE_COMMUNICATION_AUDIENCE_VARIATIONS = [
  'For a beginner.',
  'For a technical peer.',
  'For a hiring manager.',
  'For a non technical stakeholder.',
] as const

const EFFECTIVE_COMMUNICATION_TRADEOFF_CHECK = [
  'What did you choose?',
  'What did you gain?',
  'What did you give up, and why was it still worth it?',
] as const

const EFFECTIVE_COMMUNICATION_IMPACT_TYPES = [
  'User impact.',
  'Business impact.',
  'Team impact.',
  'Time saved.',
  'Risk reduced.',
  'Performance improved.',
  'Quality improved.',
  'Better decision making enabled.',
] as const

const EFFECTIVE_COMMUNICATION_IMPACT_QUESTIONS = [
  'What changed because of this?',
  'Who benefited?',
  'What improved?',
  'What problem became smaller, faster, cheaper, clearer, or easier?',
] as const

type LibrarySection = (typeof LIBRARY_SECTIONS)[number]
export type LibrarySectionId = LibrarySection['id']

interface LibraryProps {
  selectedSectionId: LibrarySectionId
  onSelectSection: (sectionId: LibrarySectionId) => void
}

const BulletList = ({ items }: { items: readonly string[] }) => (
  <ul className="mt-4 space-y-2 text-sm leading-7 text-gray-700 sm:text-base">
    {items.map((item) => (
      <li key={item} className="relative pl-5">
        <span className="absolute left-0 top-[0.82rem] h-1.5 w-1.5 rounded-full bg-emerald-500" />
        {item}
      </li>
    ))}
  </ul>
)

const ParagraphGroup = ({ paragraphs }: { paragraphs: readonly string[] }) => (
  <div className="mt-3 space-y-3 text-sm leading-7 text-gray-600 sm:text-base">
    {paragraphs.map((paragraph) => (
      <p key={paragraph}>{paragraph}</p>
    ))}
  </div>
)

const Library: React.FC<LibraryProps> = ({ selectedSectionId, onSelectSection }) => {
  const [sectionMenuOpen, setSectionMenuOpen] = useState(false)

  const selectedSection = useMemo(
    () => LIBRARY_SECTIONS.find((section) => section.id === selectedSectionId) ?? LIBRARY_SECTIONS[0],
    [selectedSectionId]
  )

  const handleSectionChange = (sectionId: LibrarySectionId) => {
    onSelectSection(sectionId)
    setSectionMenuOpen(false)
  }

  const renderAureonGuide = () => (
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
          confidently. The more intentional the session, the more useful the feedback becomes.
        </p>
      </div>

      <div className="mt-8 max-w-3xl space-y-8">
        <section className="border-t border-gray-200 pt-6">
          <h3 className="text-lg font-semibold text-gray-900">Start with a real goal</h3>
          <ParagraphGroup
            paragraphs={[
              'Before you begin, decide what you want to practice. You might want to explain a technical concept to a beginner, walk through a system design, defend a decision, summarize a bug, or describe a project from your resume.',
              'Clear goals lead to better practice.',
            ]}
          />
        </section>

        <section className="border-t border-gray-200 pt-6">
          <h3 className="text-lg font-semibold text-gray-900">
            Treat {AUREON_NAME} like a real audience
          </h3>
          <ParagraphGroup
            paragraphs={[
              'Do not just dump information. Communicate as if you are speaking to another person who needs to understand you.',
              'Structure your thoughts, define terms when needed, and focus on making your explanation easy to follow. Aureon works best when you are actively trying to teach, persuade, clarify, or justify.',
            ]}
          />
        </section>

        <section className="border-t border-gray-200 pt-6">
          <h3 className="text-lg font-semibold text-gray-900">Be specific about the context</h3>
          <ParagraphGroup
            paragraphs={[
              'Good communication depends on who you are speaking to. Tell Aureon who the intended audience is.',
              'This helps Aureon respond in a way that better matches the communication challenge you want to practice.',
            ]}
          />
          <BulletList items={AUREON_AUDIENCE_EXAMPLES} />
        </section>

        <section className="border-t border-gray-200 pt-6">
          <h3 className="text-lg font-semibold text-gray-900">
            Ask {AUREON_NAME} to challenge you
          </h3>
          <ParagraphGroup
            paragraphs={[
              'You will improve faster when the conversation pushes you a little.',
              'The goal is not just to sound smart. The goal is to be understood.',
            ]}
          />
          <BulletList items={AUREON_CHALLENGE_PROMPTS} />
        </section>

        <section className="border-t border-gray-200 pt-6">
          <h3 className="text-lg font-semibold text-gray-900">
            Focus on clarity before complexity
          </h3>
          <ParagraphGroup
            paragraphs={[
              'A strong explanation is usually simple first, detailed second. Start with the core idea, then add layers of detail only when needed.',
              `${AUREON_NAME} can help you practice this by asking you to explain something in multiple ways.`,
              'This helps you build flexibility and control in how you communicate.',
            ]}
          />
          <BulletList items={AUREON_CLARITY_VARIATIONS} />
        </section>

        <section className="border-t border-gray-200 pt-6">
          <h3 className="text-lg font-semibold text-gray-900">Use examples whenever possible</h3>
          <ParagraphGroup
            paragraphs={[
              'Abstract explanations are often harder to understand. Concrete examples make technical communication stronger.',
              `${AUREON_NAME} can help you refine these so they are accurate without becoming too complicated.`,
            ]}
          />
          <BulletList items={AUREON_EXAMPLE_TYPES} />
        </section>

        <section className="border-t border-gray-200 pt-6">
          <h3 className="text-lg font-semibold text-gray-900">
            Practice revision, not just first attempts
          </h3>
          <ParagraphGroup
            paragraphs={[
              'Your first explanation does not need to be perfect. One of the best ways to improve is to explain something, get feedback, then try again.',
              'This repetition helps turn good communication into a habit.',
            ]}
          />
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
          <ParagraphGroup
            paragraphs={[
              'Broad feedback can be useful, but focused feedback is often better.',
              'This makes your practice more targeted and measurable.',
            ]}
          />
          <BulletList items={AUREON_FEEDBACK_DIMENSIONS} />
        </section>

        <section className="border-t border-gray-200 pt-6">
          <h3 className="text-lg font-semibold text-gray-900">Push beyond memorized answers</h3>
          <ParagraphGroup
            paragraphs={[
              `${AUREON_NAME} is most useful when you go beyond rehearsed scripts. Try explaining ideas in new ways, answering unexpected questions, or defending decisions under pressure.`,
              'Real communication is rarely perfectly scripted, so your practice should not be either.',
            ]}
          />
        </section>

        <section className="border-t border-gray-200 pt-6">
          <h3 className="text-lg font-semibold text-gray-900">Use it consistently</h3>
          <ParagraphGroup
            paragraphs={[
              'Communication improves through repetition. A short, focused session done regularly is often more effective than occasional long sessions.',
              'Even 10 to 15 minutes of explaining, refining, and retrying can build noticeable improvement over time.',
            ]}
          />
        </section>

        <section className="border-t border-gray-200 pt-6">
          <h3 className="text-lg font-semibold text-gray-900">Best practices</h3>
          <BulletList items={AUREON_BEST_PRACTICES} />
        </section>

        <section className="border-t border-gray-200 pt-6">
          <h3 className="text-lg font-semibold text-gray-900">A good mindset to have</h3>
          <ParagraphGroup
            paragraphs={[
              `${AUREON_NAME} is not there to make your explanations sound more complicated. It is there to help you communicate with precision, simplicity, and confidence.`,
              'The best users are the ones who are willing to be corrected, challenged, and improved.',
              `Use ${AUREON_NAME} as a practice partner, not just an answer generator.`,
            ]}
          />
        </section>
      </div>
    </section>
  )

  const renderEffectiveCommunicationGuide = () => (
    <section className="mt-8 border-t border-gray-200 pt-8">
      <div className="max-w-3xl">
        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-emerald-700">
          <MessageSquareText size={14} />
          Study guide
        </div>
        <h2 className="mt-4 text-2xl font-semibold text-gray-900 sm:text-3xl">
          Communicating Technical Ideas Effectively with {AUREON_NAME}
        </h2>
        <p className="mt-3 text-sm leading-7 text-gray-600 sm:text-base">
          Being technically correct is not always enough. Strong technical communication means your
          idea lands quickly, fits the audience, shows judgment, and ends with a clear sense of why
          it matters.
        </p>
      </div>

      <div className="mt-8 max-w-3xl space-y-8">
        <section className="border-t border-gray-200 pt-6">
          <h3 className="text-lg font-semibold text-gray-900">
            When your explanation is correct, but takes too long to land
          </h3>
          <ParagraphGroup
            paragraphs={[
              'A common communication problem is not being wrong, but being slow. You may understand the system, the bug, or the design decision clearly in your own head, but your explanation takes too many steps before the listener understands the point.',
              'This usually happens when you begin with process instead of meaning. You walk through everything in the order you thought about it rather than in the order the listener needs to hear it.',
              'A stronger approach is to lead with the core message first, then support it.',
              'Think in this structure: point, then reason, then evidence, then detail if needed.',
            ]}
          />
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-rose-700">
                Instead of
              </p>
              <p className="mt-3 text-sm leading-7 text-gray-700">
                I first checked the API logs, then I looked at the database, then I noticed the
                cache layer...
              </p>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-700">
                Try
              </p>
              <p className="mt-3 text-sm leading-7 text-gray-700">
                The issue came from stale cached data, which made the API return outdated results.
                I confirmed that by comparing the cache response against the database records.
              </p>
            </div>
          </div>
          <ParagraphGroup
            paragraphs={[
              'The second version lands faster because the listener immediately knows what happened and why it matters.',
            ]}
          />
          <BulletList items={EFFECTIVE_COMMUNICATION_DOC_SECTIONS[0].bullets} />
          <p className="mt-4 text-sm leading-7 text-gray-600 sm:text-base">
            A useful question to ask yourself is: what does the listener need to understand first
            for the rest of this to make sense? That is where your answer should begin.
          </p>
        </section>

        <section className="border-t border-gray-200 pt-6">
          <h3 className="text-lg font-semibold text-gray-900">
            How to shape your answer for the audience
          </h3>
          <ParagraphGroup
            paragraphs={[
              'One of the biggest mistakes in technical communication is assuming that clarity is universal. An explanation that feels precise to your peers may feel vague, dense, or overwhelming to someone with a different background.',
              'Good communicators adjust their explanation based on who is listening. The same idea should sound different depending on the audience.',
            ]}
          />
          <div className="mt-5 space-y-4">
            <div className="rounded-2xl border border-gray-200 bg-gray-50/80 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-gray-500">
                For a software engineer
              </p>
              <p className="mt-2 text-sm leading-7 text-gray-700">
                We reduced latency by moving repeated database reads behind a caching layer.
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-gray-50/80 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-gray-500">
                For a product manager
              </p>
              <p className="mt-2 text-sm leading-7 text-gray-700">
                We made the feature feel faster by reducing how often the system has to fetch the
                same data.
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-gray-50/80 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-gray-500">
                For a recruiter
              </p>
              <p className="mt-2 text-sm leading-7 text-gray-700">
                I improved performance so the product responded faster for users.
              </p>
            </div>
          </div>
          <ParagraphGroup
            paragraphs={[
              'Each version is true. The difference is not correctness. The difference is relevance and accessibility.',
              'A good explanation does not try to prove intelligence by sounding advanced. It tries to create understanding as efficiently as possible.',
              `${AUREON_NAME} can help you practice this by having you explain the same concept multiple ways.`,
            ]}
          />
          <BulletList items={EFFECTIVE_COMMUNICATION_AUDIENCE_QUESTIONS} />
          <BulletList items={EFFECTIVE_COMMUNICATION_AUDIENCE_VARIATIONS} />
          <p className="mt-4 text-sm leading-7 text-gray-600 sm:text-base">
            This kind of repetition builds control. You stop giving one default explanation and
            start giving the right explanation.
          </p>
        </section>

        <section className="border-t border-gray-200 pt-6">
          <h3 className="text-lg font-semibold text-gray-900">
            How to show tradeoffs so your answer sounds thoughtful, not one sided
          </h3>
          <ParagraphGroup
            paragraphs={[
              'Weak technical answers often sound absolute. They make one choice sound obviously correct without showing what was gained, what was sacrificed, or why that decision made sense in context.',
              'Strong technical communication shows judgment. It makes clear that decisions involve tradeoffs.',
            ]}
          />
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-rose-700">
                Weak
              </p>
              <p className="mt-3 text-sm leading-7 text-gray-700">
                We used React because it was the best option.
              </p>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-700">
                Stronger
              </p>
              <p className="mt-3 text-sm leading-7 text-gray-700">
                We used React because it let us build the interface quickly and manage state
                cleanly, although it added some frontend complexity compared to a simpler static
                approach. Since the product needed interactive user flows, that tradeoff was worth
                it.
              </p>
            </div>
          </div>
          <ParagraphGroup
            paragraphs={[
              'That answer sounds stronger because it shows balance. It communicates that you evaluated options instead of blindly choosing one.',
              'Tradeoff language often follows this pattern: we chose X because it improved A, even though it made B harder. That tradeoff made sense because our priority was C.',
              'This structure is powerful because it shows awareness of alternatives, understanding of constraints, ability to justify decisions, and maturity in technical thinking.',
              `When using ${AUREON_NAME}, practice explaining decisions in a way that answers all three of these questions.`,
            ]}
          />
          <BulletList items={EFFECTIVE_COMMUNICATION_TRADEOFF_CHECK} />
          <p className="mt-4 text-sm leading-7 text-gray-600 sm:text-base">
            This makes your answers sound far more credible in interviews, meetings, design
            discussions, and project reviews.
          </p>
        </section>

        <section className="border-t border-gray-200 pt-6">
          <h3 className="text-lg font-semibold text-gray-900">
            How to close with impact instead of stopping at implementation
          </h3>
          <ParagraphGroup
            paragraphs={[
              'Another common issue is ending an answer too early. Many people explain what they built, how they built it, and then stop. But the strongest answers go one step further: they explain the result.',
              'Implementation matters, but outcome is what gives the implementation meaning.',
            ]}
          />
          <div className="mt-5 space-y-4">
            <div className="rounded-2xl border border-gray-200 bg-gray-50/80 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-gray-500">
                Incomplete
              </p>
              <p className="mt-2 text-sm leading-7 text-gray-700">
                I built a script that automated weekly report generation.
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-gray-50/80 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-gray-500">
                Stronger
              </p>
              <p className="mt-2 text-sm leading-7 text-gray-700">
                I built a script that automated weekly report generation, which reduced manual work
                for the team and made reporting more consistent.
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-gray-50/80 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-gray-500">
                Even stronger
              </p>
              <p className="mt-2 text-sm leading-7 text-gray-700">
                I built a script that automated weekly report generation, cutting several hours of
                repetitive work each week and helping the team produce reports faster with fewer
                formatting errors.
              </p>
            </div>
          </div>
          <ParagraphGroup
            paragraphs={[
              'The technical work is the same. The difference is that the second and third versions explain why the work mattered.',
              'A simple way to think about this is: implementation tells what you did, while impact tells why it mattered.',
              `When practicing with ${AUREON_NAME}, do not stop when you reach the build step. Push yourself to answer what changed, who benefited, and what improved.`,
              'That final layer is often what makes an answer memorable.',
            ]}
          />
          <BulletList items={EFFECTIVE_COMMUNICATION_IMPACT_TYPES} />
          <BulletList items={EFFECTIVE_COMMUNICATION_IMPACT_QUESTIONS} />
        </section>

        <section className="border-t border-gray-200 pt-6">
          <h3 className="text-lg font-semibold text-gray-900">
            A practical framework you can reuse
          </h3>
          <p className="mt-3 text-sm leading-7 text-gray-600 sm:text-base">
            When explaining a technical idea, project, bug, or decision, this structure keeps the
            answer clear, grounded, and complete.
          </p>
          <ol className="mt-4 space-y-2 text-sm leading-7 text-gray-700 sm:text-base">
            {EFFECTIVE_COMMUNICATION_FRAMEWORK.map((item, index) => (
              <li key={item}>
                <span className="font-semibold text-gray-900">{index + 1}.</span> {item}
              </li>
            ))}
          </ol>
        </section>

        <section className="border-t border-gray-200 pt-6">
          <h3 className="text-lg font-semibold text-gray-900">
            How to practice this with {AUREON_NAME}
          </h3>
          <p className="mt-3 text-sm leading-7 text-gray-600 sm:text-base">
            {AUREON_NAME} is most useful when you treat it like an active practice partner and test
            whether your communication is actually landing.
          </p>
          <BulletList items={EFFECTIVE_COMMUNICATION_PRACTICE_PROMPTS} />
        </section>

        <section className="border-t border-gray-200 pt-6">
          <h3 className="text-lg font-semibold text-gray-900">
            Questions to ask during review
          </h3>
          <p className="mt-3 text-sm leading-7 text-gray-600 sm:text-base">
            Use direct review questions to improve the exact communication habit that needs work.
          </p>
          <BulletList items={EFFECTIVE_COMMUNICATION_REVIEW_QUESTIONS} />
        </section>

        <section className="border-t border-gray-200 pt-6">
          <h3 className="text-lg font-semibold text-gray-900">
            What strong technical communication sounds like
          </h3>
          <BulletList
            items={[
              'Clear before it is impressive.',
              'Shaped for the listener, not just the speaker.',
              'Balanced enough to show judgment.',
              'Complete enough to connect action to outcome.',
            ]}
          />
          <p className="mt-4 text-sm leading-7 text-gray-600 sm:text-base">
            The goal is not just to explain what happened. The goal is to make someone else
            understand the idea, trust your thinking, and remember why it mattered.
          </p>
          <p className="mt-3 text-sm leading-7 text-gray-600 sm:text-base">
            That is the kind of communication {AUREON_NAME} is built to help you practice.
          </p>
        </section>
      </div>
    </section>
  )

  const renderComingSoon = () => (
    <section className="mt-8 border-t border-gray-200 pt-8">
      <div className="max-w-3xl">
        <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-amber-700">
          <Lightbulb size={14} />
          Coming soon
        </div>
        <h2 className="mt-4 text-2xl font-semibold text-gray-900 sm:text-3xl">
          {selectedSection.title}
        </h2>
        <p className="mt-3 text-sm leading-7 text-gray-600 sm:text-base">
          {selectedSection.subtitle}
        </p>
        <p className="mt-6 text-sm leading-7 text-gray-600 sm:text-base">
          This slot is reserved for future study documentation. The structure is in place so new
          guides can be added here without changing how Library works.
        </p>
      </div>
    </section>
  )

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
                Study documentation for effective communication.
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-gray-600 sm:text-base">
                Library is where users find Aureon playbooks, communication study guides, and future
                documentation for getting stronger at explaining technical ideas.
              </p>
            </div>

            <div className="relative w-full max-w-sm lg:max-w-xs">
              <button
                type="button"
                onClick={() => setSectionMenuOpen((prev) => !prev)}
                className={`flex w-full items-center justify-between rounded-[22px] border bg-white px-4 py-3 text-left transition-colors ${
                  sectionMenuOpen ? 'border-emerald-400 shadow-sm' : 'border-emerald-200 hover:border-emerald-300'
                }`}
                aria-haspopup="menu"
                aria-expanded={sectionMenuOpen}
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
                  className={`ml-3 flex-shrink-0 text-gray-500 transition-transform ${sectionMenuOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {sectionMenuOpen ? (
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

          {selectedSection.id === AUREON_GUIDE_SECTION.id
            ? renderAureonGuide()
            : selectedSection.id === EFFECTIVE_COMMUNICATION_SECTION.id
              ? renderEffectiveCommunicationGuide()
              : renderComingSoon()}
        </div>
      </div>
    </div>
  )
}

export { LIBRARY_SECTIONS }
export default Library

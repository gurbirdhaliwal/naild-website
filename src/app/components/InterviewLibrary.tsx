import React, { useEffect, useMemo, useRef, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  AlertCircle,
  BarChart3,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  Library,
  Loader2,
  MessageSquare,
  RefreshCw,
  Search,
  Settings,
  User,
} from 'lucide-react'
import CustomMicRecorder from './CustomMicRecorder'
import { transcribeAudioBlob } from '../services/transcriptionService'
import { getUserFacingErrorMessage } from '../lib/userFacingErrors'

export type LibraryTopicId =
  | 'star-storytelling'
  | 'leadership-ownership'
  | 'teamwork-collaboration'
  | 'conflict-feedback'
  | 'ambiguity-adaptability'
  | 'communication-skills'
  | 'prioritization-execution'
  | 'resilience-growth'

interface PracticeSignal {
  label: string
  description: string
  keywords: string[]
}

interface PracticeDrill {
  prompt: string
  instructions: string
  evaluatorNote: string
  minimumWordCount: number
  passThreshold: number
  successHeadline: string
  partialHeadline: string
  needsWorkHeadline: string
  signals: PracticeSignal[]
}

interface FrameworkStep {
  title: string
  description: string
}

export interface LibraryTopic {
  id: LibraryTopicId
  title: string
  subtitle: string
  description: string
  tags: string[]
  icon: LucideIcon
  overview: string[]
  interviewerLooksFor: string[]
  frameworkTitle: string
  frameworkSteps: FrameworkStep[]
  commonMistakes: string[]
  practiceDrill: PracticeDrill
}

interface PracticeEvaluation {
  status: 'strong' | 'partial' | 'needs-work'
  headline: string
  supportingText: string
  nextStep: string
  matchedCount: number
  wordCount: number
  matchedSignals: Array<PracticeSignal & { matched: boolean }>
}

interface InterviewLibraryProps {
  selectedTopicId: LibraryTopicId
  onSelectTopic: (topicId: LibraryTopicId) => void
}

export const LIBRARY_TOPICS: LibraryTopic[] = [
  {
    id: 'star-storytelling',
    title: 'STAR Storytelling',
    subtitle: 'Turn vague experience into evidence interviewers can trust.',
    description:
      'Use situation, task, action, and result to make your answers concrete instead of drifting into summary.',
    tags: ['STAR', 'Clarity', 'Impact'],
    icon: BarChart3,
    overview: [
      'STAR is not a script. It is a compression tool that keeps your answer easy to follow when the interviewer asks for a real example. The point is to prove what happened, what you owned, what you did, and what changed because of your work.',
      'Strong STAR answers spend the most time on the action and result. If your answer is mostly backstory, the interviewer learns the context but not your judgment or execution.',
    ],
    interviewerLooksFor: [
      'Clear context in one or two sentences instead of a long setup.',
      'A precise statement of what you were responsible for solving.',
      'Specific actions you personally took, not only what the team did.',
      'A result that shows what improved, changed, or was learned.',
    ],
    frameworkTitle: 'How to approach STAR',
    frameworkSteps: [
      {
        title: 'Situation',
        description: 'Set the scene fast. Mention the team, project, and pressure point in one tight block.',
      },
      {
        title: 'Task',
        description: 'Explain your responsibility so the interviewer knows what success depended on you doing.',
      },
      {
        title: 'Action',
        description: 'Spend most of the answer here. Walk through the decisions, tradeoffs, and steps you took.',
      },
      {
        title: 'Result',
        description: 'Close with the outcome, what you measured, and what the experience changed for you.',
      },
    ],
    commonMistakes: [
      'Starting too wide and spending half the answer on company history.',
      'Saying "we" for every important action so your contribution stays unclear.',
      'Ending with a vague result like "it went well" instead of a real outcome.',
      'Forgetting to explain why you chose your approach over alternatives.',
    ],
    practiceDrill: {
      prompt:
        'Tell me about a time you had to recover a project that was slipping behind schedule.',
      instructions:
        'Give a focused answer that would come out to roughly 5 to 8 sentences when transcribed. Make the situation, your task, your actions, and the result explicit so the checker can verify the structure.',
      evaluatorNote:
        'This drill uses a lightweight rubric. Direct language helps the checker identify the STAR elements you included.',
      minimumWordCount: 70,
      passThreshold: 3,
      successHeadline: 'You used STAR clearly.',
      partialHeadline: 'This is close, but one STAR element is still soft.',
      needsWorkHeadline: 'This answer is not clearly using STAR yet.',
      signals: [
        {
          label: 'Situation is clear',
          description: 'You establish the project context and why the moment mattered.',
          keywords: ['project', 'deadline', 'release', 'customer', 'timeline', 'behind', 'quarter'],
        },
        {
          label: 'Task is explicit',
          description: 'You explain what you were accountable for in the situation.',
          keywords: ['my role', 'responsible', 'owned', 'task was', 'needed to', 'i had to'],
        },
        {
          label: 'Action is specific',
          description: 'You describe concrete steps you personally took.',
          keywords: ['i did', 'i created', 'i met', 'i prioritized', 'i proposed', 'i changed'],
        },
        {
          label: 'Result is measurable',
          description: 'You show what improved or what you learned after the action.',
          keywords: ['result', 'improved', 'reduced', 'increased', 'delivered', 'shipped', '%'],
        },
      ],
    },
  },
  {
    id: 'leadership-ownership',
    title: 'Leadership & Ownership',
    subtitle: 'Show that you step in before someone has to tell you to.',
    description:
      'Leadership answers land when they show judgment, initiative, and accountability under real pressure.',
    tags: ['Ownership', 'Initiative', 'Decisions'],
    icon: Settings,
    overview: [
      'Interviewers do not only ask leadership questions for managers. They use them to see whether you can spot a problem, define a path forward, and stay accountable when the outcome is uncertain.',
      'Ownership answers should sound like you increased clarity for other people. The strongest stories show that you did not wait for perfect direction before moving the work forward.',
    ],
    interviewerLooksFor: [
      'You noticed a gap, risk, or opportunity before it became somebody else’s emergency.',
      'You defined a plan and brought other people into it without overstepping.',
      'You made a decision with incomplete information and explained your reasoning.',
      'You stayed accountable for the outcome, including the follow-through.',
    ],
    frameworkTitle: 'How to approach leadership stories',
    frameworkSteps: [
      {
        title: 'Name the gap',
        description: 'Start with the problem you saw and why it mattered enough to act on.',
      },
      {
        title: 'State your decision',
        description: 'Explain the call you made, especially if you had to weigh speed, risk, or alignment.',
      },
      {
        title: 'Show the follow-through',
        description: 'Leadership is not the idea alone. Walk through how you moved the work and people forward.',
      },
      {
        title: 'Close with accountability',
        description: 'Finish with what happened and how you owned the result after the initial push.',
      },
    ],
    commonMistakes: [
      'Confusing leadership with authority instead of influence and initiative.',
      'Claiming ownership without showing the specific decision you made.',
      'Skipping stakeholder communication and making the story feel solo-only.',
      'Telling a rescue story without explaining the sustained outcome.',
    ],
    practiceDrill: {
      prompt:
        'Describe a time you took ownership of a problem that was slowing your team down, even though it was not formally assigned to you.',
      instructions:
        'Give a focused answer that shows the gap you saw, the choice you made, how you drove execution, and what happened next.',
      evaluatorNote:
        'The checker looks for explicit ownership signals. Name your decision and the outcome instead of implying them.',
      minimumWordCount: 75,
      passThreshold: 3,
      successHeadline: 'This reads like a real ownership story.',
      partialHeadline: 'The initiative is there, but the leadership signal is incomplete.',
      needsWorkHeadline: 'The answer does not yet prove ownership clearly.',
      signals: [
        {
          label: 'Problem ownership',
          description: 'You call out the gap or problem you stepped into.',
          keywords: ['problem', 'gap', 'blocked', 'slowing', 'risk', 'issue'],
        },
        {
          label: 'Decision is named',
          description: 'You explain the choice you made instead of only the activity.',
          keywords: ['decided', 'chose', 'proposed', 'recommended', 'i took ownership'],
        },
        {
          label: 'Execution is visible',
          description: 'You show how you organized work or influenced others to move it.',
          keywords: ['aligned', 'coordinated', 'implemented', 'followed up', 'drove', 'organized'],
        },
        {
          label: 'Outcome is accountable',
          description: 'You finish with the result or the lesson you were accountable for.',
          keywords: ['outcome', 'result', 'resolved', 'improved', 'delivered', 'learned'],
        },
      ],
    },
  },
  {
    id: 'teamwork-collaboration',
    title: 'Teamwork & Collaboration',
    subtitle: 'Prove that you make shared work easier, not louder.',
    description:
      'Collaboration answers should show how you align people, share ownership, and keep execution moving across different priorities.',
    tags: ['Teamwork', 'Trust', 'Alignment'],
    icon: User,
    overview: [
      'Teamwork questions test how you behave when success depends on other people. The interviewer wants to hear that you can build alignment without hiding behind the team when things get difficult.',
      'A strong collaboration story balances two things: your contribution stays visible, and other people still sound respected. That combination signals maturity.',
    ],
    interviewerLooksFor: [
      'You understood another person or team’s goal instead of treating them as a blocker.',
      'You created clarity around roles, priorities, or communication.',
      'You contributed directly while also enabling others to succeed.',
      'The story ends with a shared outcome, not just better feelings.',
    ],
    frameworkTitle: 'How to approach collaboration stories',
    frameworkSteps: [
      {
        title: 'Define the shared goal',
        description: 'Explain what everyone needed to achieve together, even if priorities were different.',
      },
      {
        title: 'Surface the friction',
        description: 'Name the alignment problem honestly so your collaboration has something real to solve.',
      },
      {
        title: 'Show how you built trust',
        description: 'Describe the communication, listening, and structure you used to move the work forward.',
      },
      {
        title: 'End on joint impact',
        description: 'Close with what the team delivered because the collaboration improved.',
      },
    ],
    commonMistakes: [
      'Talking only about harmony and leaving out the real coordination challenge.',
      'Using the team’s output as the result without showing what you contributed.',
      'Making the story sound like you convinced everyone by force.',
      'Describing supportiveness without a business or product impact.',
    ],
    practiceDrill: {
      prompt:
        'Tell me about a time you had to work closely with a partner team that had different priorities from yours.',
      instructions:
        'Use a real collaboration story. Show the shared goal, the tension, how you created alignment, and the result you delivered together.',
      evaluatorNote:
        'Explicitly naming the tension and the alignment move makes this type of answer much stronger.',
      minimumWordCount: 75,
      passThreshold: 3,
      successHeadline: 'This answer shows collaborative leadership.',
      partialHeadline: 'The teamwork signal is there, but the alignment story needs more clarity.',
      needsWorkHeadline: 'This does not yet read like a strong collaboration example.',
      signals: [
        {
          label: 'Shared goal is clear',
          description: 'You show what both sides were trying to accomplish.',
          keywords: ['shared goal', 'partner team', 'cross-functional', 'together', 'both teams', 'stakeholders'],
        },
        {
          label: 'Tension is honest',
          description: 'You explain the mismatch in priorities or incentives.',
          keywords: ['different priorities', 'misaligned', 'conflict', 'tension', 'dependency', 'blocked'],
        },
        {
          label: 'Alignment action is specific',
          description: 'You explain the concrete move you made to build trust or clarity.',
          keywords: ['aligned', 'clarified', 'facilitated', 'listened', 'documented', 'agreed'],
        },
        {
          label: 'Shared result is visible',
          description: 'You show what improved because the collaboration worked.',
          keywords: ['launched', 'delivered', 'resolved', 'faster', 'improved', 'outcome'],
        },
      ],
    },
  },
  {
    id: 'conflict-feedback',
    title: 'Conflict & Feedback',
    subtitle: 'Show that you can handle disagreement without losing trust.',
    description:
      'These stories should prove that you stay direct, curious, and constructive when stakes are high.',
    tags: ['Conflict', 'Feedback', 'Resolution'],
    icon: Library,
    overview: [
      'Interviewers ask conflict questions to see whether you can disagree like an adult. They are not looking for a conflict-free candidate. They are looking for someone who can protect the relationship while still addressing the issue.',
      'Great answers describe both sides fairly. If your story makes the other person sound unreasonable and you sound perfect, the interviewer will assume the real conflict skills are missing.',
    ],
    interviewerLooksFor: [
      'You explain the disagreement without dramatizing it.',
      'You demonstrate listening before pushing your own view.',
      'You show how the conflict was resolved, not avoided.',
      'You preserve or rebuild trust after the hard conversation.',
    ],
    frameworkTitle: 'How to approach conflict stories',
    frameworkSteps: [
      {
        title: 'State the disagreement',
        description: 'Name the issue and why it mattered instead of hiding it behind generic wording.',
      },
      {
        title: 'Show understanding',
        description: 'Explain what the other person cared about so you sound balanced and credible.',
      },
      {
        title: 'Describe the conversation',
        description: 'Focus on how you navigated the disagreement, not just the final answer.',
      },
      {
        title: 'Close with the repaired outcome',
        description: 'Show what was resolved and whether the working relationship improved.',
      },
    ],
    commonMistakes: [
      'Choosing a conflict example where nothing meaningful was at stake.',
      'Explaining your position but not the other person’s concern.',
      'Skipping the actual conversation and jumping straight to the happy ending.',
      'Using a story where you "won" but trust clearly got worse.',
    ],
    practiceDrill: {
      prompt:
        'Describe a time you disagreed with a teammate or stakeholder about the right approach to take.',
      instructions:
        'Give a balanced answer. Name the disagreement, show what you did to understand the other side, explain the resolution, and include the final relationship or project outcome.',
      evaluatorNote:
        'The best conflict answers sound calm and specific. If you do not show the resolution move, the story will feel unfinished.',
      minimumWordCount: 75,
      passThreshold: 3,
      successHeadline: 'This reads like a mature conflict answer.',
      partialHeadline: 'The disagreement is clear, but the resolution pattern needs more evidence.',
      needsWorkHeadline: 'This answer does not yet show strong conflict handling.',
      signals: [
        {
          label: 'Disagreement is explicit',
          description: 'You clearly describe what the conflict was about.',
          keywords: ['disagreed', 'different view', 'conflict', 'pushback', 'debate', 'tension'],
        },
        {
          label: 'Listening is visible',
          description: 'You show that you tried to understand the other perspective.',
          keywords: ['listened', 'understood', 'asked', 'their perspective', 'their concern', 'hearing'],
        },
        {
          label: 'Resolution action is concrete',
          description: 'You describe how the issue was worked through.',
          keywords: ['resolved', 'compromised', 'aligned', 'agreed', 'worked through', 'decided'],
        },
        {
          label: 'Trust or outcome improves',
          description: 'You show that the project or relationship moved forward.',
          keywords: ['relationship', 'trust', 'outcome', 'moved forward', 'delivered', 'improved'],
        },
      ],
    },
  },
  {
    id: 'ambiguity-adaptability',
    title: 'Ambiguity & Adaptability',
    subtitle: 'Demonstrate how you create structure when the path is unclear.',
    description:
      'Ambiguity answers should prove that you can make progress without waiting for perfect requirements.',
    tags: ['Ambiguity', 'Change', 'Adaptability'],
    icon: Search,
    overview: [
      'When interviewers ask about ambiguity, they are testing your operating system under uncertainty. They want to know how you break a fuzzy situation into decisions, experiments, and next steps.',
      'Adaptability is not just reacting to change. It is recovering direction quickly while keeping others informed and making sensible tradeoffs.',
    ],
    interviewerLooksFor: [
      'You can identify what is known, unknown, and risky.',
      'You build a decision framework instead of stalling.',
      'You stay flexible when new information changes the plan.',
      'You still produce movement, learning, or delivery under uncertainty.',
    ],
    frameworkTitle: 'How to approach ambiguity stories',
    frameworkSteps: [
      {
        title: 'Name the uncertainty',
        description: 'Start with what was unclear so the interviewer sees the ambiguity immediately.',
      },
      {
        title: 'Create structure',
        description: 'Explain how you framed the problem, gathered signals, or defined a first path.',
      },
      {
        title: 'Adjust deliberately',
        description: 'Show how you adapted when requirements, priorities, or data shifted.',
      },
      {
        title: 'Show progress',
        description: 'Close with what you delivered, learned, or de-risked because of your approach.',
      },
    ],
    commonMistakes: [
      'Telling a story that was difficult but not actually ambiguous.',
      'Saying you stayed flexible without showing the structure you created.',
      'Making the answer sound reactive instead of thoughtful.',
      'Leaving out how you kept other people aligned while plans changed.',
    ],
    practiceDrill: {
      prompt:
        'Tell me about a time you had to move forward on a project even though the requirements were incomplete or changing.',
      instructions:
        'Make the uncertainty obvious. Then show how you created structure, adapted when new information arrived, and still produced progress.',
      evaluatorNote:
        'Ambiguity stories need both structure and flexibility. If one is missing, the answer feels thin.',
      minimumWordCount: 75,
      passThreshold: 3,
      successHeadline: 'This answer handles ambiguity well.',
      partialHeadline: 'You show uncertainty, but the adaptation pattern needs more detail.',
      needsWorkHeadline: 'This does not yet prove you can operate well in ambiguity.',
      signals: [
        {
          label: 'Uncertainty is obvious',
          description: 'You clearly name what was missing or changing.',
          keywords: ['unclear', 'ambiguous', 'changing', 'incomplete', 'unknown', 'requirements'],
        },
        {
          label: 'You created structure',
          description: 'You explain the framework, plan, or checkpoints you introduced.',
          keywords: ['framework', 'plan', 'prioritized', 'defined', 'broke down', 'next step'],
        },
        {
          label: 'You adapted',
          description: 'You show how you responded when the situation shifted.',
          keywords: ['adapted', 'adjusted', 'changed course', 'updated', 'revised', 'iterated'],
        },
        {
          label: 'Progress is clear',
          description: 'You end with a delivery, de-risked path, or measurable learning.',
          keywords: ['launched', 'validated', 'delivered', 'progress', 'learned', 'reduced risk'],
        },
      ],
    },
  },
  {
    id: 'communication-skills',
    title: 'Communication Skills',
    subtitle: 'Prove that your ideas stay clear when the audience changes.',
    description:
      'Communication answers should show that you can simplify, persuade, and confirm understanding under pressure.',
    tags: ['Clarity', 'Influence', 'Confidence'],
    icon: MessageSquare,
    overview: [
      'Interviewers use communication questions to estimate what it feels like to work with you. They want to hear that you can explain a decision clearly, tailor to the audience, and keep conversations productive when the topic is complex.',
      'Strong communication answers are audience-aware. You are not only saying what you communicated. You are showing how you adjusted your message so another person could act on it.',
    ],
    interviewerLooksFor: [
      'You recognized what the audience cared about and what they did not know.',
      'You simplified without becoming vague or inaccurate.',
      'You checked for understanding instead of assuming the message landed.',
      'Your communication changed a decision, alignment, or outcome.',
    ],
    frameworkTitle: 'How to approach communication stories',
    frameworkSteps: [
      {
        title: 'Define the audience',
        description: 'Say who you were communicating with and what made that audience challenging.',
      },
      {
        title: 'Tailor the message',
        description: 'Explain how you simplified, reframed, or structured the information for them.',
      },
      {
        title: 'Check understanding',
        description: 'Show the loop you used to confirm the communication actually worked.',
      },
      {
        title: 'Tie it to impact',
        description: 'Close with the decision, alignment, or execution outcome your communication enabled.',
      },
    ],
    commonMistakes: [
      'Giving a presentation story with no explanation of how you tailored the message.',
      'Making communication sound one-way instead of interactive.',
      'Talking about being "clear" without any evidence that the audience understood.',
      'Choosing a story with no meaningful consequence if the communication failed.',
    ],
    practiceDrill: {
      prompt:
        'Describe a time you had to explain a technical decision to someone who did not share your background.',
      instructions:
        'Show the audience, how you simplified the message, how you checked understanding, and what outcome your communication influenced.',
      evaluatorNote:
        'Audience awareness is the main signal here. If you do not adapt the message, the story feels generic.',
      minimumWordCount: 75,
      passThreshold: 3,
      successHeadline: 'This answer shows strong communication habits.',
      partialHeadline: 'The explanation is solid, but the audience-handling still needs more evidence.',
      needsWorkHeadline: 'This does not yet demonstrate strong communication skill.',
      signals: [
        {
          label: 'Audience is named',
          description: 'You make it clear who you were communicating with.',
          keywords: ['stakeholder', 'customer', 'leader', 'non-technical', 'audience', 'partner'],
        },
        {
          label: 'Message was tailored',
          description: 'You explain how you simplified or reframed the content.',
          keywords: ['simplified', 'framed', 'translated', 'broke it down', 'explained in', 'tailored'],
        },
        {
          label: 'Understanding was checked',
          description: 'You show how you confirmed the message landed.',
          keywords: ['asked', 'questions', 'feedback', 'confirmed', 'checked understanding', 'clarified'],
        },
        {
          label: 'Communication changed something',
          description: 'You show the concrete impact of the conversation.',
          keywords: ['decision', 'alignment', 'approved', 'moved forward', 'buy-in', 'outcome'],
        },
      ],
    },
  },
  {
    id: 'prioritization-execution',
    title: 'Prioritization & Execution',
    subtitle: 'Show how you make tradeoffs and still deliver.',
    description:
      'These answers should prove that you can sort what matters, explain tradeoffs, and move work forward without losing control.',
    tags: ['Priorities', 'Execution', 'Tradeoffs'],
    icon: Check,
    overview: [
      'Prioritization questions are about judgment under constraint. The interviewer wants to know how you decide when everything looks important and what happens after you make the call.',
      'Execution is the second half of the story. A strong answer shows both the prioritization logic and the system you used to turn that decision into delivery.',
    ],
    interviewerLooksFor: [
      'You explain the competing priorities clearly.',
      'You use decision criteria instead of personal preference.',
      'You make a tradeoff and communicate it directly.',
      'You follow through with execution and outcome.',
    ],
    frameworkTitle: 'How to approach prioritization stories',
    frameworkSteps: [
      {
        title: 'Lay out the collision',
        description: 'Describe the competing demands so the interviewer sees why prioritization was required.',
      },
      {
        title: 'Explain the criteria',
        description: 'Show what factors drove your call, such as impact, risk, or deadlines.',
      },
      {
        title: 'Name the tradeoff',
        description: 'State what moved first and what you intentionally delayed, delegated, or dropped.',
      },
      {
        title: 'Close with execution',
        description: 'Show how the plan held up and what you delivered because of it.',
      },
    ],
    commonMistakes: [
      'Saying you prioritized without naming the criteria.',
      'Telling a busyness story instead of a tradeoff story.',
      'Ignoring what you deprioritized and why.',
      'Stopping at the prioritization decision and forgetting the execution outcome.',
    ],
    practiceDrill: {
      prompt:
        'Tell me about a time multiple deadlines collided and you had to decide what moved first.',
      instructions:
        'Make the collision clear. Then explain your criteria, the tradeoff you chose, and how you executed against that plan.',
      evaluatorNote:
        'A convincing prioritization answer always includes the tradeoff. If nothing lost priority, the story is probably incomplete.',
      minimumWordCount: 75,
      passThreshold: 3,
      successHeadline: 'This answer shows strong prioritization judgment.',
      partialHeadline: 'The story has momentum, but the tradeoff logic needs to be more explicit.',
      needsWorkHeadline: 'This does not yet prove clear prioritization skill.',
      signals: [
        {
          label: 'Competing priorities are clear',
          description: 'You show there were real demands pulling at the same time.',
          keywords: ['multiple deadlines', 'competing', 'priorities', 'at the same time', 'collision', 'urgent'],
        },
        {
          label: 'Decision criteria are explicit',
          description: 'You explain what logic you used to rank the work.',
          keywords: ['impact', 'risk', 'deadline', 'customer', 'criteria', 'tradeoff'],
        },
        {
          label: 'Tradeoff is named',
          description: 'You say what you delayed, delegated, or did first.',
          keywords: ['prioritized', 'deprioritized', 'delegated', 'delayed', 'focused on', 'sequenced'],
        },
        {
          label: 'Execution outcome is visible',
          description: 'You show what happened because of your prioritization.',
          keywords: ['delivered', 'completed', 'shipped', 'met the deadline', 'outcome', 'result'],
        },
      ],
    },
  },
  {
    id: 'resilience-growth',
    title: 'Resilience & Growth',
    subtitle: 'Show how you respond when things go wrong and what changes afterward.',
    description:
      'These stories work when they show honesty, recovery, and a real learning loop instead of polished perfection.',
    tags: ['Failure', 'Growth', 'Resilience'],
    icon: CircleHelp,
    overview: [
      'Questions about mistakes, setbacks, and growth are really questions about self-awareness. Interviewers want to know whether you can face a miss directly, recover responsibly, and improve your system so it does not repeat.',
      'Strong resilience stories do not flatten the setback into something trivial. The story should show that the miss mattered, that you owned your part, and that your behavior changed because of it.',
    ],
    interviewerLooksFor: [
      'You are honest about the setback or mistake.',
      'You take responsibility without becoming defensive or self-destructive.',
      'You explain how you recovered or stabilized the situation.',
      'You show a durable lesson that changed your future behavior.',
    ],
    frameworkTitle: 'How to approach resilience stories',
    frameworkSteps: [
      {
        title: 'Name the setback honestly',
        description: 'Choose a real miss and explain what made it meaningful.',
      },
      {
        title: 'Own your part',
        description: 'Say what you could have done differently without dodging responsibility.',
      },
      {
        title: 'Show the recovery',
        description: 'Walk through the steps you took to stabilize the situation or make it right.',
      },
      {
        title: 'Finish with the new habit',
        description: 'Explain what changed in your approach after the experience.',
      },
    ],
    commonMistakes: [
      'Picking a fake weakness story where nothing really went wrong.',
      'Spending all the time on the mistake and none on the recovery.',
      'Owning the miss in words but blaming the environment in tone.',
      'Ending with a lesson that sounds generic or unchanged.',
    ],
    practiceDrill: {
      prompt:
        'Describe a time you made a mistake or faced a setback that forced you to change how you work.',
      instructions:
        'Be direct about the miss, explain how you responded, and end with the habit or lesson that changed because of it.',
      evaluatorNote:
        'Growth stories need visible recovery and visible learning. If one is missing, the answer feels incomplete.',
      minimumWordCount: 75,
      passThreshold: 3,
      successHeadline: 'This answer shows resilience and real learning.',
      partialHeadline: 'The setback is clear, but the growth loop needs more proof.',
      needsWorkHeadline: 'This does not yet read like a strong resilience story.',
      signals: [
        {
          label: 'Setback is honest',
          description: 'You clearly describe the failure, miss, or setback.',
          keywords: ['mistake', 'failed', 'setback', 'missed', 'wrong', 'did not go well'],
        },
        {
          label: 'Ownership is visible',
          description: 'You acknowledge your part in the situation.',
          keywords: ['i owned', 'my part', 'responsible', 'i should have', 'i learned that i'],
        },
        {
          label: 'Recovery is concrete',
          description: 'You show what you did to stabilize or repair the situation.',
          keywords: ['recovered', 'fixed', 'addressed', 'followed up', 'corrected', 'stabilized'],
        },
        {
          label: 'Growth is durable',
          description: 'You explain what changed in your behavior afterward.',
          keywords: ['since then', 'now i', 'changed', 'lesson', 'process', 'habit'],
        },
      ],
    },
  },
]

const countWords = (value: string) => value.trim().split(/\s+/).filter(Boolean).length

const evaluatePracticeResponse = (
  topic: LibraryTopic,
  response: string
): PracticeEvaluation => {
  const trimmedResponse = response.trim()
  const wordCount = countWords(trimmedResponse)
  const normalizedResponse = trimmedResponse.toLowerCase()
  const matchedSignals = topic.practiceDrill.signals.map((signal) => ({
    ...signal,
    matched: signal.keywords.some((keyword) => normalizedResponse.includes(keyword)),
  }))
  const matchedCount = matchedSignals.filter((signal) => signal.matched).length
  const missingSignals = matchedSignals.filter((signal) => !signal.matched).map((signal) => signal.label)
  const hasEnoughLength = wordCount >= topic.practiceDrill.minimumWordCount

  if (hasEnoughLength && matchedCount === matchedSignals.length) {
    return {
      status: 'strong',
      headline: topic.practiceDrill.successHeadline,
      supportingText:
        'You covered the full structure this drill is looking for and kept the answer concrete enough to feel interview-ready.',
      nextStep: 'Next step: tighten the wording until you can deliver the same answer out loud in about 90 seconds.',
      matchedCount,
      wordCount,
      matchedSignals,
    }
  }

  if (hasEnoughLength && matchedCount >= topic.practiceDrill.passThreshold) {
    return {
      status: 'partial',
      headline: topic.practiceDrill.partialHeadline,
      supportingText: missingSignals.length
        ? `You hit most of the important signals, but the answer still needs a clearer ${missingSignals
            .join(', ')
            .toLowerCase()}.`
        : 'You are close, but the answer still needs to be a little sharper.',
      nextStep: missingSignals.length
        ? `Revise the response so the missing parts are impossible to miss: ${missingSignals.join(', ')}.`
        : 'Revise the answer once more and make the structure even more explicit.',
      matchedCount,
      wordCount,
      matchedSignals,
    }
  }

  return {
    status: 'needs-work',
    headline: topic.practiceDrill.needsWorkHeadline,
    supportingText: hasEnoughLength
      ? `Right now the checker only found ${matchedCount} of ${matchedSignals.length} core signals.`
      : `The response is only ${wordCount} words. Add more detail so the interviewer can see your judgment and outcome.`,
    nextStep: missingSignals.length
      ? `Focus on adding these missing parts directly: ${missingSignals.join(', ')}.`
      : 'Add more detail and make your key decisions and outcome more explicit.',
    matchedCount,
    wordCount,
    matchedSignals,
  }
}

const PracticeDrillPanel: React.FC<{ topic: LibraryTopic }> = ({ topic }) => {
  const [response, setResponse] = useState('')
  const [evaluation, setEvaluation] = useState<PracticeEvaluation | null>(null)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [transcriptionError, setTranscriptionError] = useState<string | null>(null)

  const wordCount = countWords(response)

  const handleReset = () => {
    setResponse('')
    setEvaluation(null)
    setTranscriptionError(null)
    setIsTranscribing(false)
  }

  const handleRecordingStart = () => {
    setResponse('')
    setEvaluation(null)
    setTranscriptionError(null)
  }

  const handleAudioRecorded = async (audioBlob: Blob) => {
    setIsTranscribing(true)
    setTranscriptionError(null)

    try {
      const transcript = (await transcribeAudioBlob(audioBlob, 'library-practice')).trim()
      setResponse(transcript)
      setEvaluation(evaluatePracticeResponse(topic, transcript))
    } catch (error) {
      const message = getUserFacingErrorMessage('transcription', error)
      setTranscriptionError(message)
      setEvaluation(null)
    } finally {
      setIsTranscribing(false)
    }
  }

  return (
    <section className="border-t border-emerald-100/80 pt-10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200/80 bg-white/75 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-emerald-700 backdrop-blur">
            <BookOpen size={14} />
            Practice Drill
          </div>
          <h3 className="mt-4 text-2xl font-semibold tracking-tight text-gray-900">Quick self-check</h3>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-gray-600">{topic.practiceDrill.instructions}</p>
        </div>
        <div className="max-w-sm border-l-2 border-emerald-200 pl-4 text-xs text-gray-600">
          <div className="font-semibold uppercase tracking-[0.18em] text-gray-500">Checker note</div>
          <p className="mt-2 leading-5">{topic.practiceDrill.evaluatorNote}</p>
        </div>
      </div>

      <div className="mt-8">
        <div className="text-xs font-medium uppercase tracking-[0.18em] text-gray-500">
          What the checker looks for
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {topic.practiceDrill.signals.map((signal) => (
            <div key={`${topic.id}-${signal.label}`} className="border-l-2 border-emerald-200 pl-4">
              <div className="text-sm font-semibold text-gray-900">{signal.label}</div>
              <p className="mt-1 text-sm leading-6 text-gray-600">{signal.description}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 space-y-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs font-medium uppercase tracking-[0.18em] text-gray-500">
              Sample prompt
            </div>
            <div className="text-xs font-medium text-emerald-700">Answer out loud</div>
          </div>

          <div className="rounded-[24px] border border-emerald-200/80 bg-white/80 px-5 py-4 backdrop-blur">
            <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-emerald-700">
              Question
            </div>
            <p className="mt-3 text-base leading-8 text-gray-900">{topic.practiceDrill.prompt}</p>
          </div>
        </div>

        <div className="rounded-[24px] border border-gray-200 bg-white/75 px-5 py-4 backdrop-blur">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-xs font-medium uppercase tracking-[0.18em] text-gray-500">
                Speech to text
              </div>
              <p className="mt-2 text-sm leading-6 text-gray-600">
                Use the microphone to speak your answer. We&apos;ll transcribe it into the response area below for review.
              </p>
            </div>
            <div className="flex-shrink-0">
              <CustomMicRecorder
                onAudioRecorded={handleAudioRecorded}
                onRecordingStart={handleRecordingStart}
                onRecordingError={setTranscriptionError}
                maxDuration={90}
                wrapperClassName="flex flex-col items-center gap-2"
                buttonClassName="bg-gray-900 text-white hover:bg-gray-800 hover:scale-105"
                recordingButtonClassName="bg-red-100 text-red-600 hover:bg-red-200 scale-110"
                statusClassName="text-xs text-gray-500"
                idleText="Tap the mic to answer"
                recordingText="Recording your answer..."
                processingText="Transcribing your response..."
              />
            </div>
          </div>

          {isTranscribing ? (
            <div className="mt-4 inline-flex items-center gap-2 text-sm text-emerald-700">
              <Loader2 size={16} className="animate-spin" />
              Transcribing and reviewing your answer now...
            </div>
          ) : null}

          {transcriptionError ? (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {transcriptionError}
            </div>
          ) : null}
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <div className="text-sm font-medium text-gray-900">
              Transcript
            </div>
            <span className="text-xs text-gray-500">
              {wordCount} words
              {topic.practiceDrill.minimumWordCount > 0
                ? ` • target ${topic.practiceDrill.minimumWordCount}+`
                : ''}
            </span>
          </div>
          <div className="rounded-[24px] border border-gray-300 bg-white/70 px-4 py-4 backdrop-blur">
            {response ? (
              <p className="min-h-52 whitespace-pre-wrap text-sm leading-7 text-gray-900">{response}</p>
            ) : (
              <div className="min-h-52 text-sm leading-7 text-gray-400">
                Your spoken answer will appear here after transcription. This drill is voice-only.
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="text-sm text-gray-600">
            The transcript is reviewed automatically after each recording.
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-5 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            Reset drill
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {evaluation && (
        <div
          className={`mt-8 border-l-4 pl-5 ${
            evaluation.status === 'strong'
              ? 'border-emerald-500'
              : evaluation.status === 'partial'
                ? 'border-amber-500'
                : 'border-red-500'
          }`}
        >
          <div className="flex items-start gap-3">
            {evaluation.status === 'strong' ? (
              <CheckCircle2 className="mt-0.5 text-emerald-600" size={20} />
            ) : (
              <AlertCircle
                className={`mt-0.5 ${
                  evaluation.status === 'partial' ? 'text-amber-600' : 'text-red-600'
                }`}
                size={20}
              />
            )}
            <div className="min-w-0">
              <div className="text-base font-semibold text-gray-900">{evaluation.headline}</div>
              <p className="mt-1 text-sm leading-6 text-gray-700">{evaluation.supportingText}</p>
              <p className="mt-2 text-sm font-medium text-gray-800">{evaluation.nextStep}</p>
              <p className="mt-3 text-xs uppercase tracking-[0.18em] text-gray-500">
                {evaluation.matchedCount} of {evaluation.matchedSignals.length} rubric signals found
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-x-8 gap-y-4 md:grid-cols-2">
            {evaluation.matchedSignals.map((signal) => (
              <div key={`${topic.id}-evaluation-${signal.label}`} className="flex items-start gap-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                  {signal.matched ? (
                    <CheckCircle2 size={16} className="text-emerald-600" />
                  ) : (
                    <AlertCircle size={16} className="text-red-600" />
                  )}
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-900">{signal.label}</div>
                  <p className="mt-1 text-sm leading-6 text-gray-600">{signal.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

const InterviewLibrary: React.FC<InterviewLibraryProps> = ({ selectedTopicId, onSelectTopic }) => {
  const [topicMenuOpen, setTopicMenuOpen] = useState(false)
  const topicMenuRef = useRef<HTMLDivElement | null>(null)

  const selectedTopic = useMemo(
    () => LIBRARY_TOPICS.find((topic) => topic.id === selectedTopicId) ?? LIBRARY_TOPICS[0],
    [selectedTopicId]
  )

  const SelectedTopicIcon = selectedTopic.icon

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!topicMenuRef.current?.contains(event.target as Node)) {
        setTopicMenuOpen(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setTopicMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  const handleTopicChange = (topicId: LibraryTopicId) => {
    onSelectTopic(topicId)
    setTopicMenuOpen(false)
  }

  return (
    <div className="h-full overflow-y-auto bg-fixed bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.16),_transparent_24%),linear-gradient(180deg,#f7fff9_0%,#ffffff_42%,#f9fafb_100%)]">
      <div className="mx-auto max-w-4xl px-5 py-8 sm:px-6 lg:px-8">
        <article className="pb-12">
          <div className="flex flex-col gap-6 border-b border-emerald-100/80 pb-10 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white/70 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-gray-600 backdrop-blur">
                <SelectedTopicIcon size={14} />
                {selectedTopic.tags[0]}
              </div>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-gray-900 sm:text-[2.3rem]">
                {selectedTopic.title}
              </h2>
              <p className="mt-3 max-w-3xl text-base leading-7 text-gray-600">
                {selectedTopic.subtitle}
              </p>
            </div>

            <div ref={topicMenuRef} className="relative w-full sm:max-w-[320px]">
              <div className="mb-2 block text-[11px] font-medium uppercase tracking-[0.18em] text-gray-500">
                Navigate library
              </div>
              <button
                type="button"
                onClick={() => setTopicMenuOpen((prev) => !prev)}
                className={`flex w-full items-center justify-between rounded-[20px] border bg-white/85 px-4 py-3 text-left backdrop-blur transition-colors ${
                  topicMenuOpen
                    ? 'border-emerald-400 shadow-[0_18px_60px_-24px_rgba(16,185,129,0.45)]'
                    : 'border-emerald-200 hover:border-emerald-300'
                }`}
                aria-haspopup="menu"
                aria-expanded={topicMenuOpen}
              >
                <div className="min-w-0">
                  <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-emerald-700">
                    Current topic
                  </div>
                  <div className="mt-1 truncate text-sm font-semibold text-gray-900">
                    {selectedTopic.title}
                  </div>
                </div>
                <ChevronDown
                  size={16}
                  className={`ml-3 flex-shrink-0 text-gray-500 transition-transform ${
                    topicMenuOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {topicMenuOpen && (
                <div className="absolute right-0 top-full z-20 mt-3 w-full overflow-hidden rounded-[24px] border border-emerald-100 bg-white/95 p-2 shadow-[0_24px_70px_-28px_rgba(15,23,42,0.4)] backdrop-blur">
                  <div className="max-h-[360px] overflow-y-auto">
                    {LIBRARY_TOPICS.map((topic) => {
                      const TopicIcon = topic.icon
                      const isSelected = topic.id === selectedTopicId

                      return (
                        <button
                          key={topic.id}
                          type="button"
                          onClick={() => handleTopicChange(topic.id)}
                          className={`flex w-full items-start gap-3 rounded-[18px] px-3 py-3 text-left transition-colors ${
                            isSelected
                              ? 'bg-emerald-50 text-emerald-900'
                              : 'text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <div
                            className={`mt-0.5 inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${
                              isSelected ? 'bg-white text-emerald-700' : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            <TopicIcon size={17} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-3">
                              <div className="truncate text-sm font-semibold">{topic.title}</div>
                              {isSelected ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-emerald-700">
                                  <Check size={12} />
                                  Selected
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-1 text-xs leading-5 text-gray-600">
                              {topic.description}
                            </p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          <section className="mt-10">
            <h3 className="text-xs font-medium uppercase tracking-[0.18em] text-gray-500">Why this matters</h3>
            <p className="mt-4 text-lg leading-8 text-gray-800">{selectedTopic.description}</p>
          </section>

          <section className="mt-10">
            <h3 className="text-xs font-medium uppercase tracking-[0.18em] text-gray-500">Core idea</h3>
            <div className="mt-4 space-y-4">
              {selectedTopic.overview.map((paragraph) => (
                <p key={`${selectedTopic.id}-${paragraph.slice(0, 18)}`} className="text-sm leading-7 text-gray-700">
                  {paragraph}
                </p>
              ))}
            </div>
          </section>

          <section className="mt-10">
            <h3 className="text-xs font-medium uppercase tracking-[0.18em] text-gray-500">
              What interviewers look for
            </h3>
            <div className="mt-5 space-y-4">
              {selectedTopic.interviewerLooksFor.map((item) => (
                <div key={`${selectedTopic.id}-${item.slice(0, 20)}`} className="flex items-start gap-3">
                  <CheckCircle2 size={18} className="mt-0.5 flex-shrink-0 text-emerald-600" />
                  <p className="text-sm leading-7 text-gray-700">{item}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-10">
            <h3 className="text-xs font-medium uppercase tracking-[0.18em] text-gray-500">Common misses</h3>
            <div className="mt-5 space-y-4">
              {selectedTopic.commonMistakes.map((item) => (
                <div key={`${selectedTopic.id}-mistake-${item.slice(0, 20)}`} className="flex items-start gap-3">
                  <AlertCircle size={18} className="mt-0.5 flex-shrink-0 text-amber-600" />
                  <p className="text-sm leading-7 text-gray-700">{item}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-10">
            <h3 className="text-xs font-medium uppercase tracking-[0.18em] text-gray-500">
              {selectedTopic.frameworkTitle}
            </h3>
            <div className="mt-5 space-y-5">
              {selectedTopic.frameworkSteps.map((step, index) => (
                <div
                  key={`${selectedTopic.id}-${step.title}`}
                  className="grid gap-3 border-t border-gray-200/80 pt-5 first:border-t-0 first:pt-0 sm:grid-cols-[84px_minmax(0,1fr)]"
                >
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                    Step {index + 1}
                  </div>
                  <div>
                    <h4 className="text-base font-semibold text-gray-900">{step.title}</h4>
                    <p className="mt-2 text-sm leading-7 text-gray-600">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </article>

        <div className="pb-10">
          <PracticeDrillPanel key={selectedTopic.id} topic={selectedTopic} />
        </div>
      </div>
    </div>
  )
}

export default InterviewLibrary

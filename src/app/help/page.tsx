import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Help | Knappi',
  description:
    'Answers to common questions about Knappi sessions, feedback, your library, accounts, and troubleshooting.',
};

type HelpEntry = {
  question: string;
  answer: React.ReactNode;
};

type HelpTopic = {
  title: string;
  entries: HelpEntry[];
};

const helpTopics: HelpTopic[] = [
  {
    title: 'Getting Started',
    entries: [
      {
        question: 'What is Knappi?',
        answer: (
          <p>
            Knappi is a practice tool for technical communication. You explain technical ideas out
            loud in realistic scenarios, and Knappi gives you structured feedback on clarity,
            correctness, depth, and audience fit so you can improve before the real conversation.
          </p>
        ),
      },
      {
        question: 'How do I create an account?',
        answer: (
          <p>
            Head to the <Link className="font-medium text-emerald-700 hover:text-emerald-900" href="/signup">sign up page</Link>{' '}
            and register with your email or continue with Google. Once you are signed in, you can
            start a session right away.
          </p>
        ),
      },
      {
        question: 'Does Knappi cost anything?',
        answer: (
          <p>
            Knappi is currently free to use. If paid plans are introduced in the future, nothing
            changes for you unless you explicitly agree to payment terms at checkout.
          </p>
        ),
      },
    ],
  },
  {
    title: 'Sessions and Scenarios',
    entries: [
      {
        question: 'What kinds of sessions can I run?',
        answer: (
          <p>
            Knappi offers different technical communication scenarios, from interview-style
            questioning to explaining concepts to a specific audience. Pick the scenario that
            matches the pressure you actually face — a hiring manager, a recruiter, a senior
            engineer, or a non-technical stakeholder.
          </p>
        ),
      },
      {
        question: 'How do I customize a session?',
        answer: (
          <p>
            After choosing a scenario, you set the role, audience, topic, and goal for the session.
            Knappi then role-plays that audience, so explaining a database index to a recruiter
            plays out differently than explaining it to a senior engineer.
          </p>
        ),
      },
      {
        question: 'Do I have to speak out loud?',
        answer: (
          <p>
            Speaking is the point — Knappi is built around practicing verbal explanation. Grant your
            browser microphone access when prompted, then talk through your answer naturally.
            Knappi transcribes what you say and tracks clarity, structure, precision, and audience
            fit as you go.
          </p>
        ),
      },
    ],
  },
  {
    title: 'Feedback and Progress',
    entries: [
      {
        question: 'How does grading work?',
        answer: (
          <p>
            When a session ends, Knappi scores it and breaks down what landed, what was missing, and
            how to tighten the explanation for the next attempt. The goal is feedback you can act
            on, not just a number.
          </p>
        ),
      },
      {
        question: 'Where can I see my past sessions?',
        answer: (
          <p>
            Your library keeps your completed sessions, including transcripts and feedback, so you
            can revisit any attempt. The metrics dashboard tracks your scores over time so you can
            see whether you are actually getting better.
          </p>
        ),
      },
      {
        question: 'Is the AI feedback always right?',
        answer: (
          <p>
            No. AI feedback can be inaccurate or incomplete, and it is practice guidance rather than
            a professional assessment. Treat scores as a training signal, not a verdict — see our{' '}
            <Link className="font-medium text-emerald-700 hover:text-emerald-900" href="/ai-disclaimer">AI Disclaimer</Link>{' '}
            for details.
          </p>
        ),
      },
    ],
  },
  {
    title: 'Account and Privacy',
    entries: [
      {
        question: 'How do I reset my password?',
        answer: (
          <p>
            Use the{' '}
            <Link className="font-medium text-emerald-700 hover:text-emerald-900" href="/forgot-password">forgot password page</Link>{' '}
            and we will email you a reset link. If you signed up with Google, sign in with Google
            instead — there is no separate password to reset.
          </p>
        ),
      },
      {
        question: 'How is my data handled?',
        answer: (
          <p>
            Your sessions, transcripts, and feedback are stored so you can review them in your
            library. Our{' '}
            <Link className="font-medium text-emerald-700 hover:text-emerald-900" href="/privacy">Privacy Policy</Link>{' '}
            explains what we collect and how it is used.
          </p>
        ),
      },
      {
        question: 'How do I delete my account?',
        answer: (
          <p>
            You can delete your account from the settings page while signed in. This removes your
            account and its associated data from Knappi.
          </p>
        ),
      },
    ],
  },
  {
    title: 'Troubleshooting',
    entries: [
      {
        question: 'My microphone is not working.',
        answer: (
          <p>
            Check that your browser has permission to use the microphone — look for the mic icon in
            the address bar, or check your browser&apos;s site settings for Knappi. Also confirm the
            correct input device is selected in your system sound settings, then reload the page.
          </p>
        ),
      },
      {
        question: 'A session froze or ended unexpectedly.',
        answer: (
          <p>
            Refresh the page and check your internet connection. Occasional hiccups can come from
            maintenance or provider issues on our side. If a session keeps failing, email us with
            roughly when it happened and what you were doing so we can dig in.
          </p>
        ),
      },
      {
        question: 'Something else is broken.',
        answer: (
          <p>
            Email{' '}
            <a className="font-medium text-emerald-700 hover:text-emerald-900" href="mailto:support@knappi.ca">support@knappi.ca</a>{' '}
            with a description of the problem, the browser you are using, and a screenshot if you
            have one. We read everything.
          </p>
        ),
      },
    ],
  },
];

export default function HelpPage() {
  return (
    <main className="min-h-screen bg-white px-5 pb-20 pt-32 text-left text-gray-800">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/"
          className="mb-10 inline-flex text-sm font-medium text-emerald-700 transition-colors hover:text-emerald-900"
        >
          Back to Knappi
        </Link>

        <header className="border-b border-black/10 pb-10">
          <p className="mb-4 text-sm font-medium uppercase tracking-[0.22em] text-emerald-700">
            Support
          </p>
          <h1 className="text-5xl font-normal leading-tight text-black md:text-6xl">Help</h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-gray-600">
            Answers to common questions about practicing with Knappi, understanding your feedback,
            and managing your account.
          </p>
        </header>

        <div className="mt-12 space-y-12">
          {helpTopics.map((topic) => (
            <section key={topic.title}>
              <h2 className="text-2xl font-medium text-black">{topic.title}</h2>
              <div className="mt-4 space-y-6">
                {topic.entries.map((entry) => (
                  <div key={entry.question}>
                    <h3 className="text-base font-medium text-black">{entry.question}</h3>
                    <div className="mt-2 space-y-4 text-base leading-7 text-gray-700">
                      {entry.answer}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        <footer className="mt-14 border-t border-black/10 pt-8 text-sm leading-6 text-gray-500">
          Can&apos;t find what you need? Email{' '}
          <a className="font-medium text-emerald-700 hover:text-emerald-900" href="mailto:support@knappi.ca">
            support@knappi.ca
          </a>{' '}
          and we&apos;ll help you out.
        </footer>
      </div>
    </main>
  );
}

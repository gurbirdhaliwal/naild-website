import type { Metadata } from 'next';
import LegalDocument from '../components/LegalDocument';

const lastUpdated = 'June 3, 2026';

export const metadata: Metadata = {
  title: 'AI Disclaimer | Knappi',
  description: 'Important limitations of Knappi AI feedback and generated content.',
};

export default function AiDisclaimerPage() {
  return (
    <LegalDocument
      title="AI Disclaimer"
      description="Knappi uses AI to support practice, but AI output has important limitations. Read this before relying on generated feedback, scores, transcripts, or responses."
      lastUpdated={lastUpdated}
      sections={[
        {
          title: 'Practice Tool Only',
          body: (
            <p>
              Knappi is designed to help you practice technical communication. It does not provide
              professional advice, hiring decisions, academic assessment, certification, legal advice,
              financial advice, medical advice, or a guarantee of job, interview, school, or business
              outcomes.
            </p>
          ),
        },
        {
          title: 'AI Can Be Wrong',
          items: [
            'Generated prompts, questions, summaries, feedback, and scores may be inaccurate, incomplete, inconsistent, biased, or outdated.',
            'Transcriptions may mishear names, technical terms, accents, background noise, or unclear audio.',
            'Scores and feedback are subjective practice signals, not authoritative evaluations.',
            'AI responses may confidently state information that is incorrect or not suitable for your context.',
          ],
        },
        {
          title: 'Use Your Judgment',
          body: (
            <p>
              You are responsible for reviewing AI output before using it. Do not rely on Knappi as your
              only source for important career, academic, business, technical, or personal decisions. For
              high-stakes decisions, use qualified human review and trusted source materials.
            </p>
          ),
        },
        {
          title: 'Do Not Submit Sensitive Content',
          body: (
            <p>
              Avoid submitting confidential employer information, source code you are not allowed to share,
              trade secrets, personal health information, financial information, government identifiers,
              passwords, API keys, or other secrets. Practice with realistic but non-confidential examples
              whenever possible.
            </p>
          ),
        },
        {
          title: 'Third-Party AI Providers',
          body: (
            <p>
              Knappi&apos;s production AI backend is configured to use Google Cloud Vertex AI. Content you submit
              for AI features may be processed by third-party AI and cloud providers as needed to provide
              the service. See the Privacy Policy for more detail about data handling.
            </p>
          ),
        },
        {
          title: 'Report Problems',
          body: (
            <p>
              If you see harmful, unsafe, clearly incorrect, or privacy-sensitive AI output, contact{' '}
              <a className="font-medium text-emerald-700 hover:text-emerald-900" href="mailto:support@knappi.ca">
                support@knappi.ca
              </a>
              .
            </p>
          ),
        },
      ]}
    />
  );
}

import type { Metadata } from 'next';
import LegalDocument from '../components/LegalDocument';

const lastUpdated = 'June 3, 2026';

export const metadata: Metadata = {
  title: 'Privacy Policy | Knappi',
  description: 'How Knappi collects, uses, shares, and protects personal information.',
};

export default function PrivacyPolicyPage() {
  return (
    <LegalDocument
      title="Privacy Policy"
      description="This policy explains how Knappi handles personal information when you visit the website, create an account, and use AI-powered technical communication practice features."
      lastUpdated={lastUpdated}
      sections={[
        {
          title: 'Who We Are',
          body: (
            <>
              <p>
                Knappi is a technical communication practice product operated from Toronto, Ontario,
                Canada. For privacy questions, access requests, deletion requests, or complaints, contact
                us at{' '}
                <a className="font-medium text-emerald-700 hover:text-emerald-900" href="mailto:support@knappi.ca">
                  support@knappi.ca
                </a>
                .
              </p>
              <p>
                This policy is intended to support transparency under Canadian private-sector privacy
                principles, including accountability, identifying purposes, consent, limiting collection,
                safeguards, openness, access, and complaint handling.
              </p>
            </>
          ),
        },
        {
          title: 'Information We Collect',
          items: [
            <>
              <strong>Account information:</strong> first name, last name, email address, password hash for
              email/password accounts, authentication provider, account creation date, and password or login
              verification metadata.
            </>,
            <>
              <strong>Google sign-in information:</strong> if you use Google OAuth, we receive basic profile
              information such as email address, given name, and family name from Google.
            </>,
            <>
              <strong>Practice content:</strong> session titles, roles, selected languages, difficulty,
              session type, practice mode, audience, topic, prompts, questions, messages, transcripts,
              answers, AI feedback, grading results, current session progress, and timestamps.
            </>,
            <>
              <strong>Audio:</strong> when you record an answer, your browser sends the audio file to
              Knappi&apos;s AI service for transcription. The current service processes temporary audio files and
              removes them after processing. The resulting transcript may be saved as part of your practice
              session.
            </>,
            <>
              <strong>Camera preview:</strong> some practice screens may request camera access for a local
              on-screen preview. The current app does not upload or store video from that preview.
            </>,
            <>
              <strong>Device and usage data:</strong> IP address or request source, browser request
              metadata, rate-limit events, error logs, security logs, and basic operational diagnostics.
            </>,
            <>
              <strong>Local browser storage:</strong> local storage may store practice settings, tutorial
              completion flags, and logout/session-expiry broadcast markers. Session storage may store a
              temporary OAuth redirect path.
            </>,
          ],
        },
        {
          title: 'How We Use Information',
          items: [
            'Create, authenticate, secure, and manage user accounts.',
            'Send account emails, including signup verification, password reset, and password-change notices.',
            'Generate practice prompts, interview questions, AI responses, transcripts, feedback, grading, and session recaps.',
            'Save and display your practice history, session progress, messages, transcripts, and results.',
            'Maintain product security, prevent abuse, enforce rate limits, debug errors, and improve reliability.',
            'Respond to support, privacy, legal, or account deletion requests.',
            'Comply with legal obligations and enforce our Terms of Service.',
          ],
        },
        {
          title: 'Consent and Choices',
          body: (
            <>
              <p>
                By creating an account or using Knappi, you consent to the collection, use, and disclosure
                of information described in this policy for the purposes explained here. Some information is
                necessary for the service to function, such as authentication cookies, account information,
                and practice content submitted for AI processing.
              </p>
              <p>
                You can choose not to provide optional practice inputs, microphone access, or camera access.
                You can withdraw consent by stopping use of the service or asking us to delete your account,
                subject to information we may need to retain for legal, security, or legitimate operational
                purposes.
              </p>
            </>
          ),
        },
        {
          title: 'AI Processing and Service Providers',
          body: (
            <>
              <p>
                Knappi uses AI systems to transcribe audio, generate practice prompts and questions, respond
                in simulated conversations, evaluate answers, and summarize or grade sessions. In production,
                the AI backend is configured to use Google Cloud Vertex AI. We may also use cloud hosting,
                database, email delivery, logging, security, and authentication providers to operate the
                service.
              </p>
              <p>
                Practice content sent to AI providers may include prompts, topics, audience selections,
                transcripts, answers, prior conversation context, and feedback requests. We do not knowingly
                ask you to submit highly sensitive personal information, and you should avoid including
                secrets, confidential employer information, financial data, health information, or government
                identifiers in practice answers.
              </p>
            </>
          ),
        },
        {
          title: 'Cookies and Similar Technologies',
          body: (
            <>
              <p>
                Knappi currently uses essential cookies for authentication and security, including an
                HTTP-only session token cookie and a CSRF token cookie. These cookies are required to keep
                you signed in and protect requests.
              </p>
              <p>
                We did not identify advertising, analytics, or cross-site behavioural tracking cookies in
                the current app. If Knappi later adds non-essential analytics, advertising, or similar
                tracking technologies, we should update this policy and provide any required notice or
                consent controls before using them.
              </p>
            </>
          ),
        },
        {
          title: 'How We Share Information',
          items: [
            'With service providers that help operate Knappi, including hosting, database, AI, email, logging, security, and authentication providers.',
            'With Google when you choose Google sign-in, according to Google OAuth flows and Google account settings.',
            'When required by law, legal process, regulators, or to protect the rights, safety, and security of Knappi, users, or others.',
            'In connection with a business transaction such as a merger, financing, acquisition, or sale of assets, subject to appropriate confidentiality or notice where required.',
          ],
        },
        {
          title: 'Retention',
          body: (
            <>
              <p>
                We keep account information while your account is active. We keep saved interviews, practice
                messages, transcripts, prompts, and grading results until you delete the session, delete your
                account, or we remove them under our retention practices. Temporary audio files are intended
                to be deleted after transcription processing. Verification and password reset tokens expire
                after a limited time.
              </p>
              <p>
                We may retain limited logs, backups, security records, or legal records for longer where
                reasonably necessary for security, fraud prevention, dispute resolution, legal compliance, or
                service recovery.
              </p>
            </>
          ),
        },
        {
          title: 'Security',
          body: (
            <p>
              We use technical and organizational safeguards designed to protect personal information,
              including hashed passwords for local accounts, HTTP-only authentication cookies, access
              controls, rate limits, request size limits, and restricted CORS configuration. No internet
              service can guarantee perfect security, so you should use a strong unique password and keep
              your account credentials private.
            </p>
          ),
        },
        {
          title: 'Access, Correction, and Deletion',
          body: (
            <p>
              You can view and update certain profile information in account settings, and you can delete
              your account from the settings page. You may also contact{' '}
              <a className="font-medium text-emerald-700 hover:text-emerald-900" href="mailto:support@knappi.ca">
                support@knappi.ca
              </a>{' '}
              to request access, correction, deletion, or information about our privacy practices. We may
              need to verify your identity before acting on a request.
            </p>
          ),
        },
        {
          title: 'Children and Students',
          body: (
            <p>
              Knappi is not intended for children under 13. If you are under the age of majority where you
              live, use Knappi only with permission from a parent, guardian, school, or other authorized
              adult as applicable. If we learn that we collected personal information from a child without
              appropriate consent, we will take reasonable steps to delete it.
            </p>
          ),
        },
        {
          title: 'International Processing',
          body: (
            <p>
              Knappi and its providers may process or store information in Canada, the United States, or
              other locations where our service providers operate. Information processed outside your
              province or country may be subject to local laws and lawful access requests.
            </p>
          ),
        },
        {
          title: 'Changes to This Policy',
          body: (
            <p>
              We may update this policy as Knappi changes. If we make material changes, we will update the
              date above and provide additional notice where appropriate.
            </p>
          ),
        },
      ]}
    />
  );
}

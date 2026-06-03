import type { Metadata } from 'next';
import LegalDocument from '../components/LegalDocument';

const lastUpdated = 'June 3, 2026';

export const metadata: Metadata = {
  title: 'Terms of Service | Knappi',
  description: 'The terms that govern access to and use of Knappi.',
};

export default function TermsOfServicePage() {
  return (
    <LegalDocument
      title="Terms of Service"
      description="These terms govern your access to and use of Knappi, including account features, AI-powered practice sessions, transcripts, feedback, and related website features."
      lastUpdated={lastUpdated}
      sections={[
        {
          title: 'Acceptance',
          body: (
            <p>
              By accessing or using Knappi, you agree to these Terms of Service and our Privacy Policy. If
              you do not agree, do not use Knappi. If you use Knappi on behalf of an organization, you
              represent that you have authority to bind that organization.
            </p>
          ),
        },
        {
          title: 'What Knappi Provides',
          body: (
            <p>
              Knappi provides AI-assisted practice for technical communication, interview preparation,
              explanation drills, and related feedback. Knappi may generate prompts, questions,
              transcriptions, simulated conversation, scoring, summaries, and recommendations.
            </p>
          ),
        },
        {
          title: 'Accounts',
          items: [
            'You must provide accurate account information and keep it current.',
            'You are responsible for maintaining the confidentiality of your login credentials and for activity under your account.',
            'You must notify us promptly at support@knappi.ca if you believe your account has been compromised.',
            'We may suspend or terminate accounts that violate these terms, create security risk, or misuse the service.',
          ],
        },
        {
          title: 'Acceptable Use',
          items: [
            'Do not use Knappi for unlawful, harmful, abusive, deceptive, infringing, or security-compromising activity.',
            'Do not submit content that you do not have the right to use, including confidential employer, school, client, or third-party information.',
            'Do not attempt to reverse engineer, scrape, overload, bypass rate limits, probe, or interfere with Knappi systems.',
            'Do not use Knappi to generate malware, exploit instructions, harassment, discriminatory content, or other harmful material.',
            'Do not misrepresent AI-generated practice output as a guaranteed assessment, certification, or hiring decision.',
          ],
        },
        {
          title: 'Your Content',
          body: (
            <>
              <p>
                You retain ownership of content you submit, such as topics, prompts, answers, recordings,
                transcripts, and messages. You grant Knappi a limited license to host, process, transmit,
                display, reproduce, and create derivative outputs from your content as needed to provide,
                secure, support, and improve the service.
              </p>
              <p>
                You are responsible for your content and for ensuring that you have the rights and consents
                needed to submit it to Knappi.
              </p>
            </>
          ),
        },
        {
          title: 'AI Output and No Professional Advice',
          body: (
            <p>
              AI output may be inaccurate, incomplete, biased, or unsuitable for your situation. Knappi is a
              practice tool, not a professional advisor, academic evaluator, employer, recruiter, legal
              advisor, financial advisor, medical advisor, or guarantee of interview, employment, academic,
              or business results. You are responsible for reviewing and deciding how to use any output.
            </p>
          ),
        },
        {
          title: 'Plans and Payments',
          body: (
            <p>
              Knappi may show free and upcoming paid plans. Unless a paid checkout is made available and you
              agree to payment terms at purchase, no paid subscription is created. Future paid features may
              have additional pricing, renewal, cancellation, refund, tax, and payment processor terms.
            </p>
          ),
        },
        {
          title: 'Third-Party Services',
          body: (
            <p>
              Knappi may depend on third-party services, including Google OAuth, cloud hosting, AI, email,
              database, and security providers. Your use of third-party sign-in or integrations may also be
              governed by those providers&apos; terms and privacy policies.
            </p>
          ),
        },
        {
          title: 'Intellectual Property',
          body: (
            <p>
              Knappi, including its software, interface, branding, graphics, and service design, is owned by
              Knappi or its licensors and is protected by intellectual property laws. These terms do not
              grant you ownership of Knappi or permission to use Knappi branding except as needed to use the
              service normally.
            </p>
          ),
        },
        {
          title: 'Service Changes and Availability',
          body: (
            <p>
              We may modify, suspend, or discontinue features at any time. Knappi may be unavailable,
              delayed, or degraded because of maintenance, outages, provider issues, rate limits, or other
              operational constraints.
            </p>
          ),
        },
        {
          title: 'Disclaimers',
          body: (
            <p>
              Knappi is provided on an &quot;as is&quot; and &quot;as available&quot; basis. To the maximum extent permitted by
              law, we disclaim warranties of merchantability, fitness for a particular purpose,
              non-infringement, accuracy, availability, and error-free operation.
            </p>
          ),
        },
        {
          title: 'Limitation of Liability',
          body: (
            <p>
              To the maximum extent permitted by law, Knappi will not be liable for indirect, incidental,
              special, consequential, exemplary, or punitive damages, or for lost profits, lost data,
              business interruption, or reliance on AI output. Our aggregate liability for claims relating
              to Knappi will be limited to the greater of CAD $100 or the amount you paid to Knappi for the
              service in the three months before the claim.
            </p>
          ),
        },
        {
          title: 'Indemnity',
          body: (
            <p>
              You agree to indemnify and hold Knappi harmless from claims, losses, liabilities, damages,
              costs, and expenses arising from your content, your use of the service, your violation of
              these terms, or your violation of another person&apos;s rights.
            </p>
          ),
        },
        {
          title: 'Termination',
          body: (
            <p>
              You may stop using Knappi at any time and may delete your account from settings. We may
              suspend or terminate access if we reasonably believe you violated these terms, created risk,
              or used the service unlawfully.
            </p>
          ),
        },
        {
          title: 'Governing Law',
          body: (
            <p>
              These terms are governed by the laws of Ontario and the federal laws of Canada that apply
              there, without regard to conflict of law rules. Courts located in Ontario will have exclusive
              jurisdiction, except where applicable law requires otherwise.
            </p>
          ),
        },
        {
          title: 'Changes to These Terms',
          body: (
            <p>
              We may update these terms as Knappi changes. If changes are material, we will provide notice
              where appropriate. Continued use after updated terms are posted means you accept the updated
              terms.
            </p>
          ),
        },
      ]}
    />
  );
}

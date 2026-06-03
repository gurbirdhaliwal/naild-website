import type { Metadata } from 'next';
import LegalDocument from '../components/LegalDocument';

const lastUpdated = 'June 3, 2026';

export const metadata: Metadata = {
  title: 'Cookie Notice | Knappi',
  description: 'How Knappi uses cookies and browser storage.',
};

export default function CookieNoticePage() {
  return (
    <LegalDocument
      title="Cookie Notice"
      description="This notice explains how Knappi uses cookies and browser storage on the website and app."
      lastUpdated={lastUpdated}
      sections={[
        {
          title: 'What Cookies Are',
          body: (
            <p>
              Cookies are small pieces of data stored by your browser. Similar technologies include local
              storage and session storage. They can keep you signed in, remember preferences, secure
              requests, or support analytics and advertising.
            </p>
          ),
        },
        {
          title: 'Cookies Knappi Uses',
          items: [
            <>
              <strong>Session token cookie:</strong> an essential HTTP-only cookie used to keep you signed
              in and authenticate requests.
            </>,
            <>
              <strong>CSRF token cookie:</strong> an essential security cookie used to help protect against
              cross-site request forgery.
            </>,
          ],
        },
        {
          title: 'Browser Storage Knappi Uses',
          items: [
            'Local storage may store practice settings, tutorial completion flags, logout broadcast markers, and session-expiry broadcast markers.',
            'Session storage may store a temporary OAuth redirect path so you return to the right page after sign-in.',
          ],
        },
        {
          title: 'Analytics and Advertising',
          body: (
            <p>
              Knappi currently does not appear to use non-essential analytics, advertising, retargeting, or
              behavioural tracking cookies. If we add those technologies later, we should update this notice
              and provide any required consent controls before using them.
            </p>
          ),
        },
        {
          title: 'Your Choices',
          body: (
            <p>
              You can block or delete cookies in your browser settings. Blocking essential cookies may
              prevent login, account management, practice sessions, and security features from working
              correctly. You can clear local storage and session storage from your browser, but doing so may
              reset preferences or sign-in redirect state.
            </p>
          ),
        },
        {
          title: 'Contact',
          body: (
            <p>
              Questions about cookies or browser storage can be sent to{' '}
              <a className="font-medium text-emerald-700 hover:text-emerald-900" href="mailto:support@knappi.ca">
                support@knappi.ca
              </a>
              .
            </p>
          ),
        },
      ]}
    >
      Based on the current app code, Knappi uses essential authentication and security cookies. We did not
      identify advertising cookies, analytics cookies, or cross-site behavioural tracking cookies in the
      current frontend.
    </LegalDocument>
  );
}

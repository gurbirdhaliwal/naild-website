import Link from 'next/link';
import type { ReactNode } from 'react';

type LegalSection = {
  title: string;
  body?: ReactNode;
  items?: ReactNode[];
};

type LegalDocumentProps = {
  title: string;
  description: string;
  lastUpdated: string;
  children?: ReactNode;
  sections: LegalSection[];
};

export default function LegalDocument({
  title,
  description,
  lastUpdated,
  children,
  sections,
}: LegalDocumentProps) {
  return (
    <main className="min-h-screen bg-white px-5 pb-20 pt-32 font-['Space_Grotesk'] text-left text-gray-800">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/"
          className="mb-10 inline-flex text-sm font-medium text-emerald-700 transition-colors hover:text-emerald-900"
        >
          Back to Knappi
        </Link>

        <header className="border-b border-black/10 pb-10">
          <p className="mb-4 text-sm font-medium uppercase tracking-[0.22em] text-emerald-700">
            Legal
          </p>
          <h1 className="text-5xl font-normal leading-tight text-black md:text-6xl">{title}</h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-gray-600">{description}</p>
          <p className="mt-6 text-sm text-gray-500">Last updated: {lastUpdated}</p>
        </header>

        {children ? (
          <div className="mt-8 rounded-lg border border-emerald-100 bg-emerald-50 p-5 text-base leading-7 text-emerald-950">
            {children}
          </div>
        ) : null}

        <div className="mt-12 space-y-12">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-2xl font-medium text-black">{section.title}</h2>
              {section.body ? (
                <div className="mt-4 space-y-4 text-base leading-7 text-gray-700">{section.body}</div>
              ) : null}
              {section.items ? (
                <ul className="mt-4 space-y-3 text-base leading-7 text-gray-700">
                  {section.items.map((item, index) => (
                    <li key={index} className="pl-1">
                      {item}
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
        </div>

        <footer className="mt-14 border-t border-black/10 pt-8 text-sm leading-6 text-gray-500">
          Questions about these terms or policies can be sent to{' '}
          <a className="font-medium text-emerald-700 hover:text-emerald-900" href="mailto:support@knappi.ca">
            support@knappi.ca
          </a>
          .
        </footer>
      </div>
    </main>
  );
}

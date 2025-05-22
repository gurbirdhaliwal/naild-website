import { CheckIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

const tiers = [
  {
    name: 'Free Trial',
    price: '0',
    description: 'Perfect for trying out our platform',
    features: [
      '3 practice interviews',
      'Basic facial expression analysis',
      'Basic voice analysis',
      'Limited question bank',
      'Email support',
    ],
    cta: 'Start Free Trial',
    href: '/signup',
    mostPopular: false,
  },
  {
    name: 'Pro',
    price: '29',
    description: 'Everything you need to ace your interviews',
    features: [
      'Unlimited practice interviews',
      'Advanced facial expression analysis',
      'Advanced voice analysis',
      'Full question bank access',
      'Detailed performance analytics',
      'Priority email support',
      'Interview recording library',
    ],
    cta: 'Get Started',
    href: '/signup?plan=pro',
    mostPopular: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    description: 'For organizations and career centers',
    features: [
      'Everything in Pro',
      'Custom question bank',
      'Bulk user management',
      'Progress tracking dashboard',
      'API access',
      'Dedicated support',
      'Custom branding',
    ],
    cta: 'Contact Sales',
    href: '/contact',
    mostPopular: false,
  },
];

export default function Pricing() {
  return (
    <div className="bg-gray-50 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            Simple, transparent pricing
          </h1>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            Choose the perfect plan to help you master your interview skills and land your dream job.
          </p>
        </div>
        <div className="isolate mx-auto mt-16 grid max-w-6xl grid-cols-1 gap-8 sm:mt-20 lg:grid-cols-3">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`rounded-3xl p-8 ring-1 ring-gray-200 ${
                tier.mostPopular
                  ? 'bg-white shadow-xl'
                  : 'bg-white/60'
              }`}
            >
              <h3
                className={`text-lg font-semibold leading-8 ${
                  tier.mostPopular ? 'text-green-600' : 'text-gray-900'
                }`}
              >
                {tier.name}
              </h3>
              <p className="mt-4 text-sm leading-6 text-gray-600">{tier.description}</p>
              <p className="mt-6 flex items-baseline gap-x-1">
                {tier.price === 'Custom' ? (
                  <span className="text-4xl font-bold tracking-tight text-gray-900">Custom</span>
                ) : (
                  <>
                    <span className="text-4xl font-bold tracking-tight text-gray-900">${tier.price}</span>
                    <span className="text-sm font-semibold leading-6 text-gray-600">/month</span>
                  </>
                )}
              </p>
              <ul role="list" className="mt-8 space-y-3 text-sm leading-6 text-gray-600">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex gap-x-3">
                    <CheckIcon className="h-6 w-5 flex-none text-green-600" aria-hidden="true" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Link
                href={tier.href}
                className={`mt-8 block rounded-md px-3 py-2 text-center text-sm font-semibold leading-6 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
                  tier.mostPopular
                    ? 'bg-green-600 text-white shadow hover:bg-green-500 focus-visible:outline-green-600'
                    : 'bg-white text-green-600 ring-1 ring-inset ring-green-200 hover:ring-green-300'
                }`}
              >
                {tier.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
      
      {/* FAQ Section */}
      <div className="mx-auto max-w-7xl px-6 lg:px-8 mt-24">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-12">
            Frequently Asked Questions
          </h2>
          <dl className="space-y-8">
            <div>
              <dt className="text-lg font-semibold text-gray-900">
                How does the free trial work?
              </dt>
              <dd className="mt-3 text-gray-600">
                The free trial gives you access to 3 practice interviews with basic AI feedback. No credit card required.
              </dd>
            </div>
            <div>
              <dt className="text-lg font-semibold text-gray-900">
                Can I cancel my subscription anytime?
              </dt>
              <dd className="mt-3 text-gray-600">
                Yes, you can cancel your subscription at any time. You'll continue to have access until the end of your billing period.
              </dd>
            </div>
            <div>
              <dt className="text-lg font-semibold text-gray-900">
                What kind of support do you offer?
              </dt>
              <dd className="mt-3 text-gray-600">
                We offer email support for all plans, with priority support for Pro users and dedicated support for Enterprise customers.
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
} 
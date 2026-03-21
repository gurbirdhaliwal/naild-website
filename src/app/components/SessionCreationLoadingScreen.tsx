import React from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { MessageSquare } from 'lucide-react'

type SessionCreationVariant = 'behavioral' | 'communication'

interface SessionCreationLoadingScreenProps {
  variant: SessionCreationVariant
  statusMessage: string
  resolvedTheme: 'light' | 'dark'
}

const variantCopy: Record<
  SessionCreationVariant,
  {
    title: string
  }
> = {
  behavioral: {
    title: 'Building your behavioral session',
  },
  communication: {
    title: 'Building your role-specific drill',
  },
}

const shellStyles: Record<SessionCreationVariant, Record<'light' | 'dark', React.CSSProperties>> = {
  behavioral: {
    light: {
      backgroundImage:
        'radial-gradient(circle at top, rgba(209,250,229,0.95), rgba(255,255,255,0.98) 52%, rgba(236,253,245,0.9) 100%)',
      borderColor: 'rgba(167,243,208,0.95)',
    },
    dark: {
      backgroundImage:
        'radial-gradient(circle at top, rgba(16,185,129,0.16), rgba(7,18,14,0.98) 54%, rgba(8,27,21,0.94) 100%)',
      borderColor: 'rgba(16,185,129,0.28)',
    },
  },
  communication: {
    light: {
      backgroundImage:
        'radial-gradient(circle at top, rgba(209,250,229,0.95), rgba(255,255,255,0.98) 52%, rgba(236,253,245,0.9) 100%)',
      borderColor: 'rgba(167,243,208,0.95)',
    },
    dark: {
      backgroundImage:
        'radial-gradient(circle at top, rgba(16,185,129,0.16), rgba(7,18,14,0.98) 54%, rgba(8,27,21,0.94) 100%)',
      borderColor: 'rgba(16,185,129,0.28)',
    },
  },
}

const SessionCreationLoadingScreen: React.FC<SessionCreationLoadingScreenProps> = ({
  variant,
  statusMessage,
  resolvedTheme,
}) => {
  const prefersReducedMotion = useReducedMotion()
  const copy = variantCopy[variant]
  const shellStyle = shellStyles[variant][resolvedTheme]
  const statusBaseStyle = {
    color: resolvedTheme === 'dark' ? 'rgba(203,213,225,0.38)' : 'rgba(107,114,128,0.35)',
  }
  const statusWaveStyle = {
    backgroundSize: '260% 100%',
    backgroundImage:
      resolvedTheme === 'dark'
        ? 'linear-gradient(90deg, rgba(226,232,240,0.02) 0%, rgba(226,232,240,0.1) 24%, rgba(236,253,245,0.98) 50%, rgba(226,232,240,0.1) 76%, rgba(226,232,240,0.02) 100%)'
        : 'linear-gradient(90deg, rgba(107,114,128,0.02) 0%, rgba(107,114,128,0.08) 24%, rgba(31,41,55,0.98) 50%, rgba(107,114,128,0.08) 76%, rgba(107,114,128,0.02) 100%)',
  }
  const outerRingClassName =
    resolvedTheme === 'dark' ? 'border-emerald-700/45' : 'border-emerald-200/80'
  const innerRingClassName =
    resolvedTheme === 'dark' ? 'border-emerald-500/35' : 'border-emerald-300/70'
  const centerCardClassName =
    resolvedTheme === 'dark'
      ? 'border-emerald-900/40 bg-slate-950/72 shadow-[0_18px_60px_-24px_rgba(0,0,0,0.55)]'
      : 'border-white/90 bg-white/90 shadow-[0_18px_60px_-24px_rgba(15,23,42,0.35)]'
  const messageIconClassName = resolvedTheme === 'dark' ? 'text-emerald-300' : 'text-emerald-700'
  const orbitDotClassNames =
    resolvedTheme === 'dark'
      ? [
          'bg-emerald-400 shadow-[0_0_0_6px_rgba(52,211,153,0.16)]',
          'bg-emerald-300 shadow-[0_0_0_5px_rgba(110,231,183,0.14)]',
          'bg-teal-300 shadow-[0_0_0_6px_rgba(94,234,212,0.14)]',
        ]
      : [
          'bg-emerald-500 shadow-[0_0_0_6px_rgba(16,185,129,0.12)]',
          'bg-emerald-300 shadow-[0_0_0_5px_rgba(110,231,183,0.14)]',
          'bg-teal-400 shadow-[0_0_0_6px_rgba(45,212,191,0.12)]',
        ]

  return (
    <div className="flex h-full min-h-full items-center justify-center py-6">
      <div
        className="mx-auto w-full max-w-3xl overflow-hidden rounded-[32px] border"
        style={shellStyle}
      >
        <div className="px-6 py-8 sm:px-8 sm:py-10">
          <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
            <div>
              <h2 className="text-3xl font-medium tracking-tight text-gray-950 sm:text-[2rem]">
                {copy.title}
              </h2>

              <div aria-live="polite" className="mt-4">
                <span
                  className="relative inline-block text-base font-medium italic"
                  style={statusBaseStyle}
                >
                  {statusMessage}
                  <motion.span
                    aria-hidden="true"
                    className="absolute inset-0 italic text-transparent bg-clip-text"
                    style={statusWaveStyle}
                    animate={
                      prefersReducedMotion
                        ? undefined
                        : {
                            backgroundPosition: ['140% 0%', '-40% 0%'],
                          }
                    }
                    transition={{ duration: 1.45, repeat: Infinity, ease: 'linear' }}
                  >
                    {statusMessage}
                  </motion.span>
                </span>
              </div>
            </div>

            <div className="relative">
              <div className="relative mx-auto flex h-52 w-52 items-center justify-center">
                <motion.div
                  aria-hidden="true"
                  className={`absolute h-52 w-52 rounded-full border ${outerRingClassName}`}
                  animate={
                    prefersReducedMotion
                      ? undefined
                      : {
                          scale: [1, 1.04, 1],
                          opacity: [0.45, 0.8, 0.45],
                        }
                  }
                  transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
                />
                <motion.div
                  aria-hidden="true"
                  className={`absolute h-36 w-36 rounded-full border ${innerRingClassName}`}
                  animate={
                    prefersReducedMotion
                      ? undefined
                      : {
                          scale: [1.04, 1, 1.04],
                          opacity: [0.85, 0.5, 0.85],
                        }
                  }
                  transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                />
                <motion.div
                  aria-hidden="true"
                  className="absolute h-full w-full"
                  animate={prefersReducedMotion ? undefined : { rotate: 360 }}
                  transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
                >
                  <span
                    className={`absolute left-1/2 top-2 h-3 w-3 -translate-x-1/2 rounded-full ${orbitDotClassNames[0]}`}
                  />
                  <span
                    className={`absolute bottom-7 left-5 h-2.5 w-2.5 rounded-full ${orbitDotClassNames[1]}`}
                  />
                  <span
                    className={`absolute bottom-10 right-6 h-3 w-3 rounded-full ${orbitDotClassNames[2]}`}
                  />
                </motion.div>
                <div
                  className={`relative flex h-24 w-24 items-center justify-center rounded-[28px] border ${centerCardClassName}`}
                >
                  <MessageSquare size={34} className={messageIconClassName} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SessionCreationLoadingScreen

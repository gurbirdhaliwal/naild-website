'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'

export interface WorkspaceTutorialStep {
  id: string
  target?: string
  title: string
  description: string
  placement?: 'auto' | 'right' | 'left' | 'top' | 'bottom'
}

interface WorkspaceTutorialProps {
  open: boolean
  steps: WorkspaceTutorialStep[]
  currentStepIndex: number
  onNext: () => void
  onPrevious: () => void
  onClose: () => void
  resolvedTheme: 'light' | 'dark'
}

interface TutorialRect {
  top: number
  left: number
  width: number
  height: number
  radius: number
}

interface TutorialLayout {
  viewport: {
    width: number
    height: number
  }
  highlight: TutorialRect
  popover: {
    top: number
    left: number
    width: number
  }
}

const VIEWPORT_PADDING = 16
const POPOVER_GAP = 18
const DEFAULT_POPOVER_HEIGHT = 252

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

const fitsOnRight = (rect: DOMRect, popoverWidth: number, viewportWidth: number) =>
  rect.right + POPOVER_GAP + popoverWidth <= viewportWidth - VIEWPORT_PADDING

const fitsOnLeft = (rect: DOMRect, popoverWidth: number) =>
  rect.left - POPOVER_GAP - popoverWidth >= VIEWPORT_PADDING

const fitsOnBottom = (rect: DOMRect, viewportHeight: number, popoverHeight: number) =>
  rect.bottom + POPOVER_GAP + popoverHeight <= viewportHeight - VIEWPORT_PADDING

const fitsOnTop = (rect: DOMRect, popoverHeight: number) =>
  rect.top - POPOVER_GAP - popoverHeight >= VIEWPORT_PADDING

const resolvePlacement = (
  requested: WorkspaceTutorialStep['placement'],
  rect: DOMRect,
  popoverWidth: number,
  viewportWidth: number,
  viewportHeight: number,
  popoverHeight: number
) => {
  if (requested === 'right' && fitsOnRight(rect, popoverWidth, viewportWidth)) return 'right'
  if (requested === 'left' && fitsOnLeft(rect, popoverWidth)) return 'left'
  if (requested === 'bottom' && fitsOnBottom(rect, viewportHeight, popoverHeight)) return 'bottom'
  if (requested === 'top' && fitsOnTop(rect, popoverHeight)) return 'top'

  if (fitsOnRight(rect, popoverWidth, viewportWidth)) return 'right'
  if (fitsOnLeft(rect, popoverWidth)) return 'left'
  if (fitsOnBottom(rect, viewportHeight, popoverHeight)) return 'bottom'
  if (fitsOnTop(rect, popoverHeight)) return 'top'

  return 'bottom'
}

const getLayout = (
  rect: DOMRect,
  placement: ReturnType<typeof resolvePlacement>,
  viewportWidth: number,
  viewportHeight: number,
  popoverHeight: number,
  borderRadius: number
): TutorialLayout => {
  const safePopoverHeight = Math.min(
    Math.max(popoverHeight, DEFAULT_POPOVER_HEIGHT),
    viewportHeight - VIEWPORT_PADDING * 2
  )
  const highlightTop = clamp(rect.top, 0, viewportHeight)
  const highlightLeft = clamp(rect.left, 0, viewportWidth)
  const highlight = {
    top: highlightTop,
    left: highlightLeft,
    width: clamp(rect.width, 0, viewportWidth - highlightLeft),
    height: clamp(rect.height, 0, viewportHeight - highlightTop),
    radius: Math.max(0, Math.min(borderRadius, rect.width / 2, rect.height / 2)),
  }

  const popoverWidth = Math.min(360, viewportWidth - VIEWPORT_PADDING * 2)

  if (placement === 'right') {
    return {
      viewport: {
        width: viewportWidth,
        height: viewportHeight,
      },
      highlight,
      popover: {
        top: clamp(
          rect.top + rect.height / 2 - safePopoverHeight / 2,
          VIEWPORT_PADDING,
          viewportHeight - safePopoverHeight - VIEWPORT_PADDING
        ),
        left: clamp(
          rect.right + POPOVER_GAP,
          VIEWPORT_PADDING,
          viewportWidth - popoverWidth - VIEWPORT_PADDING
        ),
        width: popoverWidth,
      },
    }
  }

  if (placement === 'left') {
    return {
      viewport: {
        width: viewportWidth,
        height: viewportHeight,
      },
      highlight,
      popover: {
        top: clamp(
          rect.top + rect.height / 2 - safePopoverHeight / 2,
          VIEWPORT_PADDING,
          viewportHeight - safePopoverHeight - VIEWPORT_PADDING
        ),
        left: clamp(
          rect.left - POPOVER_GAP - popoverWidth,
          VIEWPORT_PADDING,
          viewportWidth - popoverWidth - VIEWPORT_PADDING
        ),
        width: popoverWidth,
      },
    }
  }

  if (placement === 'top') {
    return {
      viewport: {
        width: viewportWidth,
        height: viewportHeight,
      },
      highlight,
      popover: {
        top: clamp(
          rect.top - POPOVER_GAP - safePopoverHeight,
          VIEWPORT_PADDING,
          viewportHeight - safePopoverHeight - VIEWPORT_PADDING
        ),
        left: clamp(
          rect.left + rect.width / 2 - popoverWidth / 2,
          VIEWPORT_PADDING,
          viewportWidth - popoverWidth - VIEWPORT_PADDING
        ),
        width: popoverWidth,
      },
    }
  }

  return {
    viewport: {
      width: viewportWidth,
      height: viewportHeight,
    },
    highlight,
    popover: {
      top: clamp(
        rect.bottom + POPOVER_GAP,
        VIEWPORT_PADDING,
        viewportHeight - safePopoverHeight - VIEWPORT_PADDING
      ),
      left: clamp(
        rect.left + rect.width / 2 - popoverWidth / 2,
        VIEWPORT_PADDING,
        viewportWidth - popoverWidth - VIEWPORT_PADDING
      ),
      width: popoverWidth,
    },
  }
}

export default function WorkspaceTutorial({
  open,
  steps,
  currentStepIndex,
  onNext,
  onPrevious,
  onClose,
  resolvedTheme,
}: WorkspaceTutorialProps) {
  const [layout, setLayout] = useState<TutorialLayout | null>(null)
  const [popoverHeight, setPopoverHeight] = useState(DEFAULT_POPOVER_HEIGHT)
  const popoverRef = useRef<HTMLDivElement | null>(null)

  const currentStep = useMemo(
    () => steps[currentStepIndex] ?? null,
    [currentStepIndex, steps]
  )

  useEffect(() => {
    if (!open || !currentStep) {
      setLayout(null)
      return
    }

    let animationFrameId = 0
    let retries = 0

    const updateLayout = () => {
      if (!currentStep) return
      if (!currentStep.target) {
        setLayout(null)
        return
      }

      const target = document.querySelector<HTMLElement>(currentStep.target)
      if (!target) {
        setLayout(null)
        if (retries < 30) {
          retries += 1
          animationFrameId = window.requestAnimationFrame(updateLayout)
        }
        return
      }

      const rect = target.getBoundingClientRect()
      const targetStyle = window.getComputedStyle(target)
      const borderRadius = Number.parseFloat(targetStyle.borderRadius) || 0
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight
      const popoverWidth = Math.min(360, viewportWidth - VIEWPORT_PADDING * 2)
      const placement = resolvePlacement(
        currentStep.placement ?? 'auto',
        rect,
        popoverWidth,
        viewportWidth,
        viewportHeight,
        popoverHeight
      )

      setLayout(getLayout(rect, placement, viewportWidth, viewportHeight, popoverHeight, borderRadius))
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }

      if (event.key === 'ArrowRight' || event.key === 'Enter') {
        event.preventDefault()
        onNext()
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        onPrevious()
      }
    }

    animationFrameId = window.requestAnimationFrame(updateLayout)
    window.addEventListener('resize', updateLayout)
    document.addEventListener('scroll', updateLayout, true)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      window.cancelAnimationFrame(animationFrameId)
      window.removeEventListener('resize', updateLayout)
      document.removeEventListener('scroll', updateLayout, true)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [currentStep, onClose, onNext, onPrevious, open, popoverHeight])

  useEffect(() => {
    if (!open || !popoverRef.current) return

    const popoverElement = popoverRef.current
    const updatePopoverHeight = () => {
      const nextHeight = Math.ceil(popoverElement.getBoundingClientRect().height)
      setPopoverHeight((currentHeight) =>
        Math.abs(currentHeight - nextHeight) > 1 ? nextHeight : currentHeight
      )
    }

    updatePopoverHeight()

    if (typeof ResizeObserver === 'undefined') return

    const observer = new ResizeObserver(() => {
      updatePopoverHeight()
    })
    observer.observe(popoverElement)

    return () => observer.disconnect()
  }, [currentStep, open])

  if (!open || !currentStep) {
    return null
  }

  const isLastStep = currentStepIndex === steps.length - 1
  const isDark = resolvedTheme === 'dark'
  const isCenteredStep = !layout
  const overlayTone = isDark ? 'rgba(2, 6, 23, 0.68)' : 'rgba(15, 23, 42, 0.4)'
  const overlayBlur = isDark ? 'blur(4px)' : 'blur(3px)'
  const overlaySegments = layout
    ? [
        {
          key: 'top',
          style: {
            top: 0,
            left: 0,
            width: layout.viewport.width,
            height: layout.highlight.top,
          },
        },
        {
          key: 'left',
          style: {
            top: layout.highlight.top,
            left: 0,
            width: layout.highlight.left,
            height: layout.highlight.height,
          },
        },
        {
          key: 'right',
          style: {
            top: layout.highlight.top,
            left: layout.highlight.left + layout.highlight.width,
            width:
              layout.viewport.width - (layout.highlight.left + layout.highlight.width),
            height: layout.highlight.height,
          },
        },
        {
          key: 'bottom',
          style: {
            top: layout.highlight.top + layout.highlight.height,
            left: 0,
            width: layout.viewport.width,
            height:
              layout.viewport.height - (layout.highlight.top + layout.highlight.height),
          },
        },
      ]
    : []
  const cornerOverlays =
    layout && layout.highlight.radius > 0
      ? [
          {
            key: 'top-left',
            style: {
              top: layout.highlight.top,
              left: layout.highlight.left,
              width: layout.highlight.radius,
              height: layout.highlight.radius,
              background: `radial-gradient(circle at 100% 100%, transparent calc(100% - 1px), ${overlayTone} 100%)`,
            },
          },
          {
            key: 'top-right',
            style: {
              top: layout.highlight.top,
              left: layout.highlight.left + layout.highlight.width - layout.highlight.radius,
              width: layout.highlight.radius,
              height: layout.highlight.radius,
              background: `radial-gradient(circle at 0% 100%, transparent calc(100% - 1px), ${overlayTone} 100%)`,
            },
          },
          {
            key: 'bottom-left',
            style: {
              top: layout.highlight.top + layout.highlight.height - layout.highlight.radius,
              left: layout.highlight.left,
              width: layout.highlight.radius,
              height: layout.highlight.radius,
              background: `radial-gradient(circle at 100% 0%, transparent calc(100% - 1px), ${overlayTone} 100%)`,
            },
          },
          {
            key: 'bottom-right',
            style: {
              top: layout.highlight.top + layout.highlight.height - layout.highlight.radius,
              left: layout.highlight.left + layout.highlight.width - layout.highlight.radius,
              width: layout.highlight.radius,
              height: layout.highlight.radius,
              background: `radial-gradient(circle at 0% 0%, transparent calc(100% - 1px), ${overlayTone} 100%)`,
            },
          },
        ]
      : []

  return (
    <AnimatePresence>
      <motion.div
        key={currentStep.id}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[130]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="workspace-tutorial-title"
      >
        {layout ? (
          <>
            {overlaySegments.map((segment) => (
              <div
                key={segment.key}
                aria-hidden="true"
                className="fixed"
                style={{
                  ...segment.style,
                  background: overlayTone,
                  backdropFilter: overlayBlur,
                  WebkitBackdropFilter: overlayBlur,
                }}
              />
            ))}
            {cornerOverlays.map((corner) => (
              <div
                key={corner.key}
                aria-hidden="true"
                className="fixed"
                style={{
                  ...corner.style,
                  backdropFilter: overlayBlur,
                  WebkitBackdropFilter: overlayBlur,
                }}
              />
            ))}
          </>
        ) : (
          <div
            className="absolute inset-0"
            style={{
              background: overlayTone,
              backdropFilter: overlayBlur,
              WebkitBackdropFilter: overlayBlur,
            }}
          />
        )}

        {layout ? (
          <motion.div
            initial={{ opacity: 0.8, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="pointer-events-none fixed"
            style={{
              top: layout.highlight.top,
              left: layout.highlight.left,
              width: layout.highlight.width,
              height: layout.highlight.height,
              borderRadius: layout.highlight.radius,
              boxShadow: isDark
                ? '0 0 0 1px rgba(167, 243, 208, 0.2), 0 14px 42px -18px rgba(16, 185, 129, 0.55)'
                : '0 0 0 1px rgba(16, 185, 129, 0.18), 0 14px 42px -18px rgba(5, 150, 105, 0.3)',
            }}
          />
        ) : null}

        <div
          className={
            isCenteredStep ? 'absolute inset-0 flex items-center justify-center p-4' : undefined
          }
        >
          <motion.div
            ref={popoverRef}
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className={`${layout ? 'fixed' : 'relative'} max-h-[calc(100vh-2rem)] overflow-y-auto rounded-[28px] border p-5 shadow-[0_30px_90px_-30px_rgba(15,23,42,0.6)] ${
              isDark
                ? 'border-emerald-500/20 bg-slate-900 text-slate-100'
                : 'border-emerald-100 bg-white text-slate-900'
            }`}
            style={
              layout
                ? {
                    top: layout.popover.top,
                    left: layout.popover.left,
                    width: layout.popover.width,
                  }
                : {
                    width: 'min(360px, calc(100vw - 2rem))',
                  }
            }
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p
                  className={`text-[11px] font-semibold uppercase tracking-[0.24em] ${
                    isDark ? 'text-emerald-300' : 'text-emerald-700'
                  }`}
                >
                  Workspace tour
                </p>
                <h2 id="workspace-tutorial-title" className="mt-3 text-xl font-semibold">
                  {currentStep.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className={`rounded-full p-2 transition-colors ${
                  isDark ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-100' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-900'
                }`}
                aria-label="Close workspace tutorial"
              >
                <X size={18} />
              </button>
            </div>

            <p className={`mt-4 text-sm leading-6 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              {currentStep.description}
            </p>

            <div className="mt-5 flex items-center gap-2">
              {steps.map((step, index) => (
                <span
                  key={step.id}
                  className={`h-1.5 rounded-full transition-all ${
                    index === currentStepIndex
                      ? isDark
                        ? 'w-8 bg-emerald-300'
                        : 'w-8 bg-emerald-600'
                      : isDark
                        ? 'w-1.5 bg-slate-700'
                        : 'w-1.5 bg-slate-200'
                  }`}
                />
              ))}
              <span className={`ml-auto text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {currentStepIndex + 1} / {steps.length}
              </span>
            </div>

            <div className="mt-6 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={onClose}
                className={`text-sm font-medium transition-colors ${
                  isDark ? 'text-slate-400 hover:text-slate-100' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Skip tour
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onPrevious}
                  disabled={currentStepIndex === 0}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                    currentStepIndex === 0
                      ? isDark
                        ? 'cursor-not-allowed border-slate-800 text-slate-600'
                        : 'cursor-not-allowed border-slate-200 text-slate-300'
                      : isDark
                        ? 'border-slate-700 text-slate-200 hover:bg-slate-800'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={onNext}
                  className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-500"
                >
                  {isLastStep ? 'Finish' : 'Next'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

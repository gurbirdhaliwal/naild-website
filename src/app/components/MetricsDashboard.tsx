import React, { useEffect, useMemo, useState } from 'react'
import { CalendarDays, ChevronDown, Flame, LineChart } from 'lucide-react'
import { GradingSuccessResult, Interview } from '../types/Interview'

interface MetricsDashboardProps {
  interviews: Interview[]
  userFirstName?: string
  userCreatedAt?: Date | string
}

interface ScoredInterview {
  id: string
  createdAt: Date
  score: number
}

interface ChartPoint extends ScoredInterview {
  x: number
  y: number
}

interface XAxisTick {
  x: number
  label: string
}

type TimeRange = '7d' | '1m' | '6m' | 'all'

const TIME_RANGE_OPTIONS: Array<{ value: TimeRange; label: string }> = [
  { value: '7d', label: 'Last 7 days' },
  { value: '1m', label: 'Last month' },
  { value: '6m', label: 'Last 6 months' },
  { value: 'all', label: 'All time' },
]

const CHART_TICKS = [100, 75, 50, 25, 0]

const hasAverageScore = (
  gradingResult: Interview['gradingResult']
): gradingResult is GradingSuccessResult =>
  Boolean(
    gradingResult &&
      typeof gradingResult === 'object' &&
      'average_score' in gradingResult &&
      typeof gradingResult.average_score === 'number'
  )

const toDate = (value?: Date | string | null) => {
  if (!value) return new Date(0)
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? new Date(0) : date
}

const startOfDay = (date: Date) => {
  const value = new Date(date)
  value.setHours(0, 0, 0, 0)
  return value
}

const endOfDay = (date: Date) => {
  const value = new Date(date)
  value.setHours(23, 59, 59, 999)
  return value
}

const formatXAxisLabel = (date: Date, range: TimeRange) =>
  date.toLocaleDateString(
    'en-US',
    range === 'all'
      ? { month: 'short', day: 'numeric', year: 'numeric' }
      : range === '6m'
        ? { month: 'short', year: 'numeric' }
        : { month: 'short', day: 'numeric', year: 'numeric' }
  )

const dateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`

const getCurrentStreak = (dates: Date[]) => {
  const daySet = new Set(dates.map(dateKey))
  let streak = 0
  const cursor = new Date()
  cursor.setHours(0, 0, 0, 0)

  while (daySet.has(dateKey(cursor))) {
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }

  return streak
}

const getRangeStart = (range: TimeRange) => {
  if (range === 'all') return null

  const start = startOfDay(new Date())

  if (range === '7d') {
    start.setDate(start.getDate() - 6)
    return start
  }

  if (range === '1m') {
    start.setMonth(start.getMonth() - 1)
    return start
  }

  start.setMonth(start.getMonth() - 6)
  return start
}

const MetricsDashboard: React.FC<MetricsDashboardProps> = ({
  interviews,
  userFirstName,
  userCreatedAt,
}) => {
  const [timeRange, setTimeRange] = useState<TimeRange>('7d')
  const [lineDashOffset, setLineDashOffset] = useState(1)

  const completedInterviews = useMemo(
    () =>
      interviews
        .filter((interview) => interview.status === 'completed')
        .sort((a, b) => toDate(a.createdAt).getTime() - toDate(b.createdAt).getTime()),
    [interviews]
  )

  const scoredInterviews = useMemo<ScoredInterview[]>(
    () =>
      completedInterviews
        .filter((interview) => hasAverageScore(interview.gradingResult))
        .map((interview) => ({
          id: interview.id,
          createdAt: toDate(interview.createdAt),
          score: Math.max(0, Math.min(100, interview.gradingResult!.average_score)),
        })),
    [completedInterviews]
  )

  const rangeStart = useMemo(() => getRangeStart(timeRange), [timeRange])

  const completedInRange = useMemo(() => {
    if (!rangeStart) return completedInterviews
    return completedInterviews.filter((interview) => toDate(interview.createdAt) >= rangeStart)
  }, [completedInterviews, rangeStart])

  const scoredInRange = useMemo(() => {
    if (!rangeStart) return scoredInterviews
    return scoredInterviews.filter((interview) => interview.createdAt >= rangeStart)
  }, [scoredInterviews, rangeStart])

  const chartRangeStart = useMemo(() => {
    if (rangeStart) return rangeStart

    if (userCreatedAt) {
      const accountCreatedAt = startOfDay(toDate(userCreatedAt))
      if (accountCreatedAt.getTime() > 0) return accountCreatedAt
    }

    const earliestCompleted = completedInterviews[0]
    if (!earliestCompleted) {
      const fallbackStart = startOfDay(new Date())
      fallbackStart.setDate(fallbackStart.getDate() - 6)
      return fallbackStart
    }

    return startOfDay(toDate(earliestCompleted.createdAt))
  }, [completedInterviews, rangeStart, userCreatedAt])

  const chartRangeEnd = endOfDay(new Date())

  const chartDurationMs = useMemo(
    () => Math.max(chartRangeEnd.getTime() - chartRangeStart.getTime(), 1),
    [chartRangeEnd, chartRangeStart]
  )

  const currentStreak = getCurrentStreak(completedInterviews.map((interview) => toDate(interview.createdAt)))

  const chartPoints = useMemo<ChartPoint[]>(
    () =>
      scoredInRange.map((interview) => {
        const position = ((interview.createdAt.getTime() - chartRangeStart.getTime()) / chartDurationMs) * 100
        const clampedX = Math.max(0, Math.min(100, position))

        return {
          ...interview,
          x: clampedX,
          y: 100 - interview.score,
        }
      }),
    [chartDurationMs, chartRangeStart, scoredInRange]
  )

  const linePath = useMemo(
    () =>
      chartPoints
        .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
        .join(' '),
    [chartPoints]
  )

  const areaPath = useMemo(() => {
    if (chartPoints.length < 2) return ''

    const startX = chartPoints[0].x.toFixed(2)
    const endX = chartPoints[chartPoints.length - 1].x.toFixed(2)
    const pointsPath = chartPoints
      .map((point) => `L ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
      .join(' ')

    return `M ${startX} 100 ${pointsPath} L ${endX} 100 Z`
  }, [chartPoints])

  const xAxisTicks = useMemo<XAxisTick[]>(() => {
    const tickCount = timeRange === '7d' ? 7 : timeRange === '1m' ? 5 : timeRange === '6m' ? 6 : 4

    return Array.from({ length: tickCount }, (_, index) => {
      const ratio = tickCount === 1 ? 0 : index / (tickCount - 1)
      const timestamp = chartRangeStart.getTime() + chartDurationMs * ratio
      const date = new Date(timestamp)

      return {
        x: ratio * 100,
        label: formatXAxisLabel(date, timeRange),
      }
    })
  }, [chartDurationMs, chartRangeStart, timeRange])

  useEffect(() => {
    if (!linePath) return

    setLineDashOffset(1)
    const frame = requestAnimationFrame(() => {
      setLineDashOffset(0)
    })

    return () => cancelAnimationFrame(frame)
  }, [linePath])

  return (
    <div className="bg-gradient-to-b from-white via-gray-50 to-gray-100 p-4 sm:p-5">
      <div className="mx-auto max-w-5xl space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 sm:text-2xl">Metrics</h1>
            <p className="mt-1 text-xs text-gray-600 sm:text-sm">
              {userFirstName ? `${userFirstName}, ` : ''}track your score trend over time.
            </p>
          </div>
          <LineChart size={20} className="mt-0.5 text-gray-500" />
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs text-orange-800">
            <Flame size={14} className="text-orange-500" />
            <span className="font-medium">{currentStreak} day streak</span>
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs text-blue-800">
            <CalendarDays size={14} className="text-blue-500" />
            <span className="font-medium">{completedInRange.length} interviews completed</span>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-base font-semibold text-gray-900">Score Trend</h2>

          <div className="relative w-full sm:w-56">
            <select
              value={timeRange}
              onChange={(event) => setTimeRange(event.target.value as TimeRange)}
              className="h-10 w-full appearance-none rounded-lg border border-gray-300 bg-gray-50 px-3 pr-10 text-sm text-gray-800 outline-none transition-colors focus:border-gray-400"
            >
              {TIME_RANGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDown
              size={16}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
            />
          </div>
        </div>

        <div className="px-2 pb-8 pt-3 sm:px-4">
          <div className="relative h-56 sm:h-60">
            <div className="absolute inset-0 left-8 sm:left-10">
              {CHART_TICKS.map((tick, index) => {
                const top = `${(index / (CHART_TICKS.length - 1)) * 100}%`
                return (
                  <React.Fragment key={tick}>
                    <div
                      className="absolute left-0 right-0 border-t border-dashed border-gray-200"
                      style={{ top }}
                    />
                    <span
                      className="absolute -left-6 -translate-y-1/2 text-[11px] text-gray-500 sm:-left-8"
                      style={{ top }}
                    >
                      {tick}
                    </span>
                  </React.Fragment>
                )
              })}

              <svg
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                className="absolute inset-0 h-full w-full"
              >
                {areaPath ? <path d={areaPath} fill="rgba(52,211,153,0.14)" /> : null}
                {linePath ? (
                  <path
                    d={linePath}
                    fill="none"
                    stroke="#34d399"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    pathLength={1}
                    style={{
                      strokeDasharray: 1,
                      strokeDashoffset: lineDashOffset,
                      transition: 'stroke-dashoffset 900ms cubic-bezier(0.22, 1, 0.36, 1)',
                    }}
                  />
                ) : null}
              </svg>

              {chartPoints.map((point) => (
                <span
                  key={point.id}
                  className="absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-teal-700"
                  style={{ left: `${point.x}%`, top: `${point.y}%` }}
                  title={`${point.score.toFixed(1)} on ${point.createdAt.toLocaleDateString('en-US')}`}
                />
              ))}

              {chartPoints.length === 0 ? (
                <p className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center text-sm text-gray-500">
                  No graded interviews in this time range yet.
                </p>
              ) : null}
            </div>

            <div className="absolute bottom-[-1.3rem] left-8 right-0 text-[11px] text-gray-500 sm:left-10">
              {xAxisTicks.map((tick) => (
                <span
                  key={`${timeRange}-${tick.x}`}
                  className="absolute -translate-x-1/2 whitespace-nowrap"
                  style={{ left: `${tick.x}%` }}
                >
                  {tick.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MetricsDashboard

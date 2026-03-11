import React, { useMemo, useState } from 'react'
import { CalendarDays, ChevronDown, Flame, Target, Trophy } from 'lucide-react'
import { GradingSuccessResult, Interview } from '../types/Interview'

interface MetricsDashboardProps {
  interviews: Interview[]
  userFirstName?: string
  userCreatedAt?: Date | string
}

interface ScoredInterview {
  id: string
  title: string
  createdAt: Date
  score: number
}

interface DailyActivityRecord {
  date: Date
  count: number
  averageScore: number | null
}

interface HeatmapCell extends DailyActivityRecord {
  key: string
  inRange: boolean
  isFuture: boolean
}

type TimeRange = '1m' | '3m' | '6m' | '1y' | 'all'

const TIME_RANGE_OPTIONS: Array<{ value: TimeRange; label: string }> = [
  { value: '1m', label: 'Last month' },
  { value: '3m', label: 'Last 3 months' },
  { value: '6m', label: 'Last 6 months' },
  { value: '1y', label: 'Last year' },
  { value: 'all', label: 'All time' },
]

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const HEATMAP_COLORS = ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39']

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

const addDays = (date: Date, amount: number) => {
  const value = new Date(date)
  value.setDate(value.getDate() + amount)
  return value
}

const startOfWeek = (date: Date) => addDays(startOfDay(date), -startOfDay(date).getDay())

const endOfWeek = (date: Date) => addDays(startOfWeek(date), 6)

const formatDate = (date: Date) =>
  date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

const getDayActivityMessage = (day: HeatmapCell) => {
  if (day.count === 0) {
    return 'No interviews completed on this day'
  }

  return `${day.count} interview${day.count === 1 ? '' : 's'} completed on this day`
}

const getDayActivityAriaLabel = (day: HeatmapCell) => {
  const activityMessage = getDayActivityMessage(day)

  if (day.averageScore !== null && day.count > 0) {
    return `${formatDate(day.date)}. ${activityMessage}. Average score ${day.averageScore.toFixed(1)}%.`
  }

  return `${formatDate(day.date)}. ${activityMessage}.`
}

const dateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`

const toDayStamp = (date: Date) => startOfDay(date).getTime()

const getCurrentStreak = (dates: Date[]) => {
  const daySet = new Set(dates.map(toDayStamp))
  const today = startOfDay(new Date())
  const todayStamp = today.getTime()
  let cursor = daySet.has(todayStamp) ? today : addDays(today, -1)

  if (!daySet.has(cursor.getTime())) {
    return 0
  }

  let streak = 0
  while (daySet.has(cursor.getTime())) {
    streak += 1
    cursor = addDays(cursor, -1)
  }

  return streak
}

const getLongestStreak = (dates: Date[]) => {
  const uniqueDays = Array.from(new Set(dates.map(toDayStamp))).sort((a, b) => a - b)
  if (uniqueDays.length === 0) return 0

  let best = 1
  let current = 1

  for (let index = 1; index < uniqueDays.length; index += 1) {
    if (uniqueDays[index] - uniqueDays[index - 1] === 24 * 60 * 60 * 1000) {
      current += 1
    } else {
      current = 1
    }
    best = Math.max(best, current)
  }

  return best
}

const getRangeStart = (range: TimeRange) => {
  if (range === 'all') return null

  const start = startOfDay(new Date())

  if (range === '1m') {
    start.setMonth(start.getMonth() - 1)
    return start
  }

  if (range === '3m') {
    start.setMonth(start.getMonth() - 3)
    return start
  }

  if (range === '6m') {
    start.setMonth(start.getMonth() - 6)
    return start
  }

  start.setFullYear(start.getFullYear() - 1)
  return start
}

const getIntensityLevel = (count: number, maxCount: number) => {
  if (count <= 0) return 0
  if (maxCount <= 1) return 4

  const ratio = count / maxCount
  if (ratio >= 0.85) return 4
  if (ratio >= 0.6) return 3
  if (ratio >= 0.3) return 2
  return 1
}

const MetricsDashboard: React.FC<MetricsDashboardProps> = ({
  interviews,
  userFirstName,
  userCreatedAt,
}) => {
  const [timeRange, setTimeRange] = useState<TimeRange>('6m')

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
          title: interview.title,
          createdAt: toDate(interview.createdAt),
          score: Math.max(0, Math.min(100, interview.gradingResult!.average_score)),
        })),
    [completedInterviews]
  )

  const dailyActivity = useMemo(() => {
    const records = new Map<
      string,
      {
        date: Date
        count: number
        totalScore: number
        scoredCount: number
      }
    >()

    completedInterviews.forEach((interview) => {
      const interviewDate = startOfDay(toDate(interview.createdAt))
      const key = dateKey(interviewDate)
      const existing = records.get(key) ?? {
        date: interviewDate,
        count: 0,
        totalScore: 0,
        scoredCount: 0,
      }

      existing.count += 1
      if (hasAverageScore(interview.gradingResult)) {
        existing.totalScore += interview.gradingResult.average_score
        existing.scoredCount += 1
      }

      records.set(key, existing)
    })

    return records
  }, [completedInterviews])

  const today = startOfDay(new Date())
  const todayStamp = today.getTime()
  const completedDates = useMemo(
    () => completedInterviews.map((interview) => toDate(interview.createdAt)),
    [completedInterviews]
  )
  const currentStreak = useMemo(() => getCurrentStreak(completedDates), [completedDates])
  const longestStreak = useMemo(() => getLongestStreak(completedDates), [completedDates])
  const hasCompletedToday = useMemo(
    () => completedDates.some((date) => toDayStamp(date) === todayStamp),
    [completedDates, todayStamp]
  )

  const rangeStart = useMemo(() => getRangeStart(timeRange), [timeRange])

  const visibleRangeStart = useMemo(() => {
    if (rangeStart) return rangeStart

    const accountCreatedAt = userCreatedAt ? startOfDay(toDate(userCreatedAt)) : null
    if (accountCreatedAt && accountCreatedAt.getTime() > 0) return accountCreatedAt

    const earliestCompletedInterview = completedInterviews[0]
    if (earliestCompletedInterview) {
      return startOfDay(toDate(earliestCompletedInterview.createdAt))
    }

    return addDays(today, -29)
  }, [completedInterviews, rangeStart, today, userCreatedAt])

  const completedInRange = useMemo(() => {
    return completedInterviews.filter((interview) => toDate(interview.createdAt) >= visibleRangeStart)
  }, [completedInterviews, visibleRangeStart])

  const scoredInRange = useMemo(() => {
    return scoredInterviews.filter((interview) => interview.createdAt >= visibleRangeStart)
  }, [scoredInterviews, visibleRangeStart])

  const heatmapStart = useMemo(() => startOfWeek(visibleRangeStart), [visibleRangeStart])
  const heatmapEnd = useMemo(() => endOfWeek(today), [today])

  const heatmapDays = useMemo<HeatmapCell[]>(() => {
    const result: HeatmapCell[] = []

    for (
      let cursor = new Date(heatmapStart);
      cursor.getTime() <= heatmapEnd.getTime();
      cursor = addDays(cursor, 1)
    ) {
      const key = dateKey(cursor)
      const activity = dailyActivity.get(key)

      result.push({
        key,
        date: new Date(cursor),
        count: activity?.count ?? 0,
        averageScore:
          activity && activity.scoredCount > 0 ? activity.totalScore / activity.scoredCount : null,
        inRange: cursor.getTime() >= visibleRangeStart.getTime() && cursor.getTime() <= today.getTime(),
        isFuture: cursor.getTime() > today.getTime(),
      })
    }

    return result
  }, [dailyActivity, heatmapEnd, heatmapStart, today, visibleRangeStart])

  const weeks = useMemo(() => {
    const result: HeatmapCell[][] = []

    for (let index = 0; index < heatmapDays.length; index += 7) {
      result.push(heatmapDays.slice(index, index + 7))
    }

    return result
  }, [heatmapDays])

  const monthLabels = useMemo(() => {
    return weeks.map((week, index) => {
      const firstVisibleDay = week.find((day) => day.inRange)
      if (!firstVisibleDay) return ''

      const previousVisibleDay = index > 0 ? weeks[index - 1].find((day) => day.inRange) : null
      if (!previousVisibleDay || previousVisibleDay.date.getMonth() !== firstVisibleDay.date.getMonth()) {
        return firstVisibleDay.date.toLocaleDateString('en-US', { month: 'short' })
      }

      return ''
    })
  }, [weeks])

  const visibleActivityDays = useMemo(
    () => heatmapDays.filter((day) => day.inRange && day.count > 0),
    [heatmapDays]
  )

  const activeDaysInRange = visibleActivityDays.length
  const maxCountInRange = Math.max(...visibleActivityDays.map((day) => day.count), 0)
  const totalSessionsInRange = completedInRange.length
  const averageScoreInRange = scoredInRange.length
    ? scoredInRange.reduce((sum, interview) => sum + interview.score, 0) / scoredInRange.length
    : null
  const bestScoreInRange = scoredInRange.length
    ? Math.max(...scoredInRange.map((interview) => interview.score))
    : null
  const thisWeekSessions = completedInterviews.filter(
    (interview) => toDate(interview.createdAt) >= addDays(today, -6)
  ).length
  const bestDayCount = visibleActivityDays.length
    ? Math.max(...visibleActivityDays.map((day) => day.count))
    : 0
  const rangeLabel =
    TIME_RANGE_OPTIONS.find((option) => option.value === timeRange)?.label.toLowerCase() ?? 'selected range'
  const recentSessions = useMemo(
    () =>
      [...(completedInRange.length > 0 ? completedInRange : completedInterviews)]
        .sort((a, b) => toDate(b.createdAt).getTime() - toDate(a.createdAt).getTime())
        .slice(0, 5),
    [completedInRange, completedInterviews]
  )

  const streakMessage =
    currentStreak === 0
      ? 'Complete an interview today to start your streak.'
      : hasCompletedToday
        ? 'You already kept the streak alive today.'
        : 'One completed interview today keeps the streak going.'

  return (
    <div className="p-4 sm:p-5">
      <div className="mx-auto max-w-5xl space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 sm:text-2xl">Metrics</h1>
            <p className="mt-1 text-xs text-gray-600 sm:text-sm">
              {userFirstName ? `${userFirstName}, ` : ''}track consistency the same way GitHub tracks contributions.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700">
            <Flame size={14} className="text-green-600" />
            Daily streak
          </div>
        </div>

        <section className="overflow-hidden rounded-[28px] border border-green-200 bg-gradient-to-br from-[#f7fff8] via-white to-[#eef8f1] p-5 sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-green-200 bg-white/80 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.2em] text-green-700">
                <Flame size={14} />
                Streak
              </div>

              <div className="mt-4 flex items-end gap-3">
                <span className="text-5xl font-semibold tracking-tight text-gray-900 sm:text-6xl">
                  {currentStreak}
                </span>
                <span className="pb-2 text-sm font-medium uppercase tracking-[0.18em] text-gray-500">
                  days
                </span>
              </div>

              <p className="mt-3 max-w-lg text-sm leading-6 text-gray-600">{streakMessage}</p>
            </div>

            <div className="grid w-full gap-3 sm:grid-cols-2 lg:max-w-xl">
              <div className="rounded-2xl border border-white/80 bg-white/85 p-4 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-gray-500">
                  <Trophy size={14} className="text-amber-500" />
                  Best Streak
                </div>
                <div className="mt-3 text-2xl font-semibold text-gray-900">{longestStreak} days</div>
                <p className="mt-1 text-sm text-gray-500">Longest run of consecutive interview days.</p>
              </div>

              <div className="rounded-2xl border border-white/80 bg-white/85 p-4 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-gray-500">
                  <CalendarDays size={14} className="text-sky-500" />
                  This Week
                </div>
                <div className="mt-3 text-2xl font-semibold text-gray-900">{thisWeekSessions}</div>
                <p className="mt-1 text-sm text-gray-500">Completed interviews in the last 7 days.</p>
              </div>

              <div className="rounded-2xl border border-white/80 bg-white/85 p-4 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-gray-500">
                  <Target size={14} className="text-emerald-600" />
                  Active Days
                </div>
                <div className="mt-3 text-2xl font-semibold text-gray-900">{activeDaysInRange}</div>
                <p className="mt-1 text-sm text-gray-500">Days with at least one completed session in {rangeLabel}.</p>
              </div>

              <div className="rounded-2xl border border-white/80 bg-white/85 p-4 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-gray-500">
                  <Target size={14} className="text-green-600" />
                  Average Score
                </div>
                <div className="mt-3 text-2xl font-semibold text-gray-900">
                  {averageScoreInRange !== null ? `${averageScoreInRange.toFixed(1)}%` : 'N/A'}
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  {bestScoreInRange !== null
                    ? `Best graded session: ${bestScoreInRange.toFixed(1)}%`
                    : 'Complete a graded interview to see scoring trends.'}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-gray-200 bg-white p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-gray-600">
                <CalendarDays size={14} />
                Activity
              </div>
              <h2 className="mt-4 text-lg font-semibold text-gray-900 sm:text-xl">Interview calendar</h2>
              <p className="mt-1 text-sm text-gray-600">
                Each square is a day. Darker squares mean more completed interviews.
              </p>
            </div>

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

          <div className="mt-5 overflow-x-auto pb-1">
            <div className="inline-flex min-w-full gap-3">
              <div className="pt-7">
                <div className="grid grid-rows-7 gap-1">
                  {WEEKDAY_LABELS.map((label, index) => (
                    <span
                      key={label}
                      className="flex h-4 items-center justify-end pr-1 text-[10px] text-gray-400"
                    >
                      {index % 2 === 1 ? label : ''}
                    </span>
                  ))}
                </div>
              </div>

              <div className="min-w-fit">
                <div className="flex gap-1">
                  {monthLabels.map((label, index) => (
                    <div key={`${label}-${index}`} className="relative h-5 w-4 sm:w-[18px]">
                      {label ? (
                        <span className="absolute left-0 top-0 whitespace-nowrap text-[10px] text-gray-400">
                          {label}
                        </span>
                      ) : null}
                    </div>
                  ))}
                </div>

                <div className="mt-2 flex gap-1">
                  {weeks.map((week, weekIndex) => (
                    <div key={`week-${weekIndex}`} className="grid grid-rows-7 gap-1">
                      {week.map((day) => {
                        const intensity = day.inRange ? getIntensityLevel(day.count, maxCountInRange) : 0
                        const color = day.inRange ? HEATMAP_COLORS[intensity] : 'transparent'
                        const borderColor = day.inRange ? color : 'transparent'
                        const tooltipMessage = getDayActivityMessage(day)
                        const tooltipLabel = getDayActivityAriaLabel(day)

                        return (
                          <div key={day.key} className="group relative">
                            <div
                              aria-label={tooltipLabel}
                              role="img"
                              className={`h-4 w-4 rounded-[4px] border transition-transform duration-150 ${
                                day.inRange && !day.isFuture ? 'group-hover:scale-110' : ''
                              }`}
                              style={{
                                backgroundColor: color,
                                borderColor,
                                opacity: day.inRange ? 1 : 0.24,
                              }}
                            />

                            <div
                              aria-hidden="true"
                              className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 w-max -translate-x-1/2 rounded-md bg-gray-900 px-2.5 py-1.5 text-center text-[11px] font-medium text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100"
                            >
                              <div>{tooltipMessage}</div>
                              <div className="text-[10px] font-normal text-gray-300">
                                {formatDate(day.date)}
                                {day.averageScore !== null && day.count > 0
                                  ? ` • Avg ${day.averageScore.toFixed(1)}%`
                                  : ''}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-gray-500">
              {totalSessionsInRange} completed interview{totalSessionsInRange === 1 ? '' : 's'} on{' '}
              {activeDaysInRange} active day{activeDaysInRange === 1 ? '' : 's'} in {rangeLabel}.
            </div>

            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>Less</span>
              {HEATMAP_COLORS.map((color, index) => (
                <span
                  key={`legend-${index}`}
                  className="h-3.5 w-3.5 rounded-[4px] border"
                  style={{ backgroundColor: color, borderColor: color }}
                />
              ))}
              <span>More</span>
            </div>
          </div>
        </section>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
          <section className="rounded-[28px] border border-gray-200 bg-white p-5 sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold text-gray-900">Recent completed sessions</h3>
                <p className="mt-1 text-sm text-gray-600">
                  A quick view of your latest interview activity.
                </p>
              </div>
              <div className="rounded-full bg-gray-50 px-3 py-1 text-xs font-medium text-gray-600">
                {recentSessions.length} shown
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {recentSessions.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
                  No completed interviews yet. Finish one session to start filling the calendar.
                </div>
              ) : (
                recentSessions.map((interview) => {
                  const score = hasAverageScore(interview.gradingResult)
                    ? interview.gradingResult.average_score
                    : null

                  return (
                    <div
                      key={interview.id}
                      className="flex items-center justify-between gap-4 rounded-2xl border border-gray-100 bg-gray-50/80 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-gray-900">{interview.title}</div>
                        <div className="mt-1 text-xs text-gray-500">{formatDate(toDate(interview.createdAt))}</div>
                      </div>

                      <div className="flex flex-shrink-0 items-center gap-2">
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-gray-600">
                          {interview.languages.length > 0 ? interview.languages[0] : interview.role}
                        </span>
                        <span className="rounded-full bg-gray-900 px-3 py-1 text-xs font-medium text-white">
                          {score !== null ? `${score.toFixed(0)}%` : 'Ungraded'}
                        </span>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </section>

          <section className="rounded-[28px] border border-gray-200 bg-white p-5 sm:p-6">
            <h3 className="text-base font-semibold text-gray-900">Consistency snapshot</h3>
            <p className="mt-1 text-sm text-gray-600">
              The numbers that matter most for building momentum.
            </p>

            <div className="mt-5 space-y-3">
              <div className="rounded-2xl border border-gray-100 bg-gray-50/80 px-4 py-3">
                <div className="text-xs font-medium uppercase tracking-[0.18em] text-gray-500">
                  Total completed
                </div>
                <div className="mt-2 text-2xl font-semibold text-gray-900">{completedInterviews.length}</div>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-gray-50/80 px-4 py-3">
                <div className="text-xs font-medium uppercase tracking-[0.18em] text-gray-500">
                  Best day
                </div>
                <div className="mt-2 text-2xl font-semibold text-gray-900">
                  {bestDayCount} interview{bestDayCount === 1 ? '' : 's'}
                </div>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-gray-50/80 px-4 py-3">
                <div className="text-xs font-medium uppercase tracking-[0.18em] text-gray-500">
                  Graded sessions
                </div>
                <div className="mt-2 text-2xl font-semibold text-gray-900">{scoredInterviews.length}</div>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-gray-50/80 px-4 py-3">
                <div className="text-xs font-medium uppercase tracking-[0.18em] text-gray-500">
                  Best score
                </div>
                <div className="mt-2 text-2xl font-semibold text-gray-900">
                  {bestScoreInRange !== null ? `${bestScoreInRange.toFixed(1)}%` : 'N/A'}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

export default MetricsDashboard

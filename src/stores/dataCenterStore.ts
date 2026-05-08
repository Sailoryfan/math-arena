import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getStorage, setStorage } from '@/utils/storage'
import { useUserStore } from './userStore'
import { usePracticeStore } from './practiceStore'
import { useAdventureStore } from './adventureStore'
import { usePvpStore } from './pvpStore'
import { useRhythmStore } from './rhythmStore'
import { useAchievementStore } from './achievementStore'

interface DailyRecord {
  date: string
  answered: number
  correct: number
  playTime: number // seconds
  modes: {
    practice: number
    adventure: number
    dungeon: number
    pvp: number
    rhythm: number
  }
}

interface WeeklyReport {
  weekStart: string
  weekEnd: string
  totalAnswered: number
  totalCorrect: number
  accuracy: number
  totalPlayTime: number
  dailyRecords: DailyRecord[]
  topWeakPoints: string[]
  improvements: string[]
  suggestions: string[]
}

const DAILY_KEY = 'daily-records'
const REPORT_KEY = 'weekly-reports'

export const useDataCenterStore = defineStore('dataCenter', () => {
  const dailyRecords = ref<DailyRecord[]>(getStorage(DAILY_KEY, []))
  const weeklyReports = ref<WeeklyReport[]>(getStorage(REPORT_KEY, []))

  const todayRecord = computed(() => {
    const today = new Date().toISOString().slice(0, 10)
    return dailyRecords.value.find(r => r.date === today) || null
  })

  const todayAnswered = computed(() => todayRecord.value?.answered || 0)
  const todayCorrect = computed(() => todayRecord.value?.correct || 0)
  const todayAccuracy = computed(() => {
    if (!todayRecord.value || todayRecord.value.answered === 0) return 0
    return Math.round((todayRecord.value.correct / todayRecord.value.answered) * 100)
  })
  const todayPlayTime = computed(() => todayRecord.value?.playTime || 0)

  // Last 7 days records for chart
  const last7Days = computed(() => {
    const records: DailyRecord[] = []
    const today = new Date()
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().slice(0, 10)
      const record = dailyRecords.value.find(r => r.date === dateStr)
      records.push(record || {
        date: dateStr,
        answered: 0,
        correct: 0,
        playTime: 0,
        modes: { practice: 0, adventure: 0, dungeon: 0, pvp: 0, rhythm: 0 },
      })
    }
    return records
  })

  // Last 30 days for heatmap
  const last30Days = computed(() => {
    const records: { date: string; count: number }[] = []
    const today = new Date()
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().slice(0, 10)
      const record = dailyRecords.value.find(r => r.date === dateStr)
      records.push({ date: dateStr, count: record?.answered || 0 })
    }
    return records
  })

  // Mode distribution for today
  const modeDistribution = computed(() => {
    if (!todayRecord.value) return []
    const modes = todayRecord.value.modes
    return [
      { name: '传统练习', value: modes.practice, color: '#2ed573' },
      { name: '冒险闯关', value: modes.adventure, color: '#ffd700' },
      { name: '地牢探险', value: modes.dungeon, color: '#bb86fc' },
      { name: '排位对战', value: modes.pvp, color: '#ff6b35' },
      { name: '节奏模式', value: modes.rhythm, color: '#ff4757' },
    ].filter(m => m.value > 0)
  })

  // Weekly trend (accuracy over 7 days)
  const weeklyTrend = computed(() => {
    return last7Days.value.map(r => ({
      date: r.date.slice(5), // MM-DD
      accuracy: r.answered > 0 ? Math.round((r.correct / r.answered) * 100) : 0,
      count: r.answered,
    }))
  })

  // Knowledge point mastery from practice history
  const knowledgePointStats = computed(() => {
    const practiceStore = usePracticeStore()
    const stats: Record<string, { total: number; correct: number }> = {}

    for (const answer of practiceStore.history) {
      const kpId = answer.knowledgePointId
      if (!stats[kpId]) stats[kpId] = { total: 0, correct: 0 }
      stats[kpId].total++
      if (answer.correct) stats[kpId].correct++
    }

    return Object.entries(stats).map(([id, s]) => ({
      id,
      total: s.total,
      correct: s.correct,
      accuracy: Math.round((s.correct / s.total) * 100),
    })).sort((a, b) => a.accuracy - b.accuracy)
  })

  // Overall stats
  const overallStats = computed(() => {
    const userStore = useUserStore()
    const practiceStore = usePracticeStore()
    const pvpStore = usePvpStore()

    const totalAnswered = userStore.profile.stats.totalAnswered
    const totalCorrect = userStore.profile.stats.totalCorrect
    const errorCount = practiceStore.getErrorCount()
    const pvpMatches = pvpStore.totalMatches
    const pvpWinRate = pvpStore.winRate

    return {
      totalAnswered,
      totalCorrect,
      overallAccuracy: totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0,
      errorCount,
      pvpMatches,
      pvpWinRate,
      level: userStore.profile.gameProfile.level,
      exp: userStore.profile.gameProfile.exp,
      gold: userStore.profile.gameProfile.gold,
    }
  })

  function recordAnswer(mode: 'practice' | 'adventure' | 'dungeon' | 'pvp' | 'rhythm', correct: boolean) {
    const today = new Date().toISOString().slice(0, 10)
    let record = dailyRecords.value.find(r => r.date === today)

    if (!record) {
      record = {
        date: today,
        answered: 0,
        correct: 0,
        playTime: 0,
        modes: { practice: 0, adventure: 0, dungeon: 0, pvp: 0, rhythm: 0 },
      }
      dailyRecords.value.push(record)
    }

    record.answered++
    if (correct) record.correct++
    record.modes[mode]++

    // Keep only last 90 days
    if (dailyRecords.value.length > 90) {
      dailyRecords.value = dailyRecords.value.slice(-90)
    }

    setStorage(DAILY_KEY, dailyRecords.value)
  }

  function recordPlayTime(seconds: number) {
    const today = new Date().toISOString().slice(0, 10)
    let record = dailyRecords.value.find(r => r.date === today)
    if (!record) {
      record = {
        date: today,
        answered: 0,
        correct: 0,
        playTime: 0,
        modes: { practice: 0, adventure: 0, dungeon: 0, pvp: 0, rhythm: 0 },
      }
      dailyRecords.value.push(record)
    }
    record.playTime += seconds
    setStorage(DAILY_KEY, dailyRecords.value)
  }

  function generateWeeklyReport(): WeeklyReport {
    const records = last7Days.value
    const totalAnswered = records.reduce((sum, r) => sum + r.answered, 0)
    const totalCorrect = records.reduce((sum, r) => sum + r.correct, 0)
    const totalPlayTime = records.reduce((sum, r) => sum + r.playTime, 0)

    const kpStats = knowledgePointStats.value
    const topWeakPoints = kpStats
      .filter(k => k.total >= 3 && k.accuracy < 70)
      .slice(0, 5)
      .map(k => k.id)

    const report: WeeklyReport = {
      weekStart: records[0]?.date || '',
      weekEnd: records[records.length - 1]?.date || '',
      totalAnswered,
      totalCorrect,
      accuracy: totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0,
      totalPlayTime,
      dailyRecords: records,
      topWeakPoints,
      improvements: generateImprovements(records),
      suggestions: generateSuggestions(kpStats),
    }

    weeklyReports.value.push(report)
    if (weeklyReports.value.length > 12) {
      weeklyReports.value = weeklyReports.value.slice(-12)
    }
    setStorage(REPORT_KEY, weeklyReports.value)

    return report
  }

  return {
    dailyRecords,
    weeklyReports,
    todayRecord,
    todayAnswered,
    todayCorrect,
    todayAccuracy,
    todayPlayTime,
    last7Days,
    last30Days,
    modeDistribution,
    weeklyTrend,
    knowledgePointStats,
    overallStats,
    recordAnswer,
    recordPlayTime,
    generateWeeklyReport,
  }
})

function generateImprovements(records: DailyRecord[]): string[] {
  const improvements: string[] = []
  const recentDays = records.slice(-3)
  const earlierDays = records.slice(0, 3)

  const recentAvgAccuracy = recentDays.reduce((s, r) => s + (r.answered > 0 ? r.correct / r.answered : 0), 0) / 3
  const earlierAvgAccuracy = earlierDays.reduce((s, r) => s + (r.answered > 0 ? r.correct / r.answered : 0), 0) / 3

  if (recentAvgAccuracy > earlierAvgAccuracy + 0.05) {
    improvements.push('正确率有明显提升，继续保持！')
  }

  const recentTotal = recentDays.reduce((s, r) => s + r.answered, 0)
  const earlierTotal = earlierDays.reduce((s, r) => s + r.answered, 0)
  if (recentTotal > earlierTotal * 1.2) {
    improvements.push('做题量有所增加，学习积极性提高。')
  }

  if (improvements.length === 0) {
    improvements.push('保持当前的学习节奏。')
  }

  return improvements
}

function generateSuggestions(kpStats: { id: string; total: number; correct: number; accuracy: number }[]): string[] {
  const suggestions: string[] = []
  const weakPoints = kpStats.filter(k => k.total >= 3 && k.accuracy < 60)

  if (weakPoints.length > 0) {
    suggestions.push(`建议重点复习以下知识点：${weakPoints.slice(0, 3).map(k => k.id).join('、')}`)
  }

  const lowPractice = kpStats.filter(k => k.total < 5)
  if (lowPractice.length > 3) {
    suggestions.push('部分知识点练习量不足，建议增加练习频次。')
  }

  if (suggestions.length === 0) {
    suggestions.push('学习状态良好，可以尝试更高难度的挑战。')
  }

  return suggestions
}

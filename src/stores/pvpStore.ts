import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getStorage, setStorage } from '@/utils/storage'

export interface RankTier {
  name: string
  icon: string
  minStars: number
  maxStars: number
  color: string
}

export interface PvPOpponent {
  name: string
  avatar: string
  rank: string
  accuracy: number // 0-100
  speed: number // ms per question
}

export interface PvPMatch {
  id: string
  opponent: PvPOpponent
  playerScore: number
  opponentScore: number
  currentQuestion: number
  totalQuestions: number
  timeLeft: number
  isPlayerTurn: boolean
  isOver: boolean
  isVictory: boolean | null
  playerAnswers: { correct: boolean; time: number }[]
  opponentAnswers: { correct: boolean; time: number }[]
}

const RANK_TIERS: RankTier[] = [
  { name: '青铜', icon: '🥉', minStars: 0, maxStars: 3, color: '#cd7f32' },
  { name: '白银', icon: '🥈', minStars: 4, maxStars: 7, color: '#c0c0c0' },
  { name: '黄金', icon: '🥇', minStars: 8, maxStars: 12, color: '#ffd700' },
  { name: '铂金', icon: '💎', minStars: 13, maxStars: 18, color: '#00ced1' },
  { name: '钻石', icon: '💠', minStars: 19, maxStars: 25, color: '#b9f2ff' },
  { name: '大师', icon: '👑', minStars: 26, maxStars: 35, color: '#ff6b35' },
  { name: '王者', icon: '🏆', minStars: 36, maxStars: 999, color: '#ff4757' },
]

const AI_NAMES = [
  '数学小王子', '算术达人', '几何天才', '方程高手', '函数大师',
  '逻辑推理者', '计算快手', '证明达人', '解题能手', '数感超人',
  '代数精灵', '几何骑士', '概率猎手', '统计达人', '微积分先驱',
]

const AI_AVATARS = ['🧑‍🎓', '👨‍🎓', '👩‍🎓', '🧑‍💻', '👨‍💻', '👩‍💻', '🧑‍🏫', '👨‍🏫', '👩‍🏫']

export const usePvpStore = defineStore('pvp', () => {
  const rankStars = ref(getStorage('pvp-stars', 0))
  const rankName = ref(getStorage('pvp-rank', '青铜'))
  const winStreak = ref(getStorage('pvp-streak', 0))
  const totalMatches = ref(getStorage('pvp-total', 0))
  const totalWins = ref(getStorage('pvp-wins', 0))
  const currentMatch = ref<PvPMatch | null>(null)
  const isMatching = ref(false)

  const currentTier = computed(() => {
    return RANK_TIERS.find(t => t.name === rankName.value) || RANK_TIERS[0]!
  })

  const winRate = computed(() => {
    if (totalMatches.value === 0) return 0
    return Math.round((totalWins.value / totalMatches.value) * 100)
  })

  function getRankProgress() {
    const tier = currentTier.value
    const starsInTier = rankStars.value - tier.minStars
    const tierRange = tier.maxStars - tier.minStars + 1
    return Math.min(100, Math.round((starsInTier / tierRange) * 100))
  }

  function generateOpponent(): PvPOpponent {
    const playerTierIdx = RANK_TIERS.findIndex(t => t.name === rankName.value)
    const offset = Math.floor(Math.random() * 3) - 1 // -1, 0, or 1
    const oppTierIdx = Math.max(0, Math.min(RANK_TIERS.length - 1, playerTierIdx + offset))
    const oppTier = RANK_TIERS[oppTierIdx]!

    const baseAccuracy = 50 + oppTierIdx * 8
    const accuracy = Math.max(30, Math.min(95, baseAccuracy + Math.floor(Math.random() * 20) - 10))
    const speed = Math.max(2000, 8000 - oppTierIdx * 800 + Math.floor(Math.random() * 2000) - 1000)

    return {
      name: AI_NAMES[Math.floor(Math.random() * AI_NAMES.length)]!,
      avatar: AI_AVATARS[Math.floor(Math.random() * AI_AVATARS.length)] || '🧑‍🎓',
      rank: oppTier.name,
      accuracy,
      speed,
    }
  }

  function startMatch() {
    isMatching.value = true

    // Simulate matching delay
    setTimeout(() => {
      isMatching.value = false

      const opponent = generateOpponent()
      currentMatch.value = {
        id: Date.now().toString(),
        opponent,
        playerScore: 0,
        opponentScore: 0,
        currentQuestion: 0,
        totalQuestions: 10,
        timeLeft: 15,
        isPlayerTurn: true,
        isOver: false,
        isVictory: null,
        playerAnswers: [],
        opponentAnswers: [],
      }
    }, 1500 + Math.random() * 1000)
  }

  function submitAnswer(correct: boolean, timeUsed: number) {
    if (!currentMatch.value || currentMatch.value.isOver) return

    const match = currentMatch.value

    // Player answer
    match.playerAnswers.push({ correct, time: timeUsed })
    if (correct) {
      match.playerScore += 100 + Math.max(0, Math.floor((15000 - timeUsed) / 100))
    }

    // AI answer
    const aiCorrect = Math.random() * 100 < match.opponent.accuracy
    const aiTime = match.opponent.speed + Math.floor(Math.random() * 2000) - 1000
    match.opponentAnswers.push({ correct: aiCorrect, time: aiTime })
    if (aiCorrect) {
      match.opponentScore += 100 + Math.max(0, Math.floor((15000 - aiTime) / 100))
    }

    match.currentQuestion++

    // Check if match is over
    if (match.currentQuestion >= match.totalQuestions) {
      endMatch()
    }
  }

  function endMatch() {
    if (!currentMatch.value) return

    const match = currentMatch.value
    match.isOver = true

    if (match.playerScore > match.opponentScore) {
      match.isVictory = true
      totalWins.value++
      winStreak.value++
      const bonusStars = winStreak.value >= 3 ? 2 : 1
      rankStars.value += bonusStars
    } else if (match.playerScore < match.opponentScore) {
      match.isVictory = false
      winStreak.value = 0
      // Bronze doesn't lose stars
      if (rankName.value !== '青铜') {
        rankStars.value = Math.max(0, rankStars.value - 1)
      }
    } else {
      match.isVictory = null // draw
    }

    totalMatches.value++

    // Update rank name
    for (let i = RANK_TIERS.length - 1; i >= 0; i--) {
      if (rankStars.value >= RANK_TIERS[i]!.minStars) {
        rankName.value = RANK_TIERS[i]!.name
        break
      }
    }

    // Save
    setStorage('pvp-stars', rankStars.value)
    setStorage('pvp-rank', rankName.value)
    setStorage('pvp-streak', winStreak.value)
    setStorage('pvp-total', totalMatches.value)
    setStorage('pvp-wins', totalWins.value)
  }

  function cancelMatch() {
    isMatching.value = false
  }

  return {
    rankStars,
    rankName,
    winStreak,
    totalMatches,
    totalWins,
    currentMatch,
    isMatching,
    currentTier,
    winRate,
    getRankProgress,
    startMatch,
    submitAnswer,
    endMatch,
    cancelMatch,
    RANK_TIERS,
  }
})

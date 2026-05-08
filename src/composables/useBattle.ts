import { ref, computed } from 'vue'
import type { Question } from '@/types/question'
import { checkAnswer } from '@/utils/latex'

export interface MonsterAI {
  name: string
  icon: string
  hp: number
  maxHP: number
  atk: number
  accuracy: number // 0-1, probability of correct answer
  avgSpeed: number // ms, average answer time
  speedVariance: number // ms, random variance in speed
}

export interface BattleRound {
  questionId: string
  playerAnswer: string
  playerCorrect: boolean
  playerTime: number // ms
  monsterCorrect: boolean
  monsterTime: number // ms
  playerDamage: number
  monsterDamage: number
  result: 'player_hit' | 'monster_hit' | 'both_hit' | 'both_miss'
}

export function useBattle() {
  const playerHP = ref(100)
  const playerMaxHP = ref(100)
  const monsterHP = ref(0)
  const monsterMaxHP = ref(0)
  const monsterAI = ref<MonsterAI | null>(null)

  const combo = ref(0)
  const maxCombo = ref(0)
  const correctCount = ref(0)
  const totalCount = ref(0)
  const rounds = ref<BattleRound[]>([])

  const isBattleOver = ref(false)
  const isVictory = ref(false)

  // Current round state
  const roundStartTime = ref(0)
  const monsterAnswered = ref(false)
  const monsterResult = ref<{ correct: boolean; time: number } | null>(null)
  const roundResult = ref<BattleRound | null>(null)
  const showRoundResult = ref(false)

  const monsterHPPercent = computed(() => monsterMaxHP.value > 0 ? (monsterHP.value / monsterMaxHP.value) * 100 : 0)
  const playerHPPercent = computed(() => playerMaxHP.value > 0 ? (playerHP.value / playerMaxHP.value) * 100 : 0)

  function initBattle(config: MonsterAI, pMaxHP = 100) {
    monsterAI.value = config
    monsterHP.value = config.hp
    monsterMaxHP.value = config.hp
    playerHP.value = pMaxHP
    playerMaxHP.value = pMaxHP
    combo.value = 0
    maxCombo.value = 0
    correctCount.value = 0
    totalCount.value = 0
    rounds.value = []
    isBattleOver.value = false
    isVictory.value = false
    roundResult.value = null
    showRoundResult.value = false
  }

  function startRound() {
    roundStartTime.value = Date.now()
    monsterAnswered.value = false
    monsterResult.value = null
    roundResult.value = null
    showRoundResult.value = false

    // Monster "answers" after its AI delay
    if (monsterAI.value) {
      const ai = monsterAI.value
      const speed = ai.avgSpeed + (Math.random() - 0.5) * ai.speedVariance * 2
      const delay = Math.max(500, Math.min(speed, 15000))

      setTimeout(() => {
        if (isBattleOver.value) return
        const correct = Math.random() < ai.accuracy
        monsterAnswered.value = true
        monsterResult.value = { correct, time: delay }
      }, delay)
    }
  }

  function submitPlayerAnswer(question: Question, answer: string): BattleRound | null {
    if (isBattleOver.value || !monsterAI.value) return null

    const playerTime = Date.now() - roundStartTime.value
    const playerCorrect = question.type === 'choice'
      ? answer === question.answer
      : checkAnswer(answer, question.answer)

    // If monster hasn't answered yet, wait a moment for it
    // But cap at 15 seconds
    const monsterCorrect = monsterResult.value?.correct ?? false
    const monsterTime = monsterResult.value?.time ?? 15000

    totalCount.value++

    // Calculate result
    let playerDmg = 0
    let monsterDmg = 0
    let result: BattleRound['result']

    const basePlayerAtk = 10 + Math.floor(combo.value * 2)
    const baseMonsterAtk = monsterAI.value.atk

    if (playerCorrect && monsterCorrect) {
      // Both correct — slower one takes damage
      if (playerTime <= monsterTime) {
        // Player is faster — monster takes damage
        monsterDmg = basePlayerAtk + Math.floor((monsterTime - playerTime) / 1000) * 2
        result = 'monster_hit'
      } else {
        // Monster is faster — player takes damage
        playerDmg = baseMonsterAtk + Math.floor((playerTime - monsterTime) / 1000) * 2
        result = 'player_hit'
      }
    } else if (playerCorrect && !monsterCorrect) {
      // Player correct, monster wrong — monster takes damage
      monsterDmg = basePlayerAtk + Math.floor(monsterTime / 1000)
      result = 'monster_hit'
    } else if (!playerCorrect && monsterCorrect) {
      // Player wrong, monster correct — player takes damage
      playerDmg = baseMonsterAtk + Math.floor(playerTime < monsterTime ? monsterTime / 1000 : 0)
      result = 'player_hit'
    } else {
      // Both wrong — both take damage
      playerDmg = Math.floor(baseMonsterAtk * 0.5)
      monsterDmg = Math.floor(basePlayerAtk * 0.5)
      result = 'both_hit'
    }

    // Apply damage
    monsterHP.value = Math.max(0, monsterHP.value - monsterDmg)
    playerHP.value = Math.max(0, playerHP.value - playerDmg)

    // Update combo
    if (playerCorrect) {
      combo.value++
      correctCount.value++
      maxCombo.value = Math.max(maxCombo.value, combo.value)
    } else {
      combo.value = 0
    }

    const round: BattleRound = {
      questionId: question.id,
      playerAnswer: answer,
      playerCorrect,
      playerTime,
      monsterCorrect,
      monsterTime,
      playerDamage: playerDmg,
      monsterDamage: monsterDmg,
      result,
    }

    rounds.value.push(round)
    roundResult.value = round
    showRoundResult.value = true

    // Check battle end
    if (monsterHP.value <= 0) {
      isBattleOver.value = true
      isVictory.value = true
    } else if (playerHP.value <= 0) {
      isBattleOver.value = true
      isVictory.value = false
    }

    return round
  }

  function dismissResult() {
    showRoundResult.value = false
    roundResult.value = null
  }

  function getAccuracy(): number {
    return totalCount.value > 0 ? Math.round((correctCount.value / totalCount.value) * 100) : 0
  }

  return {
    playerHP,
    playerMaxHP,
    monsterHP,
    monsterMaxHP,
    monsterAI,
    combo,
    maxCombo,
    correctCount,
    totalCount,
    rounds,
    isBattleOver,
    isVictory,
    monsterHPPercent,
    playerHPPercent,
    roundStartTime,
    monsterAnswered,
    monsterResult,
    roundResult,
    showRoundResult,
    initBattle,
    startRound,
    submitPlayerAnswer,
    dismissResult,
    getAccuracy,
  }
}

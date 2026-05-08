import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Question } from '@/types/question'
import { getStorage, setStorage, generateId } from '@/utils/storage'
import { checkAnswer } from '@/utils/latex'

interface PracticeAnswer {
  questionId: string
  userAnswer: string
  correct: boolean
  responseTime: number
  knowledgePointId: string
  difficulty: number
  timestamp: string
}

interface ErrorEntry {
  questionId: string
  knowledgePointId: string
  wrongCount: number
  lastWrongAt: string
  nextReviewAt: string
  reviewInterval: number // days
  mastered: boolean
}

interface PracticeSession {
  id: string
  startedAt: string
  questions: Question[]
  answers: PracticeAnswer[]
  currentIndex: number
  isComplete: boolean
  combo: number
  maxCombo: number
}

const ERRORS_KEY = 'error-book'
const HISTORY_KEY = 'practice-history'
const INTERVALS = [1, 3, 7, 15, 30] // Ebbinghaus intervals in days

export const usePracticeStore = defineStore('practice', () => {
  const currentSession = ref<PracticeSession | null>(null)
  const errorBook = ref<Record<string, ErrorEntry>>(getStorage(ERRORS_KEY, {}))
  const history = ref<PracticeAnswer[]>(getStorage(HISTORY_KEY, []))

  const currentQuestion = computed(() => {
    if (!currentSession.value) return null
    return currentSession.value.questions[currentSession.value.currentIndex]
  })

  const combo = computed(() => currentSession.value?.combo || 0)
  const maxCombo = computed(() => currentSession.value?.maxCombo || 0)
  const isComplete = computed(() => currentSession.value?.isComplete || false)

  const sessionStats = computed(() => {
    if (!currentSession.value) return null
    const answers = currentSession.value.answers
    const correct = answers.filter(a => a.correct).length
    const total = answers.length
    const totalTime = answers.reduce((sum, a) => sum + a.responseTime, 0)
    return {
      correct,
      total,
      accuracy: total > 0 ? Math.round((correct / total) * 100) : 0,
      totalTime,
      avgTime: total > 0 ? Math.round(totalTime / total) : 0,
      maxCombo: currentSession.value.maxCombo,
    }
  })

  function startPractice(questions: Question[]) {
    currentSession.value = {
      id: generateId(),
      startedAt: new Date().toISOString(),
      questions,
      answers: [],
      currentIndex: 0,
      isComplete: false,
      combo: 0,
      maxCombo: 0,
    }
  }

  function submitAnswer(userAnswer: string): boolean {
    if (!currentSession.value || !currentQuestion.value) return false

    const q = currentQuestion.value
    const responseTime = Date.now() - new Date(currentSession.value.startedAt).getTime()
    const correct = checkAnswer(userAnswer, q.answer)

    const answer: PracticeAnswer = {
      questionId: q.id,
      userAnswer,
      correct,
      responseTime,
      knowledgePointId: q.knowledgePointId,
      difficulty: q.difficulty,
      timestamp: new Date().toISOString(),
    }

    currentSession.value.answers.push(answer)
    history.value.push(answer)
    setStorage(HISTORY_KEY, history.value)

    // Update combo
    if (correct) {
      currentSession.value.combo++
      currentSession.value.maxCombo = Math.max(
        currentSession.value.maxCombo,
        currentSession.value.combo
      )
    } else {
      currentSession.value.combo = 0
      addToErrorBook(q)
    }

    return correct
  }

  function nextQuestion() {
    if (!currentSession.value) return

    if (currentSession.value.currentIndex < currentSession.value.questions.length - 1) {
      currentSession.value.currentIndex++
    } else {
      currentSession.value.isComplete = true
    }
  }

  function addToErrorBook(q: Question) {
    const existing = errorBook.value[q.id]
    if (existing) {
      existing.wrongCount++
      existing.lastWrongAt = new Date().toISOString()
      existing.reviewInterval = INTERVALS[0]! // Reset interval
      existing.nextReviewAt = getNextReviewDate(INTERVALS[0]!)
      existing.mastered = false
    } else {
      errorBook.value[q.id] = {
        questionId: q.id,
        knowledgePointId: q.knowledgePointId,
        wrongCount: 1,
        lastWrongAt: new Date().toISOString(),
        nextReviewAt: getNextReviewDate(INTERVALS[0]!),
        reviewInterval: INTERVALS[0]!,
        mastered: false,
      }
    }
    setStorage(ERRORS_KEY, errorBook.value)
  }

  function markMastered(questionId: string) {
    if (errorBook.value[questionId]) {
      errorBook.value[questionId].mastered = true
      setStorage(ERRORS_KEY, errorBook.value)
    }
  }

  function updateReviewSchedule(questionId: string, correct: boolean) {
    const entry = errorBook.value[questionId]
    if (!entry) return

    if (correct) {
      // Double the interval
      const currentIdx = INTERVALS.indexOf(entry.reviewInterval)
      const nextIdx = Math.min(currentIdx + 1, INTERVALS.length - 1)
      entry.reviewInterval = INTERVALS[nextIdx]!
      entry.nextReviewAt = getNextReviewDate(entry.reviewInterval)

      // Mark as mastered if interval reaches max
      if (entry.reviewInterval >= INTERVALS[INTERVALS.length - 1]!) {
        entry.mastered = true
      }
    } else {
      // Reset to first interval
      entry.reviewInterval = INTERVALS[0]!
      entry.nextReviewAt = getNextReviewDate(INTERVALS[0]!)
      entry.wrongCount++
    }

    setStorage(ERRORS_KEY, errorBook.value)
  }

  function getDueReviewQuestions(): string[] {
    const now = new Date()
    return Object.values(errorBook.value)
      .filter(e => !e.mastered && new Date(e.nextReviewAt) <= now)
      .map(e => e.questionId)
  }

  function getErrorCount(): number {
    return Object.values(errorBook.value).filter(e => !e.mastered).length
  }

  function clearSession() {
    currentSession.value = null
  }

  return {
    currentSession,
    currentQuestion,
    combo,
    maxCombo,
    isComplete,
    sessionStats,
    errorBook,
    history,
    startPractice,
    submitAnswer,
    nextQuestion,
    markMastered,
    updateReviewSchedule,
    getDueReviewQuestions,
    getErrorCount,
    clearSession,
  }
})

function getNextReviewDate(intervalDays: number): string {
  const date = new Date()
  date.setDate(date.getDate() + intervalDays)
  return date.toISOString()
}

import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getStorage, setStorage } from '@/utils/storage'

interface AnswerFeedback {
  questionId: string
  userAnswer: string
  correctAnswer: string
  timestamp: string
  verified: boolean
  isActuallyCorrect: boolean
}

const STORAGE_KEY = 'answer-feedback'

export const useFeedbackStore = defineStore('feedback', () => {
  const feedbacks = ref<AnswerFeedback[]>(getStorage(STORAGE_KEY, []))

  function submitFeedback(questionId: string, userAnswer: string, correctAnswer: string): boolean {
    // Check if already submitted
    const existing = feedbacks.value.find(f => f.questionId === questionId && f.userAnswer === userAnswer)
    if (existing) return existing.isActuallyCorrect

    // Auto-verify: try relaxed comparison
    const isCorrect = autoVerify(userAnswer, correctAnswer)

    const feedback: AnswerFeedback = {
      questionId,
      userAnswer,
      correctAnswer,
      timestamp: new Date().toISOString(),
      verified: true,
      isActuallyCorrect: isCorrect,
    }

    feedbacks.value.push(feedback)
    setStorage(STORAGE_KEY, feedbacks.value)

    return isCorrect
  }

  function getFeedback(questionId: string, userAnswer: string): AnswerFeedback | undefined {
    return feedbacks.value.find(f => f.questionId === questionId && f.userAnswer === userAnswer)
  }

  function getAllFeedbacks(): AnswerFeedback[] {
    return feedbacks.value
  }

  return {
    feedbacks,
    submitFeedback,
    getFeedback,
    getAllFeedbacks,
  }
})

function autoVerify(userAnswer: string, correctAnswer: string): boolean {
  // Normalize both answers aggressively
  const normalize = (s: string): string => {
    s = s.replace(/\$/g, '') // Remove LaTeX delimiters
    s = s.replace(/°[CcFf]?/g, '') // Remove temperature units
    s = s.replace(/[mM元个]/g, '') // Remove common units
    s = s.replace(/\s+/g, '') // Remove all whitespace
    s = s.replace(/,/g, '') // Remove thousand separators
    s = s.toLowerCase()
    return s.trim()
  }

  const nUser = normalize(userAnswer)
  const nCorrect = normalize(correctAnswer)

  // Direct match
  if (nUser === nCorrect) return true

  // Numeric comparison
  const userNum = Number(nUser)
  const correctNum = Number(nCorrect)
  if (!isNaN(userNum) && !isNaN(correctNum) && Math.abs(userNum - correctNum) < 0.0001) return true

  // Fraction comparison
  const parseFrac = (s: string): number | null => {
    if (s.includes('/')) {
      const parts = s.split('/')
      if (parts.length === 2) {
        const n = Number(parts[0])
        const d = Number(parts[1])
        if (!isNaN(n) && !isNaN(d) && d !== 0) return n / d
      }
    }
    return null
  }

  const userFrac = parseFrac(nUser)
  const correctFrac = parseFrac(nCorrect)
  if (userFrac !== null && correctFrac !== null && Math.abs(userFrac - correctFrac) < 0.0001) return true
  if (userFrac !== null && !isNaN(correctNum) && Math.abs(userFrac - correctNum) < 0.0001) return true
  if (!isNaN(userNum) && correctFrac !== null && Math.abs(userNum - correctFrac) < 0.0001) return true

  return false
}

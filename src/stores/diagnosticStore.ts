import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Question } from '@/types/question'
import type { DiagnosticAnswer, DiagnosticResult } from '@/types/diagnostic'
import { generateId } from '@/utils/storage'
import { getStorage, setStorage } from '@/utils/storage'
import { checkAnswer } from '@/utils/latex'

const STORAGE_KEY = 'diagnostic-history'

export const useDiagnosticStore = defineStore('diagnostic', () => {
  const currentQuestions = ref<Question[]>([])
  const currentIndex = ref(0)
  const answers = ref<DiagnosticAnswer[]>([])
  const startTime = ref(0)
  const questionStartTime = ref(0)
  const isComplete = ref(false)
  const history = ref<DiagnosticResult[]>(getStorage(STORAGE_KEY, []))

  const currentQuestion = computed(() => currentQuestions.value[currentIndex.value])
  const progress = computed(() => currentIndex.value / currentQuestions.value.length)
  const correctCount = computed(() => answers.value.filter(a => a.correct).length)
  const elapsedSeconds = computed(() => Math.floor((Date.now() - startTime.value) / 1000))

  function startTest(questions: Question[]) {
    currentQuestions.value = questions
    currentIndex.value = 0
    answers.value = []
    startTime.value = Date.now()
    questionStartTime.value = Date.now()
    isComplete.value = false
  }

  function submitAnswer(userAnswer: string): boolean {
    const q = currentQuestion.value
    if (!q) return false

    const responseTime = Date.now() - questionStartTime.value
    const correct = checkAnswer(userAnswer, q.answer)

    answers.value.push({
      questionId: q.id,
      userAnswer,
      correct,
      responseTime,
      knowledgePointId: q.knowledgePointId,
      difficulty: q.difficulty,
    })

    return correct
  }

  function nextQuestion() {
    if (currentIndex.value < currentQuestions.value.length - 1) {
      currentIndex.value++
      questionStartTime.value = Date.now()
    } else {
      isComplete.value = true
    }
  }

  function saveResult(result: DiagnosticResult) {
    history.value.unshift(result)
    setStorage(STORAGE_KEY, history.value)
  }

  return {
    currentQuestions,
    currentIndex,
    answers,
    isComplete,
    history,
    currentQuestion,
    progress,
    correctCount,
    elapsedSeconds,
    startTest,
    submitAnswer,
    nextQuestion,
    saveResult,
  }
})

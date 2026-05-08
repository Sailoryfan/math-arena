<script setup lang="ts">
import { ref, onMounted, computed, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useDiagnosticStore } from '@/stores/diagnosticStore'
import type { Question } from '@/types/question'
import { renderLatex } from '@/utils/latex'
import { useFeedbackStore } from '@/stores/feedbackStore'

const router = useRouter()
const diagStore = useDiagnosticStore()
const feedbackStore = useFeedbackStore()

const loading = ref(true)
const selectedAnswer = ref('')
const feedback = ref<{ correct: boolean; solution: string } | null>(null)
const inputAnswer = ref('')
const timeLeft = ref(900) // 15 minutes
const feedbackMsg = ref('')
const feedbackIsCorrect = ref(false)

let timer: ReturnType<typeof setInterval> | null = null

const currentQ = computed(() => diagStore.currentQuestion)
const progressText = computed(() => `${diagStore.currentIndex + 1} / ${diagStore.currentQuestions.length}`)
const timeDisplay = computed(() => {
  const m = Math.floor(timeLeft.value / 60)
  const s = timeLeft.value % 60
  return `${m}:${s.toString().padStart(2, '0')}`
})
const progressPercent = computed(() => ((diagStore.currentIndex) / diagStore.currentQuestions.length) * 100)

function selectQuestions(allQuestions: Question[]): Question[] {
  const chapter2 = allQuestions.filter(q => q.chapterId === 2)
  const chapter4 = allQuestions.filter(q => q.chapterId === 4)

  // Extract structural pattern: replace formulas and numbers with placeholders
  function getPattern(stem: string): string {
    return stem
      .replace(/\$[^$]+\$/g, '___')  // replace formulas
      .replace(/-?\d+\.?\d*/g, '#')   // replace numbers
      .replace(/\s+/g, ' ')
      .trim()
  }

  // Pick diverse questions: avoid same structural pattern
  function pickDiverse(pool: Question[], count: number): Question[] {
    const shuffled = [...pool].sort(() => Math.random() - 0.5)
    const selected: Question[] = []
    const usedPatterns = new Set<string>()
    const usedKPs = new Map<string, number>()

    for (const q of shuffled) {
      if (selected.length >= count) break

      const pattern = getPattern(q.stem)
      const kp = q.knowledgePoint || ''
      const kpCount = usedKPs.get(kp) || 0

      // Skip if same structural pattern already selected
      if (usedPatterns.has(pattern)) continue
      // Limit max 2 questions per knowledge point
      if (kpCount >= 2) continue

      selected.push(q)
      usedPatterns.add(pattern)
      usedKPs.set(kp, kpCount + 1)
    }

    // If not enough diverse questions, fill from remaining
    if (selected.length < count) {
      const selectedIds = new Set(selected.map(q => q.id))
      const remaining = shuffled.filter(q => !selectedIds.has(q.id))
      for (const q of remaining) {
        if (selected.length >= count) break
        selected.push(q)
      }
    }

    return selected
  }

  const selected = [
    ...pickDiverse(chapter2, 11),
    ...pickDiverse(chapter4, 9),
  ]
  return selected.sort(() => Math.random() - 0.5)
}

async function loadQuestions() {
  try {
    const res = await fetch('/data/questions.json')
    const allQuestions: Question[] = await res.json()
    const selected = selectQuestions(allQuestions)
    diagStore.startTest(selected)
  } catch (e) {
    console.error('Failed to load questions:', e)
  } finally {
    loading.value = false
  }
}

function handleSubmit() {
  if (feedback.value) return
  const answer = currentQ.value?.type === 'choice' ? selectedAnswer.value : inputAnswer.value
  if (!answer) return

  const correct = diagStore.submitAnswer(answer)
  const solution = currentQ.value?.solution || ''
  feedback.value = { correct, solution }
}

function handleNext() {
  feedback.value = null
  selectedAnswer.value = ''
  inputAnswer.value = ''
  feedbackMsg.value = ''
  diagStore.nextQuestion()

  if (diagStore.isComplete) {
    router.push('/onboarding/result')
  }
}

function handleAnswerFeedback() {
  if (!currentQ.value) return
  const answer = currentQ.value.type === 'choice' ? selectedAnswer.value : inputAnswer.value
  if (!answer) return

  const isCorrect = feedbackStore.submitFeedback(currentQ.value.id, answer, currentQ.value.answer)
  feedbackIsCorrect.value = isCorrect

  if (isCorrect) {
    feedbackMsg.value = '✓ 验证通过！你的答案是正确的。'
  } else {
    feedbackMsg.value = '答案已记录，我们会核实。感谢反馈！'
  }
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && feedback.value) {
    handleNext()
  }
}

onMounted(() => {
  loadQuestions()
  timer = setInterval(() => {
    if (timeLeft.value > 0) {
      timeLeft.value--
    } else {
      router.push('/onboarding/result')
    }
  }, 1000)
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <div class="diagnostic-page">
    <div class="header">
      <div class="header-top">
        <button class="exit-btn" @click="router.push('/')">✕ 退出</button>
        <span class="progress-text">{{ progressText }}</span>
        <span class="time" :class="{ urgent: timeLeft < 120 }">⏱️ {{ timeDisplay }}</span>
      </div>
      <div class="progress-bar-bg">
        <div class="progress-bar-fill" :style="{ width: progressPercent + '%' }"></div>
      </div>
    </div>

    <div v-if="loading" class="loading">加载题目中...</div>

    <div v-else-if="currentQ && !diagStore.isComplete" class="question-area">
      <div class="question-card">
        <div class="question-meta">
          <span class="difficulty">
            <span v-for="i in 5" :key="i" :class="{ active: i <= currentQ.difficulty }">★</span>
          </span>
          <span class="tag">{{ currentQ.knowledgePoint }}</span>
        </div>
        <div class="question-stem" v-html="renderLatex(currentQ.stem)"></div>

        <div v-if="currentQ.type === 'choice'" class="options">
          <button
            v-for="(opt, idx) in currentQ.options"
            :key="idx"
            :class="['option-btn', {
              selected: selectedAnswer === String.fromCharCode(65 + idx),
              correct: feedback && String.fromCharCode(65 + idx) === currentQ.answer,
              wrong: feedback && selectedAnswer === String.fromCharCode(65 + idx) && selectedAnswer !== currentQ.answer
            }]"
            :disabled="!!feedback"
            @click="selectedAnswer = String.fromCharCode(65 + idx)"
          >
            <span class="option-label">{{ String.fromCharCode(65 + idx) }}</span>
            <span v-html="renderLatex(opt)"></span>
          </button>
        </div>

        <div v-else class="fill-blank-area">
          <div class="input-row">
            <input
              v-model="inputAnswer"
              class="answer-input"
              placeholder="输入答案"
              :disabled="!!feedback"
              @keyup.enter="!feedback && handleSubmit()"
            />
          </div>
          <div class="numpad">
            <button v-for="n in ['7','8','9','4','5','6','1','2','3','-','0','/','.']" :key="n"
              class="numpad-btn" :disabled="!!feedback"
              @click="inputAnswer += n">{{ n }}</button>
            <button class="numpad-btn del" :disabled="!!feedback"
              @click="inputAnswer = inputAnswer.slice(0, -1)">←</button>
          </div>
        </div>
      </div>

      <div v-if="feedback" class="feedback" :class="feedback.correct ? 'correct' : 'wrong'">
        <div class="feedback-icon">{{ feedback.correct ? '✓ 回答正确！' : '✗ 回答错误' }}</div>
        <div v-if="!feedback.correct" class="correct-answer">
          正确答案：<strong v-html="renderLatex(currentQ.answer)"></strong>
        </div>
        <div v-if="!feedback.correct" class="feedback-area">
          <button class="feedback-btn" @click="handleAnswerFeedback">
            🤔 答案有误？点击反馈
          </button>
          <div v-if="feedbackMsg" class="feedback-msg" :class="feedbackIsCorrect ? 'feedback-correct' : 'feedback-pending'">
            {{ feedbackMsg }}
          </div>
        </div>
        <div class="solution" v-html="renderLatex(feedback.solution)"></div>
        <button class="next-btn" @click="handleNext">
          {{ diagStore.currentIndex >= diagStore.currentQuestions.length - 1 ? '查看结果' : '下一题' }}
        </button>
      </div>

      <button v-else class="submit-btn" :disabled="!selectedAnswer && !inputAnswer" @click="handleSubmit">
        提交答案
      </button>
    </div>
  </div>
</template>

<style scoped>
.diagnostic-page {
  min-height: 100vh;
  background: #0f1923;
  padding: 16px;
  max-width: 600px;
  margin: 0 auto;
}

.header {
  margin-bottom: 24px;
}

.header-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.exit-btn {
  background: none;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  color: rgba(255, 255, 255, 0.6);
  font-size: 12px;
  padding: 4px 10px;
  cursor: pointer;
}

.exit-btn:hover {
  border-color: #ff4757;
  color: #ff4757;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  color: #fff;
  font-size: 14px;
}

.time.urgent {
  color: #ff4757;
  animation: pulse 1s infinite;
}

@keyframes pulse {
  50% { opacity: 0.5; }
}

.progress-bar-bg {
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
}

.progress-bar-fill {
  height: 100%;
  background: #ffd700;
  border-radius: 3px;
  transition: width 0.3s;
}

.loading {
  text-align: center;
  color: #fff;
  padding: 60px;
  font-size: 18px;
}

.question-card {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 16px;
}

.question-meta {
  display: flex;
  justify-content: space-between;
  margin-bottom: 16px;
}

.difficulty span {
  color: rgba(255, 255, 255, 0.2);
  font-size: 16px;
}

.difficulty span.active {
  color: #ffd700;
}

.tag {
  background: rgba(255, 215, 0, 0.1);
  color: #ffd700;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
}

.question-stem {
  color: #fff;
  font-size: 18px;
  line-height: 1.6;
  margin-bottom: 20px;
}

.options {
  display: grid;
  gap: 10px;
}

.option-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  background: transparent;
  color: #fff;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
}

.option-btn:hover:not(:disabled) {
  border-color: #ffd700;
  background: rgba(255, 215, 0, 0.05);
}

.option-btn.selected {
  border-color: #ffd700;
  background: rgba(255, 215, 0, 0.1);
}

.option-btn.correct {
  border-color: #2ed573;
  background: rgba(46, 213, 115, 0.1);
}

.option-btn.wrong {
  border-color: #ff4757;
  background: rgba(255, 71, 87, 0.1);
}

.option-label {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  flex-shrink: 0;
}

.fill-blank-area {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.answer-input {
  width: 100%;
  padding: 14px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.05);
  color: #fff;
  font-size: 20px;
  text-align: center;
  box-sizing: border-box;
}

.answer-input:focus {
  outline: none;
  border-color: #ffd700;
}

.numpad {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.numpad-btn {
  padding: 12px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  color: #fff;
  font-size: 18px;
  cursor: pointer;
}

.numpad-btn:hover:not(:disabled) {
  border-color: #ffd700;
}

.numpad-btn.del {
  background: rgba(255, 71, 87, 0.1);
  border-color: rgba(255, 71, 87, 0.3);
}

.submit-btn, .next-btn {
  width: 100%;
  padding: 14px;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
}

.submit-btn {
  background: linear-gradient(135deg, #ffd700, #ff8c00);
  color: #1a1a2e;
}

.submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.next-btn {
  background: #2ed573;
  color: #fff;
  margin-top: 12px;
}

.feedback {
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 16px;
}

.feedback.correct {
  background: rgba(46, 213, 115, 0.1);
  border: 1px solid rgba(46, 213, 115, 0.3);
}

.feedback.wrong {
  background: rgba(255, 71, 87, 0.1);
  border: 1px solid rgba(255, 71, 87, 0.3);
}

.feedback-icon {
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 8px;
}

.feedback.correct .feedback-icon { color: #2ed573; }
.feedback.wrong .feedback-icon { color: #ff4757; }

.correct-answer {
  color: #fff;
  margin-bottom: 8px;
}

.feedback-area {
  margin-top: 8px;
  text-align: center;
}

.feedback-btn {
  background: rgba(255, 165, 0, 0.15);
  border: 1px solid rgba(255, 165, 0, 0.3);
  border-radius: 8px;
  color: #ffa500;
  padding: 8px 16px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.feedback-btn:hover {
  background: rgba(255, 165, 0, 0.25);
  border-color: #ffa500;
}

.feedback-msg {
  margin-top: 8px;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 13px;
}

.feedback-correct {
  background: rgba(46, 213, 115, 0.15);
  border: 1px solid rgba(46, 213, 115, 0.3);
  color: #2ed573;
}

.feedback-pending {
  background: rgba(255, 165, 0, 0.1);
  border: 1px solid rgba(255, 165, 0, 0.2);
  color: #ffa500;
}

.solution {
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
  line-height: 1.6;
}
</style>

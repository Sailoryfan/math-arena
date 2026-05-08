<script setup lang="ts">
import { ref, onMounted, computed, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { usePracticeStore } from '@/stores/practiceStore'
import { useLearningPlanStore } from '@/stores/learningPlanStore'
import { useUserStore } from '@/stores/userStore'
import type { Question } from '@/types/question'
import { renderLatex } from '@/utils/latex'
import { useFeedbackStore } from '@/stores/feedbackStore'

const router = useRouter()
const route = useRoute()
const practiceStore = usePracticeStore()
const planStore = useLearningPlanStore()
const userStore = useUserStore()
const feedbackStore = useFeedbackStore()

const loading = ref(true)
const selectedAnswer = ref('')
const inputAnswer = ref('')
const feedback = ref<{ correct: boolean; solution: string } | null>(null)
const timeLeft = ref(0)
const startTime = ref(0)
const feedbackMsg = ref('')
const feedbackIsCorrect = ref(false)

let timer: ReturnType<typeof setInterval> | null = null

const currentQ = computed(() => practiceStore.currentQuestion)
const combo = computed(() => practiceStore.combo)
const isComplete = computed(() => practiceStore.isComplete)
const stats = computed(() => practiceStore.sessionStats)

const progressText = computed(() => {
  const session = practiceStore.currentSession
  if (!session) return ''
  return `${session.currentIndex + 1} / ${session.questions.length}`
})

const elapsedDisplay = computed(() => {
  const elapsed = Math.floor((Date.now() - startTime.value) / 1000)
  const m = Math.floor(elapsed / 60)
  const s = elapsed % 60
  return `${m}:${s.toString().padStart(2, '0')}`
})

onMounted(async () => {
  const count = parseInt(route.query.count as string) || 10
  const kpId = route.query.kpId as string || ''
  const taskId = route.query.taskId as string || ''

  await loadQuestions(count, kpId)
  startTime.value = Date.now()

  timer = setInterval(() => {
    timeLeft.value++
  }, 1000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})

async function loadQuestions(count: number, kpId: string) {
  try {
    const res = await fetch('/data/questions.json')
    const allQuestions: Question[] = await res.json()

    let pool = allQuestions
    if (kpId) {
      const kps = kpId.split(',')
      pool = allQuestions.filter(q => kps.includes(q.knowledgePointId))
    }

    // Shuffle and pick
    const shuffled = [...pool].sort(() => Math.random() - 0.5)
    const selected = shuffled.slice(0, count)

    practiceStore.startPractice(selected)
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

  const correct = practiceStore.submitAnswer(answer)
  const solution = currentQ.value?.solution || ''
  feedback.value = { correct, solution }

  if (correct) {
    userStore.addExp(5 + combo.value * 2)
    userStore.addGold(2)
    userStore.updateStats(true)
  } else {
    userStore.updateStats(false)
  }
}

function handleNext() {
  feedback.value = null
  selectedAnswer.value = ''
  inputAnswer.value = ''
  practiceStore.nextQuestion()

  // Update plan task progress
  const taskId = route.query.taskId as string
  if (taskId) {
    planStore.updateTaskProgress(taskId, 1)
  }
}

function goBack() {
  practiceStore.clearSession()
  router.back()
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
</script>

<template>
  <div class="practice-page">
    <div class="header">
      <button class="back-btn" @click="goBack">←</button>
      <div class="progress-info">
        <span class="progress-text">{{ progressText }}</span>
        <span class="time">⏱️ {{ elapsedDisplay }}</span>
      </div>
      <div class="combo-display" v-if="combo >= 2">
        <span class="combo-fire">🔥</span>
        <span class="combo-count">{{ combo }}连击</span>
      </div>
    </div>

    <div class="progress-bar-bg">
      <div class="progress-bar-fill" :style="{ width: (practiceStore.currentSession ? (practiceStore.currentSession.currentIndex / practiceStore.currentSession.questions.length * 100) : 0) + '%' }"></div>
    </div>

    <div v-if="loading" class="loading">加载题目中...</div>

    <div v-else-if="isComplete" class="result-page">
      <div class="result-icon">{{ stats && stats.accuracy >= 80 ? '🎉' : stats && stats.accuracy >= 60 ? '👍' : '💪' }}</div>
      <div class="result-title">练习完成！</div>

      <div class="stats-grid" v-if="stats">
        <div class="stat-card">
          <div class="stat-value" :class="{ good: stats.accuracy >= 80 }">{{ stats.accuracy }}%</div>
          <div class="stat-label">正确率</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ stats.correct }}/{{ stats.total }}</div>
          <div class="stat-label">答对题数</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ Math.floor(stats.totalTime / 60000) }}分{{ Math.floor((stats.totalTime % 60000) / 1000) }}秒</div>
          <div class="stat-label">用时</div>
        </div>
        <div class="stat-card">
          <div class="stat-value fire">{{ stats.maxCombo }}</div>
          <div class="stat-label">最高连击</div>
        </div>
      </div>

      <div class="result-actions">
        <button class="btn-primary" @click="goBack">返回</button>
        <button class="btn-secondary" @click="$router.push('/errors')">查看错题</button>
      </div>
    </div>

    <div v-else-if="currentQ" class="question-area">
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
        <button class="next-btn" @click="handleNext">下一题</button>
      </div>

      <button v-else class="submit-btn" :disabled="!selectedAnswer && !inputAnswer" @click="handleSubmit">
        提交答案
      </button>
    </div>
  </div>
</template>

<style scoped>
.practice-page {
  min-height: 100vh;
  background: #0f1923;
  padding: 16px;
  max-width: 600px;
  margin: 0 auto;
}

.header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.back-btn {
  background: none;
  border: none;
  color: #fff;
  font-size: 24px;
  cursor: pointer;
  padding: 4px;
}

.progress-info {
  flex: 1;
  display: flex;
  justify-content: space-between;
  color: #fff;
  font-size: 14px;
}

.combo-display {
  display: flex;
  align-items: center;
  gap: 4px;
  background: rgba(255, 100, 0, 0.2);
  padding: 4px 12px;
  border-radius: 20px;
  animation: pulse 0.5s;
}

@keyframes pulse {
  50% { transform: scale(1.1); }
}

.combo-fire {
  font-size: 18px;
}

.combo-count {
  color: #ff6b35;
  font-size: 14px;
  font-weight: bold;
}

.progress-bar-bg {
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  margin-bottom: 20px;
}

.progress-bar-fill {
  height: 100%;
  background: #ffd700;
  border-radius: 3px;
  transition: width 0.3s;
}

.loading {
  text-align: center;
  color: rgba(255, 255, 255, 0.5);
  padding: 60px;
  font-size: 18px;
}

/* Result page */
.result-page {
  text-align: center;
  padding: 40px 0;
}

.result-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.result-title {
  color: #ffd700;
  font-size: 28px;
  font-weight: bold;
  margin-bottom: 32px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-bottom: 32px;
}

.stat-card {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 20px;
}

.stat-value {
  color: #fff;
  font-size: 28px;
  font-weight: bold;
}

.stat-value.good {
  color: #2ed573;
}

.stat-value.fire {
  color: #ff6b35;
}

.stat-label {
  color: rgba(255, 255, 255, 0.5);
  font-size: 12px;
  margin-top: 4px;
}

.result-actions {
  display: flex;
  gap: 12px;
}

.btn-primary, .btn-secondary {
  flex: 1;
  padding: 14px;
  border-radius: 12px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  border: none;
}

.btn-primary {
  background: linear-gradient(135deg, #ffd700, #ff8c00);
  color: #1a1a2e;
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

/* Question area */
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

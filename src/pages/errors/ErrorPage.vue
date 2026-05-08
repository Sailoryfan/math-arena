<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { usePracticeStore } from '@/stores/practiceStore'
import type { Question } from '@/types/question'
import { renderLatex, checkAnswer } from '@/utils/latex'
import { useFeedbackStore } from '@/stores/feedbackStore'

const router = useRouter()
const practiceStore = usePracticeStore()
const feedbackStore = useFeedbackStore()

const loading = ref(true)
const errorQuestions = ref<Question[]>([])
const currentIndex = ref(0)
const selectedAnswer = ref('')
const inputAnswer = ref('')
const feedback = ref<{ correct: boolean; solution: string } | null>(null)
const feedbackMsg = ref('')
const feedbackIsCorrect = ref(false)

const currentQ = computed(() => errorQuestions.value[currentIndex.value])
const hasErrors = computed(() => errorQuestions.value.length > 0)
const progressText = computed(() => `${currentIndex.value + 1} / ${errorQuestions.value.length}`)

onMounted(async () => {
  await loadErrorQuestions()
})

async function loadErrorQuestions() {
  try {
    const res = await fetch('/data/questions.json')
    const allQuestions: Question[] = await res.json()

    // Get error question IDs from practice store
    const errorIds = Object.keys(practiceStore.errorBook)
      .filter(id => !practiceStore.errorBook[id]?.mastered)

    // Filter and sort by wrong count (most wrong first)
    errorQuestions.value = allQuestions
      .filter(q => errorIds.includes(q.id))
      .sort((a, b) => {
        const aCount = practiceStore.errorBook[a.id]?.wrongCount || 0
        const bCount = practiceStore.errorBook[b.id]?.wrongCount || 0
        return bCount - aCount
      })
  } catch (e) {
    console.error('Failed to load error questions:', e)
  } finally {
    loading.value = false
  }
}

function handleSubmit() {
  if (feedback.value || !currentQ.value) return
  const answer = currentQ.value.type === 'choice' ? selectedAnswer.value : inputAnswer.value
  if (!answer) return

  const correct = currentQ.value.type === 'choice'
    ? answer === currentQ.value.answer
    : checkAnswer(answer, currentQ.value.answer)
  feedback.value = { correct, solution: currentQ.value.solution || '' }

  // Update spaced repetition schedule
  practiceStore.updateReviewSchedule(currentQ.value.id, correct)
}

function handleNext() {
  feedback.value = null
  selectedAnswer.value = ''
  inputAnswer.value = ''

  if (currentIndex.value < errorQuestions.value.length - 1) {
    currentIndex.value++
  } else {
    // All errors reviewed
    currentIndex.value = 0
    loadErrorQuestions() // Reload to get remaining errors
  }
}

function markMastered() {
  if (!currentQ.value) return
  practiceStore.markMastered(currentQ.value.id)
  handleNext()
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
  <div class="error-page">
    <div class="header">
      <button class="back-btn" @click="router.push('/')">←</button>
      <h1>错题重做</h1>
      <span class="count">{{ Object.values(practiceStore.errorBook).filter(e => !e.mastered).length }} 道</span>
    </div>

    <div v-if="loading" class="loading">加载中...</div>

    <div v-else-if="!hasErrors" class="empty">
      <div class="empty-icon">✨</div>
      <div class="empty-title">没有错题</div>
      <div class="empty-desc">继续保持，你做得很好！</div>
      <button class="btn-primary" @click="router.push('/')">返回首页</button>
    </div>

    <div v-else class="content">
      <div class="progress-info">
        <span>{{ progressText }}</span>
        <div class="wrong-count" v-if="currentQ && practiceStore.errorBook[currentQ.id]">
          已错 {{ practiceStore.errorBook[currentQ.id]?.wrongCount }} 次
        </div>
      </div>

      <div v-if="currentQ" class="question-card">
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
            <button v-for="n in ['7','8','9','4','5','6','1','2','3','-','0','.']" :key="n"
              class="numpad-btn" :disabled="!!feedback"
              @click="inputAnswer += n">{{ n }}</button>
            <button class="numpad-btn del" :disabled="!!feedback"
              @click="inputAnswer = inputAnswer.slice(0, -1)">←</button>
          </div>
        </div>
      </div>

      <div v-if="feedback" class="feedback" :class="feedback.correct ? 'correct' : 'wrong'">
        <div class="feedback-icon">{{ feedback.correct ? '✓ 回答正确！' : '✗ 再想想' }}</div>
        <div v-if="!feedback.correct" class="correct-answer">
          正确答案：<strong v-html="renderLatex(currentQ?.answer || '')"></strong>
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
        <div class="feedback-actions">
          <button class="next-btn" @click="handleNext">下一题</button>
          <button v-if="feedback.correct" class="mastered-btn" @click="markMastered">已掌握，移除</button>
        </div>
      </div>

      <button v-else class="submit-btn" :disabled="!selectedAnswer && !inputAnswer" @click="handleSubmit">
        提交答案
      </button>
    </div>

    <nav class="bottom-nav">
      <router-link to="/" class="nav-item">
        <span class="nav-icon">🏠</span>
        <span class="nav-label">首页</span>
      </router-link>
      <router-link to="/plan" class="nav-item">
        <span class="nav-icon">📋</span>
        <span class="nav-label">计划</span>
      </router-link>
      <router-link to="/errors" class="nav-item active">
        <span class="nav-icon">❌</span>
        <span class="nav-label">错题</span>
      </router-link>
      <router-link to="/my" class="nav-item">
        <span class="nav-icon">👤</span>
        <span class="nav-label">我的</span>
      </router-link>
    </nav>
  </div>
</template>

<style scoped>
.error-page {
  min-height: 100vh;
  background: #0f1923;
  padding: 16px;
  padding-bottom: 80px;
  max-width: 600px;
  margin: 0 auto;
}

.header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.back-btn {
  background: none;
  border: none;
  color: #fff;
  font-size: 24px;
  cursor: pointer;
  padding: 4px;
}

.header h1 {
  flex: 1;
  color: #fff;
  font-size: 20px;
  margin: 0;
}

.count {
  color: #ff4757;
  font-size: 14px;
}

.loading {
  text-align: center;
  color: rgba(255, 255, 255, 0.5);
  padding: 60px;
}

.empty {
  text-align: center;
  padding: 60px 20px;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.empty-title {
  color: #ffd700;
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 8px;
}

.empty-desc {
  color: rgba(255, 255, 255, 0.5);
  font-size: 16px;
  margin-bottom: 24px;
}

.btn-primary {
  background: linear-gradient(135deg, #ffd700, #ff8c00);
  color: #1a1a2e;
  border: none;
  padding: 14px 32px;
  border-radius: 12px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  color: rgba(255, 255, 255, 0.5);
  font-size: 14px;
}

.wrong-count {
  color: #ff4757;
  font-size: 12px;
  background: rgba(255, 71, 87, 0.1);
  padding: 4px 10px;
  border-radius: 8px;
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

.submit-btn {
  width: 100%;
  padding: 14px;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  background: linear-gradient(135deg, #ffd700, #ff8c00);
  color: #1a1a2e;
}

.submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
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
  margin-bottom: 12px;
}

.feedback-actions {
  display: flex;
  gap: 12px;
}

.next-btn {
  flex: 1;
  padding: 12px;
  border: none;
  border-radius: 10px;
  font-size: 15px;
  font-weight: bold;
  cursor: pointer;
  background: #2ed573;
  color: #fff;
}

.mastered-btn {
  padding: 12px 16px;
  border: 1px solid rgba(255, 215, 0, 0.3);
  border-radius: 10px;
  background: transparent;
  color: #ffd700;
  font-size: 13px;
  cursor: pointer;
}

.mastered-btn:hover {
  background: rgba(255, 215, 0, 0.1);
}

.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  background: rgba(15, 25, 35, 0.95);
  backdrop-filter: blur(10px);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding: 8px 0;
  max-width: 500px;
  margin: 0 auto;
}

.nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  text-decoration: none;
  color: rgba(255, 255, 255, 0.4);
  font-size: 10px;
}

.nav-item.active {
  color: #ffd700;
}

.nav-icon {
  font-size: 20px;
}
</style>

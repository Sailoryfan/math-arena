<script setup lang="ts">
import { ref, onMounted, computed, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { usePvpStore } from '@/stores/pvpStore'
import { useUserStore } from '@/stores/userStore'
import type { Question } from '@/types/question'
import { renderLatex, checkAnswer } from '@/utils/latex'

const router = useRouter()
const pvpStore = usePvpStore()
const userStore = useUserStore()

const questions = ref<Question[]>([])
const selectedAnswer = ref('')
const inputAnswer = ref('')
const questionStartTime = ref(0)
const timer = ref(15)
const showResult = ref(false)
let timerInterval: number | null = null

const currentQ = computed(() => questions.value[pvpStore.currentMatch?.currentQuestion || 0])

onMounted(async () => {
  await loadQuestions()
})

onUnmounted(() => {
  if (timerInterval) clearInterval(timerInterval)
})

async function loadQuestions() {
  try {
    const res = await fetch('/data/questions.json')
    const allQuestions: Question[] = await res.json()

    // Remove duplicates by id
    const uniqueQuestions = [...new Map(allQuestions.map(q => [q.id, q])).values()]

    // Shuffle and take 10 questions for the match
    const shuffled = [...uniqueQuestions].sort(() => Math.random() - 0.5)
    questions.value = shuffled.slice(0, 10)
  } catch (e) {
    console.error('Failed to load questions:', e)
  }
}

function startMatch() {
  pvpStore.startMatch()
  questionStartTime.value = Date.now()
  timer.value = 15
  startTimer()
}

function startTimer() {
  if (timerInterval) clearInterval(timerInterval)
  timerInterval = window.setInterval(() => {
    timer.value--
    if (timer.value <= 0) {
      handleSubmit(true) // Time up, auto wrong
    }
  }, 1000)
}

function handleSubmit(timedOut = false) {
  if (!pvpStore.currentMatch || pvpStore.currentMatch.isOver) return

  const answer = currentQ.value?.type === 'choice' ? selectedAnswer.value : inputAnswer.value
  if (!answer && !timedOut) return

  const correct = !timedOut && currentQ.value
    ? (currentQ.value.type === 'choice'
      ? answer === currentQ.value.answer
      : checkAnswer(answer, currentQ.value.answer))
    : false
  const timeUsed = Date.now() - questionStartTime.value

  pvpStore.submitAnswer(correct, timeUsed)

  selectedAnswer.value = ''
  inputAnswer.value = ''

  if (pvpStore.currentMatch.isOver) {
    showResult.value = true
    if (timerInterval) clearInterval(timerInterval)
  } else {
    timer.value = 15
    questionStartTime.value = Date.now()
  }
}

function getRankColor(rank: string): string {
  const tier = pvpStore.RANK_TIERS.find(t => t.name === rank)
  return tier?.color || '#c0c0c0'
}

function getResultText(): string {
  if (!pvpStore.currentMatch) return ''
  if (pvpStore.currentMatch.isVictory === true) return '胜利！'
  if (pvpStore.currentMatch.isVictory === false) return '失败...'
  return '平局'
}

function getResultIcon(): string {
  if (!pvpStore.currentMatch) return ''
  if (pvpStore.currentMatch.isVictory === true) return '🎉'
  if (pvpStore.currentMatch.isVictory === false) return '😢'
  return '🤝'
}

function goBack() {
  pvpStore.currentMatch = null
  showResult.value = false
  router.push('/')
}
</script>

<template>
  <div class="pvp-page">
    <div class="header">
      <button class="back-btn" @click="goBack">←</button>
      <h1>排位对战</h1>
    </div>

    <!-- Lobby (before match) -->
    <div v-if="!pvpStore.currentMatch && !pvpStore.isMatching" class="lobby">
      <div class="rank-display">
        <div class="rank-icon" :style="{ color: pvpStore.currentTier.color }">
          {{ pvpStore.currentTier.icon }}
        </div>
        <div class="rank-info">
          <div class="rank-name" :style="{ color: pvpStore.currentTier.color }">
            {{ pvpStore.rankName }}
          </div>
          <div class="rank-stars">
            <span v-for="i in pvpStore.currentTier.maxStars - pvpStore.currentTier.minStars + 1" :key="i"
              :class="{ filled: pvpStore.rankStars >= pvpStore.currentTier.minStars + i - 1 }">★</span>
          </div>
          <div class="rank-progress">
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: pvpStore.getRankProgress() + '%' }"></div>
            </div>
          </div>
        </div>
      </div>

      <div class="stats-grid">
        <div class="stat-item">
          <div class="stat-value">{{ pvpStore.totalMatches }}</div>
          <div class="stat-label">总场次</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">{{ pvpStore.winRate }}%</div>
          <div class="stat-label">胜率</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">{{ pvpStore.winStreak }}</div>
          <div class="stat-label">连胜</div>
        </div>
      </div>

      <button class="match-btn" @click="startMatch">
        <span class="match-icon">⚔️</span>
        <span class="match-text">开始匹配</span>
      </button>

      <div class="rules-card">
        <div class="rules-title">📋 对战规则</div>
        <ul class="rules-list">
          <li>双方同时回答10道数学题</li>
          <li>每题15秒限时</li>
          <li>答对得分 = 100 + 剩余时间奖励</li>
          <li>10题结束后总分高者获胜</li>
          <li>连胜3场额外获得1颗星</li>
          <li>青铜段位不会掉星</li>
        </ul>
      </div>
    </div>

    <!-- Matching -->
    <div v-if="pvpStore.isMatching" class="matching">
      <div class="match-spinner">
        <div class="spinner-ring"></div>
        <div class="spinner-icon">⚔️</div>
      </div>
      <div class="match-text">正在匹配对手...</div>
      <button class="cancel-btn" @click="pvpStore.cancelMatch()">取消匹配</button>
    </div>

    <!-- Battle -->
    <div v-if="pvpStore.currentMatch && !pvpStore.currentMatch.isOver" class="battle">
      <!-- Scores -->
      <div class="scores">
        <div class="player-score">
          <div class="score-avatar">{{ userStore.profile.avatar }}</div>
          <div class="score-name">{{ userStore.profile.nickname }}</div>
          <div class="score-value">{{ pvpStore.currentMatch.playerScore }}</div>
        </div>
        <div class="vs">VS</div>
        <div class="opponent-score">
          <div class="score-avatar">{{ pvpStore.currentMatch.opponent.avatar }}</div>
          <div class="score-name">{{ pvpStore.currentMatch.opponent.name }}</div>
          <div class="score-value">{{ pvpStore.currentMatch.opponentScore }}</div>
        </div>
      </div>

      <!-- Progress -->
      <div class="progress-info">
        <span>第 {{ pvpStore.currentMatch.currentQuestion + 1 }} / {{ pvpStore.currentMatch.totalQuestions }} 题</span>
        <span class="timer" :class="{ urgent: timer <= 5 }">{{ timer }}s</span>
      </div>

      <!-- Battle history -->
      <div v-if="pvpStore.currentMatch.playerAnswers.length > 0" class="battle-history">
        <div class="bh-title">答题记录</div>
        <div class="bh-list">
          <div
            v-for="(pa, idx) in pvpStore.currentMatch.playerAnswers"
            :key="idx"
            class="bh-item"
          >
            <span class="bh-num">Q{{ idx + 1 }}</span>
            <span class="bh-player" :class="pa.correct ? 'correct' : 'wrong'">
              {{ pa.correct ? '✓' : '✗' }} {{ (pa.time / 1000).toFixed(1) }}s
            </span>
            <span class="bh-vs">|</span>
            <span class="bh-opponent" :class="pvpStore.currentMatch.opponentAnswers[idx]?.correct ? 'correct' : 'wrong'">
              {{ pvpStore.currentMatch.opponentAnswers[idx]?.correct ? '✓' : '✗' }}
              {{ ((pvpStore.currentMatch.opponentAnswers[idx]?.time || 0) / 1000).toFixed(1) }}s
            </span>
            <span class="bh-score">
              {{ pa.correct ? '+' + (100 + Math.max(0, Math.floor((15000 - pa.time) / 100))) : 0 }}
            </span>
          </div>
        </div>
      </div>

      <!-- Question -->
      <div v-if="currentQ" class="question-card">
        <div class="question-stem" v-html="renderLatex(currentQ.stem)"></div>

        <div v-if="currentQ.type === 'choice'" class="options">
          <button
            v-for="(opt, idx) in currentQ.options"
            :key="idx"
            :class="['option-btn', { selected: selectedAnswer === String.fromCharCode(65 + idx) }]"
            @click="selectedAnswer = String.fromCharCode(65 + idx)"
          >
            <span class="option-label">{{ String.fromCharCode(65 + idx) }}</span>
            <span v-html="renderLatex(opt)"></span>
          </button>
        </div>

        <div v-else class="fill-blank-area">
          <input
            v-model="inputAnswer"
            class="answer-input"
            placeholder="输入答案"
            @keyup.enter="handleSubmit()"
          />
        </div>

        <button class="submit-btn" :disabled="!selectedAnswer && !inputAnswer" @click="handleSubmit()">
          提交答案
        </button>
      </div>
    </div>

    <!-- Result -->
    <div v-if="showResult && pvpStore.currentMatch?.isOver" class="result">
      <div class="result-icon">{{ getResultIcon() }}</div>
      <div class="result-title" :class="{
        victory: pvpStore.currentMatch.isVictory === true,
        defeat: pvpStore.currentMatch.isVictory === false
      }">
        {{ getResultText() }}
      </div>

      <div class="result-scores">
        <div class="result-player">
          <div class="result-name">{{ userStore.profile.nickname }}</div>
          <div class="result-score">{{ pvpStore.currentMatch.playerScore }}</div>
        </div>
        <div class="result-vs">:</div>
        <div class="result-opponent">
          <div class="result-name">{{ pvpStore.currentMatch.opponent.name }}</div>
          <div class="result-score">{{ pvpStore.currentMatch.opponentScore }}</div>
        </div>
      </div>

      <div class="result-details">
        <div class="detail-item">
          <span class="detail-label">正确题数</span>
          <span class="detail-value">
            {{ pvpStore.currentMatch.playerAnswers.filter(a => a.correct).length }} / {{ pvpStore.currentMatch.totalQuestions }}
          </span>
        </div>
        <div class="detail-item">
          <span class="detail-label">段位变化</span>
          <span class="detail-value" :style="{ color: pvpStore.currentTier.color }">
            {{ pvpStore.currentTier.icon }} {{ pvpStore.rankName }}
            <span v-if="pvpStore.currentMatch.isVictory === true">+{{ pvpStore.winStreak >= 3 ? 2 : 1 }}★</span>
            <span v-else-if="pvpStore.currentMatch.isVictory === false && pvpStore.rankName !== '青铜'">-1★</span>
          </span>
        </div>
        <div class="detail-item" v-if="pvpStore.winStreak >= 2">
          <span class="detail-label">连胜</span>
          <span class="detail-value fire">🔥 {{ pvpStore.winStreak }} 连胜</span>
        </div>
      </div>

      <!-- Question-by-question breakdown -->
      <div class="result-breakdown">
        <div class="rb-title">每题详情</div>
        <div class="rb-header">
          <span class="rb-col">题号</span>
          <span class="rb-col">你</span>
          <span class="rb-col">对手</span>
          <span class="rb-col">得分</span>
        </div>
        <div
          v-for="(pa, idx) in pvpStore.currentMatch.playerAnswers"
          :key="idx"
          class="rb-row"
        >
          <span class="rb-col rb-num">Q{{ idx + 1 }}</span>
          <span class="rb-col" :class="pa.correct ? 'rb-correct' : 'rb-wrong'">
            {{ pa.correct ? '✓' : '✗' }} {{ (pa.time / 1000).toFixed(1) }}s
          </span>
          <span class="rb-col" :class="pvpStore.currentMatch.opponentAnswers[idx]?.correct ? 'rb-correct' : 'rb-wrong'">
            {{ pvpStore.currentMatch.opponentAnswers[idx]?.correct ? '✓' : '✗' }}
            {{ ((pvpStore.currentMatch.opponentAnswers[idx]?.time || 0) / 1000).toFixed(1) }}s
          </span>
          <span class="rb-col rb-score">
            {{ pa.correct ? '+' + (100 + Math.max(0, Math.floor((15000 - pa.time) / 100))) : 0 }}
          </span>
        </div>
      </div>

      <div class="result-actions">
        <button class="btn-primary" @click="startMatch(); showResult = false">再来一局</button>
        <button class="btn-secondary" @click="goBack">返回首页</button>
      </div>
    </div>

    <nav class="bottom-nav">
      <router-link to="/" class="nav-item">
        <span class="nav-icon">🏠</span>
        <span class="nav-label">首页</span>
      </router-link>
      <router-link to="/adventure" class="nav-item">
        <span class="nav-icon">⚔️</span>
        <span class="nav-label">冒险</span>
      </router-link>
      <router-link to="/pvp" class="nav-item active">
        <span class="nav-icon">🏆</span>
        <span class="nav-label">排位</span>
      </router-link>
      <router-link to="/my" class="nav-item">
        <span class="nav-icon">👤</span>
        <span class="nav-label">我的</span>
      </router-link>
    </nav>
  </div>
</template>

<style scoped>
.pvp-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #1a0a2e 0%, #0f1923 100%);
  padding: 16px;
  padding-bottom: 80px;
  max-width: 500px;
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
}

.header h1 {
  flex: 1;
  color: #ffd700;
  font-size: 20px;
  margin: 0;
}

/* Lobby */
.lobby {
  text-align: center;
}

.rank-display {
  display: flex;
  align-items: center;
  gap: 16px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 20px;
}

.rank-icon {
  font-size: 48px;
}

.rank-info {
  flex: 1;
  text-align: left;
}

.rank-name {
  font-size: 24px;
  font-weight: bold;
}

.rank-stars {
  margin: 8px 0;
}

.rank-stars span {
  color: rgba(255, 255, 255, 0.2);
  font-size: 16px;
  margin-right: 2px;
}

.rank-stars span.filled {
  color: #ffd700;
}

.progress-bar {
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #ffd700, #ff8c00);
  border-radius: 3px;
  transition: width 0.3s;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 24px;
}

.stat-item {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 16px;
}

.stat-value {
  color: #ffd700;
  font-size: 24px;
  font-weight: bold;
}

.stat-label {
  color: rgba(255, 255, 255, 0.5);
  font-size: 12px;
  margin-top: 4px;
}

.match-btn {
  width: 100%;
  padding: 16px;
  border: none;
  border-radius: 16px;
  background: linear-gradient(135deg, #ff6b35, #ff4757);
  color: #fff;
  font-size: 18px;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 24px;
  transition: all 0.2s;
}

.match-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(255, 107, 53, 0.3);
}

.match-icon {
  font-size: 24px;
}

.rules-card {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 12px;
  padding: 16px;
  text-align: left;
}

.rules-title {
  color: #ffd700;
  font-size: 14px;
  font-weight: bold;
  margin-bottom: 12px;
}

.rules-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.rules-list li {
  color: rgba(255, 255, 255, 0.6);
  font-size: 13px;
  padding: 4px 0;
  padding-left: 8px;
  border-left: 2px solid rgba(255, 107, 53, 0.3);
  margin-bottom: 6px;
}

/* Matching */
.matching {
  text-align: center;
  padding: 60px 0;
}

.match-spinner {
  position: relative;
  width: 100px;
  height: 100px;
  margin: 0 auto 24px;
}

.spinner-ring {
  position: absolute;
  inset: 0;
  border: 4px solid rgba(255, 107, 53, 0.2);
  border-top-color: #ff6b35;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.spinner-icon {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40px;
}

.match-text {
  color: rgba(255, 255, 255, 0.7);
  font-size: 16px;
  margin-bottom: 24px;
}

.cancel-btn {
  padding: 10px 24px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  background: transparent;
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
}

/* Battle */
.scores {
  display: flex;
  align-items: center;
  justify-content: space-around;
  margin-bottom: 16px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 16px;
}

.player-score, .opponent-score {
  text-align: center;
}

.score-avatar {
  font-size: 32px;
  margin-bottom: 4px;
}

.score-name {
  color: rgba(255, 255, 255, 0.7);
  font-size: 12px;
  margin-bottom: 4px;
}

.score-value {
  color: #ffd700;
  font-size: 24px;
  font-weight: bold;
}

.vs {
  color: rgba(255, 255, 255, 0.3);
  font-size: 20px;
  font-weight: bold;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
  color: rgba(255, 255, 255, 0.5);
  font-size: 14px;
}

/* Battle history */
.battle-history {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
  padding: 10px;
  margin-bottom: 12px;
  max-height: 150px;
  overflow-y: auto;
}

.bh-title {
  color: rgba(255, 255, 255, 0.4);
  font-size: 11px;
  margin-bottom: 6px;
}

.bh-list {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.bh-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  padding: 3px 0;
}

.bh-num {
  color: rgba(255, 255, 255, 0.4);
  width: 24px;
}

.bh-player, .bh-opponent {
  flex: 1;
  text-align: center;
}

.bh-player.correct, .bh-opponent.correct { color: #2ed573; }
.bh-player.wrong, .bh-opponent.wrong { color: #ff4757; }

.bh-vs {
  color: rgba(255, 255, 255, 0.15);
}

.bh-score {
  color: #ffd700;
  width: 36px;
  text-align: right;
}

.timer {
  color: #ffd700;
  font-weight: bold;
}

.timer.urgent {
  color: #ff4757;
  animation: pulse 0.5s;
}

@keyframes pulse { 50% { transform: scale(1.2); } }

.question-card {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
}

.question-stem {
  color: #fff;
  font-size: 16px;
  line-height: 1.5;
  margin-bottom: 12px;
}

.options {
  display: grid;
  gap: 8px;
  margin-bottom: 12px;
}

.option-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  background: transparent;
  color: #fff;
  font-size: 14px;
  cursor: pointer;
  text-align: left;
}

.option-btn:hover {
  border-color: #ffd700;
}

.option-btn.selected {
  border-color: #ffd700;
  background: rgba(255, 215, 0, 0.1);
}

.option-label {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  flex-shrink: 0;
}

.fill-blank-area {
  margin-bottom: 12px;
}

.answer-input {
  width: 100%;
  padding: 10px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  color: #fff;
  font-size: 16px;
  text-align: center;
  box-sizing: border-box;
}

.answer-input:focus {
  outline: none;
  border-color: #ffd700;
}

.submit-btn {
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: 8px;
  background: linear-gradient(135deg, #ff6b35, #ff4757);
  color: #fff;
  font-size: 15px;
  font-weight: bold;
  cursor: pointer;
}

.submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Result */
.result {
  text-align: center;
  padding: 20px;
}

.result-icon {
  font-size: 64px;
  margin-bottom: 12px;
}

.result-title {
  font-size: 28px;
  font-weight: bold;
  margin-bottom: 20px;
}

.result-title.victory { color: #2ed573; }
.result-title.defeat { color: #ff4757; }

.result-scores {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  margin-bottom: 24px;
}

.result-player, .result-opponent {
  text-align: center;
}

.result-name {
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
  margin-bottom: 4px;
}

.result-score {
  color: #ffd700;
  font-size: 32px;
  font-weight: bold;
}

.result-vs {
  color: rgba(255, 255, 255, 0.3);
  font-size: 24px;
}

.result-details {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 24px;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.detail-item:last-child {
  border-bottom: none;
}

.detail-label {
  color: rgba(255, 255, 255, 0.5);
  font-size: 14px;
}

.detail-value {
  color: #fff;
  font-size: 14px;
  font-weight: bold;
}

.detail-value.fire {
  color: #ff6b35;
}

/* Result breakdown */
.result-breakdown {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 12px;
  margin-bottom: 20px;
}

.rb-title {
  color: rgba(255, 255, 255, 0.5);
  font-size: 12px;
  margin-bottom: 8px;
}

.rb-header, .rb-row {
  display: flex;
  align-items: center;
  padding: 4px 0;
}

.rb-header {
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  margin-bottom: 4px;
}

.rb-header .rb-col {
  color: rgba(255, 255, 255, 0.4);
  font-size: 10px;
}

.rb-col {
  flex: 1;
  text-align: center;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.7);
}

.rb-num {
  width: 28px;
  flex: none;
  color: rgba(255, 255, 255, 0.4);
}

.rb-correct { color: #2ed573; }
.rb-wrong { color: #ff4757; }
.rb-score { color: #ffd700; font-weight: bold; }

.result-actions {
  display: flex;
  gap: 12px;
}

.btn-primary, .btn-secondary {
  flex: 1;
  padding: 12px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
  border: none;
}

.btn-primary {
  background: linear-gradient(135deg, #ff6b35, #ff4757);
  color: #fff;
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
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
  color: #ff6b35;
}

.nav-icon {
  font-size: 20px;
}
</style>

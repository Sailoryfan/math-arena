<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useDungeonStore } from '@/stores/dungeonStore'
import { usePracticeStore } from '@/stores/practiceStore'
import type { Question } from '@/types/question'
import { renderLatex, checkAnswer } from '@/utils/latex'
import { useFeedbackStore } from '@/stores/feedbackStore'

const router = useRouter()
const route = useRoute()
const dungeonStore = useDungeonStore()
const practiceStore = usePracticeStore()
const feedbackStore = useFeedbackStore()

const nodeId = route.params.id as string
const loading = ref(true)
const questions = ref<Question[]>([])
const currentQIdx = ref(0)
const selectedAnswer = ref('')
const inputAnswer = ref('')
const feedback = ref<{ correct: boolean; solution: string } | null>(null)
const selectedCardIdx = ref(-1)
const feedbackMsg = ref('')
const feedbackIsCorrect = ref(false)

// Enemy config based on node type
const nodeType = ref<'battle' | 'elite' | 'boss'>('battle')
const enemyName = ref('怪物')
const enemyIcon = ref('👾')

const currentQ = computed(() => questions.value[currentQIdx.value])

onMounted(async () => {
  if (!dungeonStore.currentRun) {
    router.push('/dungeon')
    return
  }

  // Determine enemy based on node type
  const floor = dungeonStore.currentRun.floor
  const node = dungeonStore.currentRun.map[0]?.nodes.find(n => n.id === nodeId)
  if (node) {
    nodeType.value = node.type as 'battle' | 'elite' | 'boss'
  }

  if (nodeType.value === 'boss') {
    enemyName.value = `第${floor}层BOSS`
    enemyIcon.value = '👹'
    dungeonStore.startBattle(50 + floor * 20, 15 + floor * 3, enemyName.value)
  } else if (nodeType.value === 'elite') {
    enemyName.value = '精英怪物'
    enemyIcon.value = '💀'
    dungeonStore.startBattle(30 + floor * 10, 10 + floor * 2, enemyName.value)
  } else {
    enemyName.value = '普通怪物'
    enemyIcon.value = '👾'
    dungeonStore.startBattle(20 + floor * 8, 8 + floor, enemyName.value)
  }

  await loadQuestions()
})

async function loadQuestions() {
  try {
    const res = await fetch('/data/questions.json')
    const allQuestions: Question[] = await res.json()

    // Remove duplicates by id
    const uniqueQuestions = [...new Map(allQuestions.map(q => [q.id, q])).values()]

    // Shuffle and take 10 questions for the battle
    const shuffled = [...uniqueQuestions].sort(() => Math.random() - 0.5)
    questions.value = shuffled.slice(0, 10)
  } catch (e) {
    console.error('Failed to load questions:', e)
  } finally {
    loading.value = false
  }
}

function selectCard(idx: number) {
  if (feedback.value) return
  const card = dungeonStore.currentRun?.hand[idx]
  if (!card) return
  if ((dungeonStore.currentRun?.energy || 0) < card.cost) return
  selectedCardIdx.value = idx
}

function playCard() {
  if (selectedCardIdx.value < 0 || !currentQ.value) return
  const answer = currentQ.value.type === 'choice' ? selectedAnswer.value : inputAnswer.value
  if (!answer) return

  const correct = currentQ.value.type === 'choice'
    ? answer === currentQ.value.answer
    : checkAnswer(answer, currentQ.value.answer)
  const effectDesc = dungeonStore.playCard(selectedCardIdx.value, correct)
  feedback.value = { correct, solution: currentQ.value.solution || '' }

  selectedCardIdx.value = -1
  selectedAnswer.value = ''
  inputAnswer.value = ''
}

function handleNext() {
  feedback.value = null
  selectedAnswer.value = ''
  inputAnswer.value = ''

  if (dungeonStore.battleState.isBattleOver) {
    if (dungeonStore.battleState.isVictory) {
      dungeonStore.endBattle()
    }
    return
  }

  if (currentQIdx.value < questions.value.length - 1) {
    currentQIdx.value++
  } else {
    // Battle continues until enemy is defeated or player dies
    // No need to reload, the battle should end before questions run out
    // If somehow we run out, just end the battle
    dungeonStore.endBattle()
  }
}

function endTurn() {
  dungeonStore.endPlayerTurn()
  if (dungeonStore.battleState.isBattleOver) {
    if (dungeonStore.battleState.isVictory) {
      dungeonStore.endBattle()
    }
  }
}

function goBack() {
  router.push('/dungeon/map')
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

function getCardColor(type: string): string {
  if (type === 'attack') return '#ff6b35'
  if (type === 'defense') return '#2ed573'
  return '#bb86fc'
}

function getCardBg(type: string): string {
  if (type === 'attack') return 'rgba(255, 107, 53, 0.1)'
  if (type === 'defense') return 'rgba(46, 213, 115, 0.1)'
  return 'rgba(187, 134, 252, 0.1)'
}
</script>

<template>
  <div class="dungeon-battle">
    <div class="header">
      <button class="back-btn" @click="goBack">←</button>
      <h1>{{ enemyName }}</h1>
      <div class="turn-info">回合 {{ dungeonStore.battleState.turn }}</div>
    </div>

    <div v-if="loading" class="loading">加载中...</div>

    <div v-else class="battle-content">
      <!-- Enemy area -->
      <div class="enemy-area">
        <div class="enemy-icon">{{ enemyIcon }}</div>
        <div class="enemy-name">{{ enemyName }}</div>
        <div class="enemy-hp-bar">
          <div
            class="enemy-hp-fill"
            :style="{ width: (dungeonStore.battleState.enemyMaxHP > 0 ? dungeonStore.battleState.enemyHP / dungeonStore.battleState.enemyMaxHP * 100 : 0) + '%' }"
          ></div>
        </div>
        <div class="enemy-hp-text">
          {{ dungeonStore.battleState.enemyHP }}/{{ dungeonStore.battleState.enemyMaxHP }}
        </div>
        <div class="enemy-atk">攻击力: {{ dungeonStore.battleState.enemyAtk }}</div>
      </div>

      <!-- Player stats -->
      <div class="player-stats">
        <div class="player-hp">
          <span class="stat-label">❤️ 生命</span>
          <div class="hp-bar-mini">
            <div
              class="hp-fill-mini"
              :style="{ width: (dungeonStore.currentRun?.playerMaxHP || 1) > 0 ? ((dungeonStore.currentRun?.playerHP || 0) / (dungeonStore.currentRun?.playerMaxHP || 1) * 100) + '%' : '0%' }"
            ></div>
          </div>
          <span class="stat-value">{{ dungeonStore.currentRun?.playerHP }}/{{ dungeonStore.currentRun?.playerMaxHP }}</span>
        </div>
        <div class="player-armor">
          <span class="stat-label">🛡️ 护甲</span>
          <span class="stat-value">{{ dungeonStore.battleState.playerArmor }}</span>
        </div>
        <div class="player-energy">
          <span class="stat-label">⚡ 能量</span>
          <span class="stat-value">{{ dungeonStore.currentRun?.energy }}/{{ dungeonStore.currentRun?.maxEnergy }}</span>
        </div>
      </div>

      <!-- Question area -->
      <div v-if="!dungeonStore.battleState.isBattleOver && currentQ" class="question-area">
        <div class="question-card">
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
            <input
              v-model="inputAnswer"
              class="answer-input"
              placeholder="输入答案"
              :disabled="!!feedback"
              @keyup.enter="!feedback && selectedCardIdx >= 0 && playCard()"
            />
          </div>
        </div>

        <div v-if="feedback" class="feedback" :class="feedback.correct ? 'correct' : 'wrong'">
          <div class="feedback-icon">{{ feedback.correct ? '✓ 答对！卡牌效果全额生效' : '✗ 答错！卡牌效果减半' }}</div>
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
          <button class="next-btn" @click="handleNext">继续</button>
        </div>
      </div>

      <!-- Battle result -->
      <div v-if="dungeonStore.battleState.isBattleOver" class="result">
        <div class="result-icon">{{ dungeonStore.battleState.isVictory ? '🎉' : '💀' }}</div>
        <div class="result-title">{{ dungeonStore.battleState.isVictory ? '胜利！' : '战败...' }}</div>
        <div class="result-reward" v-if="dungeonStore.battleState.isVictory">
          <div class="reward-item">
            <span class="reward-label">获得金币</span>
            <span class="reward-value gold">+{{ 10 + (dungeonStore.currentRun?.floor || 1) * 5 }}</span>
          </div>
        </div>
        <button class="btn" @click="goBack">
          {{ dungeonStore.battleState.isVictory ? '继续探险' : '返回地图' }}
        </button>
      </div>

      <!-- Hand area -->
      <div v-if="!dungeonStore.battleState.isBattleOver" class="hand-area">
        <div class="hand-title">手牌（{{ dungeonStore.currentRun?.hand.length || 0 }}张）</div>
        <div class="hand-cards">
          <div
            v-for="(card, idx) in dungeonStore.currentRun?.hand"
            :key="idx"
            class="card"
            :class="{ selected: selectedCardIdx === idx, disabled: (dungeonStore.currentRun?.energy || 0) < card.cost }"
            :style="{ borderColor: getCardColor(card.type), background: selectedCardIdx === idx ? getCardBg(card.type) : 'rgba(255,255,255,0.03)' }"
            @click="selectCard(idx)"
          >
            <div class="card-cost" :style="{ background: getCardColor(card.type) }">{{ card.cost }}</div>
            <div class="card-name" :style="{ color: getCardColor(card.type) }">{{ card.name }}</div>
            <div class="card-desc">{{ card.description }}</div>
            <div class="card-type">{{ card.type === 'attack' ? '攻击' : card.type === 'defense' ? '防御' : '技能' }}</div>
          </div>
        </div>
        <button
          v-if="selectedCardIdx >= 0 && !feedback"
          class="play-btn"
          @click="playCard"
        >
          出牌并答题
        </button>
        <button
          v-if="!feedback && !dungeonStore.battleState.isBattleOver"
          class="end-turn-btn"
          @click="endTurn"
        >
          结束回合
        </button>
      </div>

      <!-- Battle log -->
      <div class="battle-log">
        <div class="log-title">战斗记录</div>
        <div class="log-entries">
          <div v-for="(entry, idx) in dungeonStore.battleState.log.slice(-5)" :key="idx" class="log-entry">
            {{ entry }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dungeon-battle {
  min-height: 100vh;
  background: linear-gradient(180deg, #1a0a2e 0%, #0f1923 100%);
  padding: 16px;
  max-width: 500px;
  margin: 0 auto;
}

.header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
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
  color: #bb86fc;
  font-size: 18px;
  margin: 0;
}

.turn-info {
  color: rgba(255, 255, 255, 0.5);
  font-size: 12px;
  background: rgba(255, 255, 255, 0.05);
  padding: 4px 8px;
  border-radius: 6px;
}

.loading {
  text-align: center;
  color: rgba(255, 255, 255, 0.5);
  padding: 60px;
}

.enemy-area {
  text-align: center;
  margin-bottom: 16px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 16px;
}

.enemy-icon {
  font-size: 64px;
  margin-bottom: 8px;
}

.enemy-name {
  color: #fff;
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 8px;
}

.enemy-hp-bar {
  height: 10px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 5px;
  overflow: hidden;
  margin-bottom: 4px;
}

.enemy-hp-fill {
  height: 100%;
  background: linear-gradient(90deg, #ff4757, #ff6b81);
  border-radius: 5px;
  transition: width 0.3s;
}

.enemy-hp-text {
  color: rgba(255, 255, 255, 0.5);
  font-size: 12px;
  margin-bottom: 4px;
}

.enemy-atk {
  color: #ff6b35;
  font-size: 12px;
}

.player-stats {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.player-hp, .player-armor, .player-energy {
  flex: 1;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.stat-label {
  color: rgba(255, 255, 255, 0.5);
  font-size: 11px;
}

.stat-value {
  color: #fff;
  font-size: 14px;
  font-weight: bold;
}

.hp-bar-mini {
  width: 100%;
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  overflow: hidden;
}

.hp-fill-mini {
  height: 100%;
  background: #ff6b81;
  border-radius: 2px;
  transition: width 0.3s;
}

.question-area {
  margin-bottom: 16px;
}

.question-card {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
}

.question-stem {
  color: #fff;
  font-size: 15px;
  line-height: 1.5;
  margin-bottom: 12px;
}

.options {
  display: grid;
  gap: 8px;
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

.option-btn:hover:not(:disabled) {
  border-color: #bb86fc;
}

.option-btn.selected {
  border-color: #bb86fc;
  background: rgba(187, 134, 252, 0.1);
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
  display: flex;
  gap: 8px;
}

.answer-input {
  flex: 1;
  padding: 10px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  color: #fff;
  font-size: 16px;
  text-align: center;
}

.answer-input:focus {
  outline: none;
  border-color: #bb86fc;
}

.feedback {
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 8px;
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
  font-weight: bold;
  margin-bottom: 4px;
}

.feedback.correct .feedback-icon { color: #2ed573; }
.feedback.wrong .feedback-icon { color: #ff4757; }

.correct-answer {
  color: rgba(255, 255, 255, 0.7);
  font-size: 13px;
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

.next-btn {
  width: 100%;
  padding: 10px;
  border: none;
  border-radius: 8px;
  background: #2ed573;
  color: #fff;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
}

.hand-area {
  margin-bottom: 16px;
}

.hand-title {
  color: rgba(255, 255, 255, 0.5);
  font-size: 12px;
  margin-bottom: 8px;
}

.hand-cards {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 8px;
}

.card {
  min-width: 100px;
  padding: 10px;
  border-radius: 10px;
  border: 2px solid rgba(255, 255, 255, 0.1);
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.card:hover:not(.disabled) {
  transform: translateY(-4px);
}

.card.selected {
  transform: translateY(-8px);
  box-shadow: 0 4px 12px rgba(187, 134, 252, 0.3);
}

.card.disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.card-cost {
  position: absolute;
  top: -6px;
  left: -6px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: bold;
  color: #fff;
}

.card-name {
  font-size: 13px;
  font-weight: bold;
  margin-bottom: 4px;
}

.card-desc {
  color: rgba(255, 255, 255, 0.6);
  font-size: 11px;
  line-height: 1.3;
  margin-bottom: 4px;
}

.card-type {
  color: rgba(255, 255, 255, 0.3);
  font-size: 10px;
}

.play-btn {
  width: 100%;
  padding: 10px;
  border: none;
  border-radius: 8px;
  background: linear-gradient(135deg, #bb86fc, #6200ea);
  color: #fff;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
  margin-top: 8px;
}

.end-turn-btn {
  width: 100%;
  padding: 10px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  background: transparent;
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
  cursor: pointer;
  margin-top: 8px;
}

.end-turn-btn:hover {
  border-color: #ff6b35;
  color: #ff6b35;
}

.result {
  text-align: center;
  padding: 20px;
}

.result-icon {
  font-size: 64px;
  margin-bottom: 12px;
}

.result-title {
  color: #bb86fc;
  font-size: 28px;
  font-weight: bold;
  margin-bottom: 16px;
}

.result-reward {
  margin-bottom: 20px;
}

.reward-item {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 12px;
  display: inline-flex;
  gap: 12px;
  align-items: center;
}

.reward-label {
  color: rgba(255, 255, 255, 0.5);
  font-size: 13px;
}

.reward-value {
  font-size: 18px;
  font-weight: bold;
}

.reward-value.gold {
  color: #ffd700;
}

.btn {
  padding: 12px 32px;
  border: none;
  border-radius: 8px;
  background: linear-gradient(135deg, #bb86fc, #6200ea);
  color: #fff;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
}

.battle-log {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
  padding: 12px;
}

.log-title {
  color: rgba(255, 255, 255, 0.5);
  font-size: 12px;
  margin-bottom: 8px;
}

.log-entries {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.log-entry {
  color: rgba(255, 255, 255, 0.6);
  font-size: 12px;
  padding: 4px 8px;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 4px;
}
</style>

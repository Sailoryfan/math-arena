<script setup lang="ts">
import { ref, onMounted, computed, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAdventureStore } from '@/stores/adventureStore'
import { useUserStore } from '@/stores/userStore'
import { useDataCenterStore } from '@/stores/dataCenterStore'
import type { Question } from '@/types/question'
import { renderLatex } from '@/utils/latex'
import { useBattle, type MonsterAI } from '@/composables/useBattle'
import { useFeedbackStore } from '@/stores/feedbackStore'

const router = useRouter()
const route = useRoute()
const adventureStore = useAdventureStore()
const userStore = useUserStore()
const dataStore = useDataCenterStore()
const feedbackStore = useFeedbackStore()

const levelId = route.params.id as string
const levelConfig = computed(() => adventureStore.getLevelConfig(levelId))

const loading = ref(true)
const questions = ref<Question[]>([])
const currentQIdx = ref(0)
const selectedAnswer = ref('')
const inputAnswer = ref('')
const startTime = ref(0)
const feedbackMsg = ref('')
const feedbackIsCorrect = ref(false)

const battle = useBattle()

const currentQ = computed(() => questions.value[currentQIdx.value])

// Monster names by difficulty
const monsterNames = [
  { name: '史莱姆', icon: '🟢' },
  { name: '骷髅兵', icon: '💀' },
  { name: '暗影狼', icon: '🐺' },
  { name: '石像鬼', icon: '🗿' },
  { name: '恶魔骑士', icon: '👹' },
]

onMounted(async () => {
  if (!levelConfig.value) {
    router.push('/adventure')
    return
  }
  startTime.value = Date.now()
  await loadQuestions()
  startNewMonster()
})

async function loadQuestions() {
  try {
    const res = await fetch('/data/questions.json')
    const allQuestions: Question[] = await res.json()
    const kpId = levelConfig.value?.knowledgePointId || ''
    let pool = allQuestions.filter(q => q.knowledgePointId === kpId)
    if (pool.length < 10) pool = allQuestions

    const uniquePool = [...new Map(pool.map(q => [q.id, q])).values()]
    const shuffled = [...uniquePool].sort(() => Math.random() - 0.5)
    const needed = Math.max(levelConfig.value?.monsterCount || 5, 3) * 3 // 3 questions per monster minimum
    questions.value = shuffled.slice(0, needed)

    if (questions.value.length < needed) {
      const moreQuestions = [...allQuestions].sort(() => Math.random() - 0.5)
      questions.value = [...questions.value, ...moreQuestions.slice(0, needed - questions.value.length)]
    }
  } catch (e) {
    console.error('Failed to load questions:', e)
  } finally {
    loading.value = false
  }
}

function getMonsterAI(): MonsterAI {
  const config = levelConfig.value!
  const diff = config.difficulty
  const monsterIdx = Math.min(diff - 1, monsterNames.length - 1)
  const m = monsterNames[monsterIdx]!

  // Scale monster stats by difficulty
  const baseAccuracy = 0.3 + diff * 0.1 // 40%-80%
  const baseSpeed = 12000 - diff * 1500 // 10500ms-4500ms

  return {
    name: m.name,
    icon: m.icon,
    hp: config.monsterHP,
    maxHP: config.monsterHP,
    atk: config.monsterAtk,
    accuracy: Math.min(baseAccuracy, 0.8),
    avgSpeed: Math.max(baseSpeed, 3000),
    speedVariance: 2000,
  }
}

function startNewMonster() {
  const ai = getMonsterAI()
  battle.initBattle(ai, 100)
  battle.startRound()
}

function handleSubmit() {
  if (!currentQ.value || battle.isBattleOver.value) return
  const answer = currentQ.value.type === 'choice' ? selectedAnswer.value : inputAnswer.value
  if (!answer) return

  const round = battle.submitPlayerAnswer(currentQ.value, answer)
  if (!round) return

  // Record in data center
  dataStore.recordAnswer('adventure', round.playerCorrect)
  userStore.updateStats(round.playerCorrect)

  if (round.playerCorrect) {
    userStore.addExp(3)
    userStore.addGold(1)
  }
}

function handleNext() {
  battle.dismissResult()
  selectedAnswer.value = ''
  inputAnswer.value = ''

  if (battle.isBattleOver.value) {
    if (battle.isVictory.value) {
      // Check if there are more monsters
      const config = levelConfig.value!
      const totalQuestionsNeeded = Math.max(config.monsterCount, 3) * 3
      if (currentQIdx.value + 1 < totalQuestionsNeeded && currentQIdx.value + 1 < questions.value.length) {
        // Next monster
        currentQIdx.value++
        startNewMonster()
      } else {
        endBattle(true)
      }
    } else {
      endBattle(false)
    }
    return
  }

  if (currentQIdx.value < questions.value.length - 1) {
    currentQIdx.value++
    battle.startRound()
  } else {
    endBattle(battle.monsterHP.value <= 0)
  }
}

function endBattle(victory: boolean) {
  if (victory) {
    const elapsed = Math.floor((Date.now() - startTime.value) / 1000)
    const accuracy = battle.getAccuracy()
    adventureStore.completeLevel(levelId, elapsed, accuracy, battle.maxCombo.value)

    const config = levelConfig.value!
    userStore.addExp(config.reward.exp)
    userStore.addGold(config.reward.gold)
  }
}

function goBack() {
  router.push('/adventure')
}

function handleAnswerFeedback() {
  if (!currentQ.value) return
  const answer = currentQ.value.type === 'choice' ? selectedAnswer.value : inputAnswer.value
  if (!answer) return

  const isCorrect = feedbackStore.submitFeedback(currentQ.value.id, answer, currentQ.value.answer)
  feedbackIsCorrect.value = isCorrect

  if (isCorrect) {
    feedbackMsg.value = '✓ 验证通过！你的答案是正确的，已修正结果。'
    // Undo the wrong result — restore HP and combo
    if (battle.roundResult.value) {
      battle.playerHP.value = Math.min(battle.playerMaxHP.value, battle.playerHP.value + battle.roundResult.value.playerDamage)
      battle.combo.value++
      battle.correctCount.value++
    }
  } else {
    feedbackMsg.value = '答案已记录，我们会核实。感谢反馈！'
  }
}

function retryBattle() {
  currentQIdx.value = 0
  selectedAnswer.value = ''
  inputAnswer.value = ''
  startTime.value = Date.now()
  loadQuestions().then(() => startNewMonster())
}

function getResultText(): string {
  if (battle.roundResult.value?.result === 'monster_hit') return `攻击命中！怪物 -${battle.roundResult.value.monsterDamage} HP`
  if (battle.roundResult.value?.result === 'player_hit') return `受到攻击！你 -${battle.roundResult.value.playerDamage} HP`
  if (battle.roundResult.value?.result === 'both_hit') return `双方都错！你 -${battle.roundResult.value.playerDamage} 怪物 -${battle.roundResult.value.monsterDamage}`
  return '双方都错，各扣少量血量'
}

function getResultClass(): string {
  if (!battle.roundResult.value) return ''
  if (battle.roundResult.value.result === 'monster_hit') return 'success'
  if (battle.roundResult.value.result === 'player_hit') return 'fail'
  return 'both'
}
</script>

<template>
  <div class="battle-page">
    <div class="header">
      <button class="back-btn" @click="goBack">←</button>
      <h1>{{ levelConfig?.name }}</h1>
      <div class="combo" v-if="battle.combo.value >= 2">
        <span class="combo-fire">🔥</span>
        <span class="combo-num">{{ battle.combo.value }}</span>
      </div>
    </div>

    <div v-if="loading" class="loading">加载中...</div>

    <!-- Battle scene -->
    <div v-else class="battle-scene">
      <!-- HP bars -->
      <div class="hp-bars">
        <div class="hp-bar player-hp">
          <div class="hp-label">🧑‍🎓 你</div>
          <div class="hp-track">
            <div class="hp-fill" :style="{ width: battle.playerHPPercent.value + '%' }" :class="{ low: battle.playerHPPercent.value < 30 }"></div>
          </div>
          <div class="hp-text">{{ battle.playerHP.value }}/{{ battle.playerMaxHP.value }}</div>
        </div>
        <div class="hp-bar monster-hp">
          <div class="hp-label">{{ battle.monsterAI.value?.icon }} {{ battle.monsterAI.value?.name }}</div>
          <div class="hp-track">
            <div class="hp-fill" :style="{ width: battle.monsterHPPercent.value + '%' }" :class="{ low: battle.monsterHPPercent.value < 30 }"></div>
          </div>
          <div class="hp-text">{{ battle.monsterHP.value }}/{{ battle.monsterMaxHP.value }}</div>
        </div>
      </div>

      <!-- Monster AI info -->
      <div class="ai-info">
        <span class="ai-label">怪物属性</span>
        <span class="ai-stat">命中率 {{ Math.round((battle.monsterAI.value?.accuracy || 0) * 100) }}%</span>
        <span class="ai-stat">攻击力 {{ battle.monsterAI.value?.atk }}</span>
        <span class="ai-stat" v-if="battle.monsterAnswered.value" style="color: #2ed573">已作答</span>
        <span class="ai-stat" v-else style="color: #ffd700">思考中...</span>
      </div>

      <!-- Question area -->
      <div v-if="!battle.isBattleOver.value && currentQ && !battle.showRoundResult.value" class="question-area">
        <div class="question-card">
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
        </div>

        <button class="submit-btn" :disabled="!selectedAnswer && !inputAnswer" @click="handleSubmit">
          提交答案
        </button>
      </div>

      <!-- Round result -->
      <div v-if="battle.showRoundResult.value && battle.roundResult.value" class="round-result" :class="getResultClass()">
        <div class="rr-header">{{ getResultText() }}</div>
        <div class="rr-details">
          <div class="rr-player">
            <div class="rr-label">你的回答</div>
            <div class="rr-status" :class="battle.roundResult.value.playerCorrect ? 'correct' : 'wrong'">
              {{ battle.roundResult.value.playerCorrect ? '✓ 正确' : '✗ 错误' }}
            </div>
            <div class="rr-time">{{ (battle.roundResult.value.playerTime / 1000).toFixed(1) }}秒</div>
          </div>
          <div class="rr-vs">VS</div>
          <div class="rr-monster">
            <div class="rr-label">{{ battle.monsterAI.value?.name }}</div>
            <div class="rr-status" :class="battle.roundResult.value.monsterCorrect ? 'correct' : 'wrong'">
              {{ battle.roundResult.value.monsterCorrect ? '✓ 正确' : '✗ 错误' }}
            </div>
            <div class="rr-time">{{ (battle.roundResult.value.monsterTime / 1000).toFixed(1) }}秒</div>
          </div>
        </div>
        <div v-if="!battle.roundResult.value.playerCorrect && currentQ" class="correct-answer">
          正确答案：<strong v-html="renderLatex(currentQ.answer)"></strong>
        </div>
        <div v-if="!battle.roundResult.value.playerCorrect && currentQ" class="feedback-area">
          <button class="feedback-btn" @click="handleAnswerFeedback">
            🤔 答案有误？点击反馈
          </button>
          <div v-if="feedbackMsg" class="feedback-msg" :class="feedbackIsCorrect ? 'feedback-correct' : 'feedback-pending'">
            {{ feedbackMsg }}
          </div>
        </div>
        <button class="next-btn" @click="handleNext">
          {{ battle.isBattleOver.value ? (battle.isVictory.value ? '继续' : '返回') : '下一题' }}
        </button>
      </div>

      <!-- Battle result -->
      <div v-if="battle.isBattleOver.value && !battle.showRoundResult.value" class="result">
        <div class="result-icon">{{ battle.isVictory.value ? '🎉' : '💀' }}</div>
        <div class="result-title">{{ battle.isVictory.value ? '胜利！' : '战败...' }}</div>
        <div class="result-stats" v-if="battle.isVictory.value">
          <div class="stat">
            <span class="stat-label">正确率</span>
            <span class="stat-value">{{ battle.getAccuracy() }}%</span>
          </div>
          <div class="stat">
            <span class="stat-label">最高连击</span>
            <span class="stat-value">{{ battle.maxCombo.value }}</span>
          </div>
          <div class="stat">
            <span class="stat-label">获得经验</span>
            <span class="stat-value gold">+{{ levelConfig?.reward.exp }}</span>
          </div>
          <div class="stat">
            <span class="stat-label">获得金币</span>
            <span class="stat-value gold">+{{ levelConfig?.reward.gold }}</span>
          </div>
        </div>
        <div class="result-actions">
          <button class="btn-primary" @click="goBack">返回地图</button>
          <button class="btn-secondary" @click="retryBattle">再来一次</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.battle-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #0f1923 0%, #1a1a2e 100%);
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
  color: #ffd700;
  font-size: 18px;
  margin: 0;
}

.combo {
  display: flex;
  align-items: center;
  gap: 4px;
  background: rgba(255, 100, 0, 0.2);
  padding: 4px 12px;
  border-radius: 20px;
  animation: pulse 0.5s;
}

@keyframes pulse { 50% { transform: scale(1.1); } }

.combo-fire { font-size: 18px; }
.combo-num { color: #ff6b35; font-weight: bold; }

.loading {
  text-align: center;
  color: rgba(255, 255, 255, 0.5);
  padding: 60px;
}

/* HP bars */
.hp-bars {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 8px;
}

.hp-bar { flex: 1; }

.hp-label {
  color: #fff;
  font-size: 12px;
  margin-bottom: 4px;
}

.hp-track {
  height: 12px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  overflow: hidden;
}

.hp-fill {
  height: 100%;
  background: linear-gradient(90deg, #2ed573, #7bed9f);
  border-radius: 6px;
  transition: width 0.3s;
}

.hp-fill.low { background: linear-gradient(90deg, #ff4757, #ff6b81); }
.monster-hp .hp-fill { background: linear-gradient(90deg, #ff4757, #ff6b81); }

.hp-text {
  color: rgba(255, 255, 255, 0.5);
  font-size: 11px;
  margin-top: 2px;
}

/* AI info */
.ai-info {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
  padding: 8px 12px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.ai-label {
  color: rgba(255, 255, 255, 0.5);
  font-size: 11px;
}

.ai-stat {
  color: rgba(255, 255, 255, 0.7);
  font-size: 11px;
  padding: 2px 6px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
}

/* Question */
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

.options { display: grid; gap: 8px; }

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

.option-btn:hover { border-color: #ffd700; }
.option-btn.selected { border-color: #ffd700; background: rgba(255, 215, 0, 0.1); }

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

.fill-blank-area { display: flex; gap: 8px; }

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

.answer-input:focus { outline: none; border-color: #ffd700; }

.submit-btn, .next-btn {
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: bold;
  cursor: pointer;
}

.submit-btn {
  background: linear-gradient(135deg, #ffd700, #ff8c00);
  color: #1a1a2e;
}

.submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.next-btn {
  background: #2ed573;
  color: #fff;
  margin-top: 8px;
}

/* Round result */
.round-result {
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
}

.round-result.success { background: rgba(46, 213, 115, 0.1); border: 1px solid rgba(46, 213, 115, 0.3); }
.round-result.fail { background: rgba(255, 71, 87, 0.1); border: 1px solid rgba(255, 71, 87, 0.3); }
.round-result.both { background: rgba(255, 165, 0, 0.1); border: 1px solid rgba(255, 165, 0, 0.3); }

.rr-header {
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 12px;
  text-align: center;
}

.success .rr-header { color: #2ed573; }
.fail .rr-header { color: #ff4757; }
.both .rr-header { color: #ffa500; }

.rr-details {
  display: flex;
  align-items: center;
  justify-content: space-around;
  margin-bottom: 12px;
}

.rr-player, .rr-monster { text-align: center; }

.rr-label {
  color: rgba(255, 255, 255, 0.5);
  font-size: 11px;
  margin-bottom: 4px;
}

.rr-status {
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 2px;
}

.rr-status.correct { color: #2ed573; }
.rr-status.wrong { color: #ff4757; }

.rr-time {
  color: rgba(255, 255, 255, 0.5);
  font-size: 12px;
}

.rr-vs {
  color: rgba(255, 255, 255, 0.3);
  font-size: 18px;
  font-weight: bold;
}

.correct-answer {
  color: rgba(255, 255, 255, 0.7);
  font-size: 13px;
  margin-bottom: 8px;
  text-align: center;
}

/* Feedback area */
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
  color: #ffd700;
  font-size: 28px;
  font-weight: bold;
  margin-bottom: 20px;
}

.result-stats {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}

.stat {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 12px;
}

.stat-label {
  color: rgba(255, 255, 255, 0.5);
  font-size: 11px;
  display: block;
  margin-bottom: 4px;
}

.stat-value {
  color: #fff;
  font-size: 20px;
  font-weight: bold;
}

.stat-value.gold { color: #ffd700; }

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

.btn-primary { background: linear-gradient(135deg, #ffd700, #ff8c00); color: #1a1a2e; }
.btn-secondary { background: rgba(255, 255, 255, 0.1); color: #fff; }
</style>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useDiagnosticStore } from '@/stores/diagnosticStore'
import { useUserStore } from '@/stores/userStore'
import { calculateRank, calculateAbilityScores, findWeakPoints, findStrongPoints } from '@/utils/rank'
import { generateId } from '@/utils/storage'
import { ABILITY_DIMENSIONS } from '@/types/diagnostic'
import RadarChart from '@/components/RadarChart.vue'
import RankBadge from '@/components/RankBadge.vue'

const router = useRouter()
const diagStore = useDiagnosticStore()
const userStore = useUserStore()

const accuracy = computed(() => {
  if (diagStore.answers.length === 0) return 0
  return Math.round(diagStore.correctCount / diagStore.answers.length * 100)
})

const avgDifficulty = computed(() => {
  if (diagStore.answers.length === 0) return 1
  const sum = diagStore.answers.reduce((s, a) => s + a.difficulty, 0)
  return sum / diagStore.answers.length
})

const rank = computed(() => calculateRank(accuracy.value, avgDifficulty.value))

const abilityScores = computed(() => calculateAbilityScores(diagStore.answers))

const radarScores = computed(() => {
  const scores: Record<string, number> = {}
  for (const dim of ABILITY_DIMENSIONS) {
    scores[dim.key] = abilityScores.value[dim.key] || 0
  }
  return scores
})

const weakPoints = computed(() => findWeakPoints(abilityScores.value))
const strongPoints = computed(() => findStrongPoints(abilityScores.value))

const timeDisplay = computed(() => {
  const total = diagStore.answers.reduce((s, a) => s + a.responseTime, 0)
  const seconds = Math.round(total / 1000)
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}分${s}秒`
})

onMounted(() => {
  if (diagStore.answers.length === 0) {
    router.push('/')
    return
  }

  const result = {
    id: generateId(),
    userId: userStore.profile.id,
    date: new Date().toISOString(),
    answers: diagStore.answers,
    result: {
      overallScore: accuracy.value,
      rankEstimate: rank.value.tier,
      abilityScores: abilityScores.value,
      weakPoints: weakPoints.value,
      strongPoints: strongPoints.value,
    },
  }

  diagStore.saveResult(result)
  userStore.updateDiagnostic(abilityScores.value, weakPoints.value, strongPoints.value, rank.value.tier)
  userStore.addExp(50)
  userStore.addGold(20)
})

function goHome() {
  router.push('/')
}

function retakeTest() {
  userStore.resetDiagnostic()
  router.push('/onboarding/test')
}
</script>

<template>
  <div class="result-page">
    <h1 class="page-title">诊断完成！</h1>

    <div class="rank-section">
      <RankBadge :tier="rank.tier" size="large" />
      <div class="rank-info">
        <div class="rank-tier">{{ rank.tier }}</div>
        <div class="rank-detail">答对 {{ diagStore.correctCount }}/{{ diagStore.answers.length }} 题 · 正确率 {{ accuracy }}%</div>
        <div class="rank-detail">平均用时 {{ timeDisplay }}</div>
      </div>
    </div>

    <div class="radar-section">
      <h2>能力雷达图</h2>
      <RadarChart :scores="radarScores" :dimensions="ABILITY_DIMENSIONS" />
    </div>

    <div class="points-section">
      <div class="points-card weak">
        <h3>薄弱知识点</h3>
        <ul>
          <li v-for="p in weakPoints" :key="p">{{ p }}</li>
        </ul>
      </div>
      <div class="points-card strong">
        <h3>优势知识点</h3>
        <ul>
          <li v-for="p in strongPoints" :key="p">{{ p }}</li>
        </ul>
      </div>
    </div>

    <div class="reward-info">
      <span>🎁 获得 +50 经验 · +20 金币</span>
    </div>

    <div class="actions">
      <button class="btn primary" @click="goHome">进入游戏大厅</button>
      <button class="btn secondary" @click="retakeTest">重新测试</button>
    </div>
  </div>
</template>

<style scoped>
.result-page {
  min-height: 100vh;
  background: #0f1923;
  padding: 24px 16px;
  max-width: 500px;
  margin: 0 auto;
}

.page-title {
  text-align: center;
  color: #ffd700;
  font-size: 28px;
  margin-bottom: 24px;
}

.rank-section {
  display: flex;
  align-items: center;
  gap: 20px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 20px;
}

.rank-info {
  flex: 1;
}

.rank-tier {
  font-size: 28px;
  color: #ffd700;
  font-weight: bold;
}

.rank-detail {
  color: rgba(255, 255, 255, 0.6);
  font-size: 14px;
  margin-top: 4px;
}

.radar-section {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 20px;
  text-align: center;
}

.radar-section h2 {
  color: #fff;
  font-size: 18px;
  margin-bottom: 16px;
}

.points-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 20px;
}

.points-card {
  border-radius: 12px;
  padding: 16px;
}

.points-card.weak {
  background: rgba(255, 71, 87, 0.1);
  border: 1px solid rgba(255, 71, 87, 0.2);
}

.points-card.strong {
  background: rgba(46, 213, 115, 0.1);
  border: 1px solid rgba(46, 213, 115, 0.2);
}

.points-card h3 {
  font-size: 14px;
  margin-bottom: 8px;
}

.points-card.weak h3 { color: #ff4757; }
.points-card.strong h3 { color: #2ed573; }

.points-card ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.points-card li {
  color: rgba(255, 255, 255, 0.8);
  font-size: 13px;
  padding: 4px 0;
}

.reward-info {
  text-align: center;
  color: #ffd700;
  font-size: 14px;
  margin-bottom: 24px;
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.btn {
  padding: 14px;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
}

.btn.primary {
  background: linear-gradient(135deg, #ffd700, #ff8c00);
  color: #1a1a2e;
}

.btn.secondary {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #fff;
}

.btn:hover {
  transform: translateY(-2px);
}
</style>

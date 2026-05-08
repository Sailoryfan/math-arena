<script setup lang="ts">
import { ref, onMounted, computed, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useDataCenterStore } from '@/stores/dataCenterStore'
import { useUserStore } from '@/stores/userStore'
import { usePracticeStore } from '@/stores/practiceStore'
import RadarChart from '@/components/RadarChart.vue'

const router = useRouter()
const dataStore = useDataCenterStore()
const userStore = useUserStore()
const practiceStore = usePracticeStore()

const activeTab = ref<'overview' | 'trend' | 'knowledge' | 'weekly' | 'errors'>('overview')

const tabs = [
  { key: 'overview' as const, label: '总览' },
  { key: 'trend' as const, label: '趋势' },
  { key: 'knowledge' as const, label: '知识点' },
  { key: 'weekly' as const, label: '周报' },
  { key: 'errors' as const, label: '错题' },
]

const radarDimensions = [
  { key: 'numberSense', label: '数感' },
  { key: 'symbolSense', label: '符号感' },
  { key: 'logicReasoning', label: '逻辑推理' },
  { key: 'spatialImagination', label: '空间想象' },
  { key: 'dataAnalysis', label: '数据分析' },
  { key: 'computation', label: '运算能力' },
  { key: 'equationSolving', label: '方程求解' },
  { key: 'geometryApps', label: '几何应用' },
  { key: 'probability', label: '概率统计' },
  { key: 'comprehensive', label: '综合应用' },
]

const radarData = computed(() => {
  const scores = userStore.profile.diagnosticProfile.abilityScores
  const result: Record<string, number> = {}
  for (const dim of radarDimensions) {
    result[dim.key] = scores[dim.key] ?? 0
  }
  return result
})

const knowledgePointLabels: Record<string, string> = {
  'c2_1_1': '正负数',
  'c2_2_1': '有理数分类',
  'c2_3_1': '数轴',
  'c2_4_1': '绝对值',
  'c2_5_1': '加减法',
  'c2_6_1': '乘除法',
  'c2_7_1': '乘方',
  'c2_8_1': '混合运算',
  'c4_1_1': '方程概念',
  'c4_2_1': '简单方程',
  'c4_3_1': '移项',
  'c4_4_1': '去括号',
  'c4_5_1': '去分母',
  'c4_6_1': '和差倍分',
  'c4_7_1': '行程问题',
  'c4_8_1': '综合应用',
}

function getKpLabel(id: string): string {
  return knowledgePointLabels[id] || id
}

function getAccuracyColor(acc: number): string {
  if (acc >= 80) return '#2ed573'
  if (acc >= 60) return '#ffd700'
  return '#ff4757'
}

function getHeatmapColor(count: number): string {
  if (count === 0) return 'rgba(255,255,255,0.05)'
  if (count <= 5) return 'rgba(46, 213, 115, 0.2)'
  if (count <= 15) return 'rgba(46, 213, 115, 0.4)'
  if (count <= 30) return 'rgba(46, 213, 115, 0.6)'
  return 'rgba(46, 213, 115, 0.9)'
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}小时${m}分钟`
  return `${m}分钟`
}

function getDayLabel(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

function goBack() {
  router.push('/my')
}
</script>

<template>
  <div class="data-page">
    <!-- Header -->
    <div class="header">
      <button class="back-btn" @click="goBack">←</button>
      <h1>数据中心</h1>
      <span class="header-level">Lv.{{ dataStore.overallStats.level }}</span>
    </div>

    <!-- Tabs (5 tabs) -->
    <div class="tabs">
      <button v-for="tab in tabs" :key="tab.key" class="tab" :class="{ active: activeTab === tab.key }" @click="activeTab = tab.key">
        {{ tab.label }}
      </button>
    </div>

    <!-- Tab content regions -->
    <div v-if="activeTab === 'overview'" class="tab-content">
      <!-- 1. 今日学习 -->
      <div :class="['section-card', 'accent-card']">
        <div class="section-title">📊 今日学习</div>
        <div class="today-grid">
          <div class="today-stat">
            <div class="stat-value stat-gold">{{ dataStore.todayAnswered }}</div>
            <div class="stat-label">答题数</div>
          </div>
          <div class="today-stat">
            <div class="stat-value" :style="{ color: getAccuracyColor(dataStore.todayAccuracy) }">{{ dataStore.todayAccuracy }}%</div>
            <div class="stat-label">正确率</div>
          </div>
          <div class="today-stat">
            <div class="stat-value stat-purple">{{ formatTime(dataStore.todayPlayTime) }}</div>
            <div class="stat-label">学习时长</div>
          </div>
        </div>
      </div>

      <!-- 2. 总体数据 -->
      <div class="section-card">
        <div class="section-title">📈 总体数据</div>
        <div class="overall-grid">
          <div class="overall-item">
            <span class="ov-label">总答题</span>
            <span class="ov-value">{{ dataStore.overallStats.totalAnswered }}</span>
          </div>
          <div class="overall-item">
            <span class="ov-label">总正确率</span>
            <span class="ov-value" :style="{ color: getAccuracyColor(dataStore.overallStats.overallAccuracy) }">{{ dataStore.overallStats.overallAccuracy }}%</span>
          </div>
          <div class="overall-item">
            <span class="ov-label">错题数</span>
            <span class="ov-value" style="color:#ff4757">{{ dataStore.overallStats.errorCount }}</span>
          </div>
          <div class="overall-item">
            <span class="ov-label">排位赛</span>
            <span class="ov-value">{{ dataStore.overallStats.pvpMatches }}场</span>
          </div>
          <div class="overall-item">
            <span class="ov-label">排位胜率</span>
            <span class="ov-value" style="color:#ff6b35">{{ dataStore.overallStats.pvpWinRate }}%</span>
          </div>
          <div class="overall-item">
            <span class="ov-label">经验值</span>
            <span class="ov-value" style="color:#2ed573">{{ dataStore.overallStats.exp }}</span>
          </div>
          <div class="overall-item">
            <span class="ov-label">金币</span>
            <span class="ov-value" style="color:#ffd700">{{ dataStore.overallStats.gold }}</span>
          </div>
          <div class="overall-item">
            <span class="ov-label">等级</span>
            <span class="ov-value">Lv.{{ dataStore.overallStats.level }}</span>
          </div>
        </div>
      </div>

      <!-- 3. 能力雷达 -->
      <div class="section-card" v-if="Object.keys(radarData).length > 0">
        <div class="section-title">🎯 能力雷达</div>
        <div class="radar-container">
          <RadarChart :scores="radarData" :dimensions="radarDimensions" />
        </div>
        <div class="radar-legend">
          <div v-for="dim in radarDimensions" :key="dim.key" class="radar-legend-item">
            <span class="rl-dot"></span>
            <span class="rl-label">{{ dim.label }}</span>
            <span class="rl-value">{{ radarData[dim.key] || 0 }}</span>
          </div>
        </div>
      </div>

      <!-- 4. 模式分布 -->
      <div class="section-card" v-if="dataStore.modeDistribution.length > 0">
        <div class="section-title">🎮 模式分布</div>
        <div class="mode-grid">
          <div v-for="mode in dataStore.modeDistribution" :key="mode.name" class="mode-card" :style="{ borderColor: mode.color + '40', background: mode.color + '08' }">
            <div class="mode-value" :style="{ color: mode.color }">{{ mode.value }}</div>
            <div class="mode-name">{{ mode.name }}</div>
          </div>
        </div>
      </div>

      <!-- 5. 热力图 -->
      <div class="section-card">
        <div class="section-title">🔥 学习热力图</div>
        <div class="heatmap">
          <div v-for="day in dataStore.last30Days" :key="day.date" class="heatmap-cell" :style="{ background: getHeatmapColor(day.count) }" :title="`${day.date}: ${day.count}题`"></div>
        </div>
        <div class="heatmap-legend">
          <span class="legend-label">少</span>
          <div class="legend-cell" style="background:rgba(255,255,255,0.05)"></div>
          <div class="legend-cell" style="background:rgba(46,213,115,0.2)"></div>
          <div class="legend-cell" style="background:rgba(46,213,115,0.4)"></div>
          <div class="legend-cell" style="background:rgba(46,213,115,0.6)"></div>
          <div class="legend-cell" style="background:rgba(46,213,115,0.9)"></div>
          <span class="legend-label">多</span>
        </div>
      </div>
    </div>

    <div v-if="activeTab === 'trend'" class="tab-content">
      <!-- Task 3 will fill this -->
    </div>

    <div v-if="activeTab === 'knowledge'" class="tab-content">
      <!-- Task 4 will fill this -->
    </div>

    <div v-if="activeTab === 'weekly'" class="tab-content">
      <!-- Task 5 will fill this -->
    </div>

    <div v-if="activeTab === 'errors'" class="tab-content">
      <!-- Task 6 will fill this -->
    </div>

    <!-- Bottom nav -->
    <nav class="bottom-nav">
      <router-link to="/" class="nav-item">
        <span class="nav-icon">🏠</span>
        <span class="nav-label">首页</span>
      </router-link>
      <router-link to="/adventure" class="nav-item">
        <span class="nav-icon">⚔️</span>
        <span class="nav-label">冒险</span>
      </router-link>
      <router-link to="/social" class="nav-item">
        <span class="nav-icon">👥</span>
        <span class="nav-label">社交</span>
      </router-link>
      <router-link to="/my" class="nav-item active">
        <span class="nav-icon">👤</span>
        <span class="nav-label">我的</span>
      </router-link>
    </nav>
  </div>
</template>

<style scoped>
.data-page {
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
  margin-bottom: 16px;
}

.back-btn {
  background: none; border: none; color: #fff; font-size: 24px; cursor: pointer;
}

.header h1 {
  flex: 1; color: #fff; font-size: 20px; font-weight: bold; margin: 0;
}

.header-level {
  background: rgba(187, 134, 252, 0.15);
  color: #bb86fc;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
}

.tabs {
  display: flex;
  gap: 6px;
  margin-bottom: 16px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.tab {
  flex: 1;
  min-width: 60px;
  padding: 8px 4px;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 8px;
  background: rgba(255,255,255,0.02);
  color: rgba(255,255,255,0.5);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.25s;
  white-space: nowrap;
  text-align: center;
}

.tab.active {
  border-color: #bb86fc;
  background: linear-gradient(135deg, rgba(187,134,252,0.15), rgba(98,0,234,0.1));
  color: #bb86fc;
  box-shadow: 0 0 12px rgba(187,134,252,0.15);
}

.section-card {
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
  backdrop-filter: blur(10px);
}

.section-title {
  color: #fff;
  font-size: 14px;
  font-weight: bold;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}

/* overview tab */
.today-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.today-stat {
  text-align: center;
  background: rgba(255,255,255,0.03);
  border-radius: 10px;
  padding: 14px 8px;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  transition: all 0.3s;
}

.stat-gold { color: #ffd700; }
.stat-purple { color: #bb86fc; }

.stat-label {
  color: rgba(255,255,255,0.45);
  font-size: 11px;
  margin-top: 6px;
}

/* bottom nav */
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  background: rgba(15,25,35,0.95);
  backdrop-filter: blur(10px);
  border-top: 1px solid rgba(255,255,255,0.1);
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
  color: rgba(255,255,255,0.4);
  font-size: 10px;
}

.nav-item.active { color: #bb86fc; }
.nav-icon { font-size: 20px; }

/* tab transitions */
.tab-content {
  animation: fadeIn 0.25s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}

/* overview tab additions */
.accent-card {
  background: linear-gradient(135deg, rgba(187,134,252,0.12), rgba(98,0,234,0.06));
  border-color: rgba(187,134,252,0.2);
}

.overall-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.overall-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 10px 4px;
  background: rgba(255,255,255,0.02);
  border-radius: 8px;
}

.ov-label {
  color: rgba(255,255,255,0.4);
  font-size: 10px;
}

.ov-value {
  color: #fff;
  font-size: 14px;
  font-weight: bold;
}

/* Radar */
.radar-container {
  display: flex;
  justify-content: center;
  margin-bottom: 12px;
}

.radar-legend {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px;
}

.radar-legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  background: rgba(255,255,255,0.02);
  border-radius: 6px;
}

.rl-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #ffd700;
  flex-shrink: 0;
}

.rl-label {
  color: rgba(255,255,255,0.6);
  font-size: 11px;
  flex: 1;
}

.rl-value {
  color: #ffd700;
  font-size: 11px;
  font-weight: bold;
}

/* Mode distribution */
.mode-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(70px, 1fr));
  gap: 8px;
}

.mode-card {
  text-align: center;
  padding: 12px 8px;
  border-radius: 10px;
  border: 1px solid;
}

.mode-value {
  font-size: 20px;
  font-weight: bold;
}

.mode-name {
  color: rgba(255,255,255,0.5);
  font-size: 10px;
  margin-top: 4px;
}

/* Heatmap */
.heatmap {
  display: grid;
  grid-template-columns: repeat(10, 1fr);
  gap: 3px;
}

.heatmap-cell {
  aspect-ratio: 1;
  border-radius: 3px;
  cursor: pointer;
}

.heatmap-legend {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 3px;
  margin-top: 8px;
}

.legend-cell {
  width: 12px;
  height: 12px;
  border-radius: 2px;
}

.legend-label {
  color: rgba(255,255,255,0.4);
  font-size: 10px;
}
</style>

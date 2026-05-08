<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useDataCenterStore } from '@/stores/dataCenterStore'
import { useUserStore } from '@/stores/userStore'
import { usePracticeStore } from '@/stores/practiceStore'
import RadarChart from '@/components/RadarChart.vue'

const router = useRouter()
const dataStore = useDataCenterStore()
const userStore = useUserStore()
const practiceStore = usePracticeStore()

const activeTab = ref<'overview' | 'trend' | 'knowledge' | 'errors'>('overview')

const tabs = [
  { key: 'overview' as const, label: '总览' },
  { key: 'trend' as const, label: '趋势' },
  { key: 'knowledge' as const, label: '知识点' },
  { key: 'errors' as const, label: '错题' },
]

const radarData = computed(() => {
  const scores = userStore.profile.diagnosticProfile.abilityScores
  if (Object.keys(scores).length === 0) return null
  return scores
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
    <div class="header">
      <button class="back-btn" @click="goBack">←</button>
      <h1>数据中心</h1>
    </div>

    <!-- Tabs -->
    <div class="tabs">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="tab"
        :class="{ active: activeTab === tab.key }"
        @click="activeTab = tab.key"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- Overview Tab -->
    <div v-if="activeTab === 'overview'" class="tab-content">
      <!-- Today summary -->
      <div class="section-card">
        <div class="section-title">今日学习</div>
        <div class="today-grid">
          <div class="today-stat">
            <div class="stat-value">{{ dataStore.todayAnswered }}</div>
            <div class="stat-label">答题数</div>
          </div>
          <div class="today-stat">
            <div class="stat-value" :style="{ color: dataStore.todayAccuracy >= 80 ? '#2ed573' : dataStore.todayAccuracy >= 60 ? '#ffd700' : '#ff4757' }">
              {{ dataStore.todayAccuracy }}%
            </div>
            <div class="stat-label">正确率</div>
          </div>
          <div class="today-stat">
            <div class="stat-value">{{ formatTime(dataStore.todayPlayTime) }}</div>
            <div class="stat-label">学习时长</div>
          </div>
        </div>
      </div>

      <!-- Overall stats -->
      <div class="section-card">
        <div class="section-title">总体数据</div>
        <div class="overall-grid">
          <div class="overall-item">
            <span class="ov-label">总答题</span>
            <span class="ov-value">{{ dataStore.overallStats.totalAnswered }}</span>
          </div>
          <div class="overall-item">
            <span class="ov-label">总正确率</span>
            <span class="ov-value" :style="{ color: getAccuracyColor(dataStore.overallStats.overallAccuracy) }">
              {{ dataStore.overallStats.overallAccuracy }}%
            </span>
          </div>
          <div class="overall-item">
            <span class="ov-label">错题数</span>
            <span class="ov-value" style="color: #ff4757">{{ dataStore.overallStats.errorCount }}</span>
          </div>
          <div class="overall-item">
            <span class="ov-label">排位赛</span>
            <span class="ov-value">{{ dataStore.overallStats.pvpMatches }}场</span>
          </div>
          <div class="overall-item">
            <span class="ov-label">排位胜率</span>
            <span class="ov-value">{{ dataStore.overallStats.pvpWinRate }}%</span>
          </div>
          <div class="overall-item">
            <span class="ov-label">等级</span>
            <span class="ov-value">Lv.{{ dataStore.overallStats.level }}</span>
          </div>
        </div>
      </div>

      <!-- Mode distribution -->
      <div class="section-card" v-if="dataStore.modeDistribution.length > 0">
        <div class="section-title">今日模式分布</div>
        <div class="mode-bars">
          <div v-for="mode in dataStore.modeDistribution" :key="mode.name" class="mode-bar-item">
            <div class="mode-label">{{ mode.name }}</div>
            <div class="mode-bar-track">
              <div
                class="mode-bar-fill"
                :style="{
                  width: Math.min(100, mode.value / Math.max(...dataStore.modeDistribution.map(m => m.value)) * 100) + '%',
                  background: mode.color
                }"
              ></div>
            </div>
            <div class="mode-count">{{ mode.value }}</div>
          </div>
        </div>
      </div>

      <!-- Radar chart -->
      <div class="section-card" v-if="radarData">
        <div class="section-title">能力雷达</div>
        <div class="radar-container">
          <RadarChart :scores="radarData" :size="250" />
        </div>
      </div>

      <!-- Heatmap -->
      <div class="section-card">
        <div class="section-title">近30天学习热力图</div>
        <div class="heatmap">
          <div
            v-for="day in dataStore.last30Days"
            :key="day.date"
            class="heatmap-cell"
            :style="{ background: getHeatmapColor(day.count) }"
            :title="`${day.date}: ${day.count}题`"
          ></div>
        </div>
        <div class="heatmap-legend">
          <span class="legend-label">少</span>
          <div class="legend-cell" style="background: rgba(255,255,255,0.05)"></div>
          <div class="legend-cell" style="background: rgba(46, 213, 115, 0.2)"></div>
          <div class="legend-cell" style="background: rgba(46, 213, 115, 0.4)"></div>
          <div class="legend-cell" style="background: rgba(46, 213, 115, 0.6)"></div>
          <div class="legend-cell" style="background: rgba(46, 213, 115, 0.9)"></div>
          <span class="legend-label">多</span>
        </div>
      </div>
    </div>

    <!-- Trend Tab -->
    <div v-if="activeTab === 'trend'" class="tab-content">
      <div class="section-card">
        <div class="section-title">近7天答题趋势</div>
        <div class="chart-area">
          <div class="bar-chart">
            <div v-for="day in dataStore.weeklyTrend" :key="day.date" class="bar-column">
              <div class="bar-value">{{ day.count > 0 ? day.count : '' }}</div>
              <div class="bar" :style="{ height: (day.count > 0 ? Math.max(10, day.count / Math.max(...dataStore.weeklyTrend.map(d => d.count)) * 100) : 0) + '%' }"></div>
              <div class="bar-label">{{ day.date }}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="section-card">
        <div class="section-title">近7天正确率趋势</div>
        <div class="chart-area">
          <div class="line-chart">
            <svg viewBox="0 0 300 120" class="trend-svg">
              <!-- Grid lines -->
              <line x1="30" y1="10" x2="30" y2="100" stroke="rgba(255,255,255,0.1)" />
              <line x1="30" y1="100" x2="290" y2="100" stroke="rgba(255,255,255,0.1)" />
              <line x1="30" y1="55" x2="290" y2="55" stroke="rgba(255,255,255,0.05)" stroke-dasharray="4" />
              <!-- Labels -->
              <text x="5" y="15" fill="rgba(255,255,255,0.4)" font-size="8">100</text>
              <text x="10" y="58" fill="rgba(255,255,255,0.4)" font-size="8">50</text>
              <text x="15" y="103" fill="rgba(255,255,255,0.4)" font-size="8">0</text>
              <!-- Line -->
              <polyline
                :points="dataStore.weeklyTrend.map((d, i) => `${30 + i * 44},${100 - d.accuracy * 0.9}`).join(' ')"
                fill="none"
                stroke="#bb86fc"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <!-- Points -->
              <circle
                v-for="(d, i) in dataStore.weeklyTrend"
                :key="i"
                :cx="30 + i * 44"
                :cy="100 - d.accuracy * 0.9"
                r="4"
                :fill="d.accuracy >= 80 ? '#2ed573' : d.accuracy >= 60 ? '#ffd700' : '#ff4757'"
              />
              <!-- X labels -->
              <text
                v-for="(d, i) in dataStore.weeklyTrend"
                :key="'l' + i"
                :x="30 + i * 44"
                y="115"
                fill="rgba(255,255,255,0.4)"
                font-size="8"
                text-anchor="middle"
              >{{ d.date }}</text>
            </svg>
          </div>
        </div>
      </div>
    </div>

    <!-- Knowledge Tab -->
    <div v-if="activeTab === 'knowledge'" class="tab-content">
      <div class="section-card">
        <div class="section-title">知识点掌握度</div>
        <div v-if="dataStore.knowledgePointStats.length === 0" class="empty-hint">
          暂无练习数据，完成练习后可查看各知识点掌握情况
        </div>
        <div v-else class="kp-list">
          <div v-for="kp in dataStore.knowledgePointStats" :key="kp.id" class="kp-item">
            <div class="kp-header">
              <span class="kp-name">{{ getKpLabel(kp.id) }}</span>
              <span class="kp-accuracy" :style="{ color: getAccuracyColor(kp.accuracy) }">
                {{ kp.accuracy }}%
              </span>
            </div>
            <div class="kp-bar">
              <div
                class="kp-bar-fill"
                :style="{ width: kp.accuracy + '%', background: getAccuracyColor(kp.accuracy) }"
              ></div>
            </div>
            <div class="kp-detail">
              {{ kp.correct }}/{{ kp.total }} 题正确
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Errors Tab -->
    <div v-if="activeTab === 'errors'" class="tab-content">
      <div class="section-card">
        <div class="section-title">错题统计</div>
        <div class="error-summary">
          <div class="error-stat">
            <div class="error-value" style="color: #ff4757">{{ dataStore.overallStats.errorCount }}</div>
            <div class="error-label">待复习错题</div>
          </div>
          <div class="error-stat">
            <div class="error-value" style="color: #2ed573">
              {{ Object.values(practiceStore.errorBook).filter(e => e.mastered).length }}
            </div>
            <div class="error-label">已掌握</div>
          </div>
        </div>

        <div class="error-actions">
          <button class="action-btn" @click="router.push('/errors')">
            进入错题本
          </button>
        </div>
      </div>

      <div class="section-card">
        <div class="section-title">错误分布</div>
        <div v-if="dataStore.knowledgePointStats.length === 0" class="empty-hint">
          暂无错误数据
        </div>
        <div v-else class="error-dist">
          <div
            v-for="kp in dataStore.knowledgePointStats.filter(k => k.total - k.correct > 0).slice(0, 8)"
            :key="kp.id"
            class="error-dist-item"
          >
            <span class="ed-name">{{ getKpLabel(kp.id) }}</span>
            <span class="ed-count">{{ kp.total - k.correct }}题错</span>
            <div class="ed-bar">
              <div
                class="ed-bar-fill"
                :style="{ width: ((kp.total - kp.correct) / kp.total * 100) + '%' }"
              ></div>
            </div>
          </div>
        </div>
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
  background: none;
  border: none;
  color: #fff;
  font-size: 24px;
  cursor: pointer;
}

.header h1 {
  flex: 1;
  color: #fff;
  font-size: 20px;
  margin: 0;
}

.tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.tab {
  flex: 1;
  padding: 8px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  background: transparent;
  color: rgba(255, 255, 255, 0.5);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.tab.active {
  border-color: #bb86fc;
  background: rgba(187, 134, 252, 0.1);
  color: #bb86fc;
}

.section-card {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
}

.section-title {
  color: #fff;
  font-size: 15px;
  font-weight: bold;
  margin-bottom: 12px;
}

/* Today grid */
.today-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.today-stat {
  text-align: center;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
  padding: 12px 8px;
}

.stat-value {
  color: #ffd700;
  font-size: 20px;
  font-weight: bold;
}

.stat-label {
  color: rgba(255, 255, 255, 0.5);
  font-size: 11px;
  margin-top: 4px;
}

/* Overall grid */
.overall-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.overall-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
}

.ov-label {
  color: rgba(255, 255, 255, 0.5);
  font-size: 11px;
}

.ov-value {
  color: #fff;
  font-size: 14px;
  font-weight: bold;
}

/* Mode bars */
.mode-bars {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.mode-bar-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.mode-label {
  color: rgba(255, 255, 255, 0.7);
  font-size: 12px;
  width: 60px;
}

.mode-bar-track {
  flex: 1;
  height: 8px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
  overflow: hidden;
}

.mode-bar-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s;
}

.mode-count {
  color: rgba(255, 255, 255, 0.5);
  font-size: 12px;
  width: 30px;
  text-align: right;
}

/* Radar */
.radar-container {
  display: flex;
  justify-content: center;
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
  color: rgba(255, 255, 255, 0.4);
  font-size: 10px;
}

/* Bar chart */
.chart-area {
  padding: 8px 0;
}

.bar-chart {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  height: 150px;
  gap: 8px;
}

.bar-column {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
  justify-content: flex-end;
}

.bar-value {
  color: rgba(255, 255, 255, 0.5);
  font-size: 10px;
  margin-bottom: 2px;
}

.bar {
  width: 100%;
  background: linear-gradient(180deg, #bb86fc, #6200ea);
  border-radius: 4px 4px 0 0;
  min-height: 0;
  transition: height 0.3s;
}

.bar-label {
  color: rgba(255, 255, 255, 0.4);
  font-size: 10px;
  margin-top: 4px;
}

/* Line chart */
.line-chart {
  width: 100%;
}

.trend-svg {
  width: 100%;
  height: auto;
}

/* Knowledge points */
.kp-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.kp-item {
  padding: 8px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.kp-item:last-child {
  border-bottom: none;
}

.kp-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
}

.kp-name {
  color: #fff;
  font-size: 13px;
}

.kp-accuracy {
  font-size: 13px;
  font-weight: bold;
}

.kp-bar {
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 2px;
}

.kp-bar-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s;
}

.kp-detail {
  color: rgba(255, 255, 255, 0.4);
  font-size: 11px;
}

.empty-hint {
  color: rgba(255, 255, 255, 0.4);
  font-size: 13px;
  text-align: center;
  padding: 20px;
}

/* Error stats */
.error-summary {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
}

.error-stat {
  flex: 1;
  text-align: center;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
  padding: 12px;
}

.error-value {
  font-size: 28px;
  font-weight: bold;
}

.error-label {
  color: rgba(255, 255, 255, 0.5);
  font-size: 12px;
  margin-top: 4px;
}

.error-actions {
  text-align: center;
}

.action-btn {
  padding: 10px 24px;
  border: 1px solid #bb86fc;
  border-radius: 8px;
  background: rgba(187, 134, 252, 0.1);
  color: #bb86fc;
  font-size: 14px;
  cursor: pointer;
}

/* Error distribution */
.error-dist {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.error-dist-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ed-name {
  color: rgba(255, 255, 255, 0.7);
  font-size: 12px;
  width: 60px;
}

.ed-count {
  color: #ff4757;
  font-size: 11px;
  width: 40px;
}

.ed-bar {
  flex: 1;
  height: 6px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 3px;
  overflow: hidden;
}

.ed-bar-fill {
  height: 100%;
  background: #ff4757;
  border-radius: 3px;
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

.nav-item.active { color: #bb86fc; }
.nav-icon { font-size: 20px; }
</style>

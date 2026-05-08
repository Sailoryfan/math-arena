<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/userStore'
import { useDataCenterStore } from '@/stores/dataCenterStore'
import { usePracticeStore } from '@/stores/practiceStore'
import { usePvpStore } from '@/stores/pvpStore'

const router = useRouter()
const userStore = useUserStore()
const dataStore = useDataCenterStore()
const practiceStore = usePracticeStore()
const pvpStore = usePvpStore()

const activeTab = ref<'today' | 'week' | 'report'>('today')

const todaySummary = computed(() => {
  return {
    answered: dataStore.todayAnswered,
    correct: dataStore.todayCorrect,
    accuracy: dataStore.todayAccuracy,
    playTime: dataStore.todayPlayTime,
    errorCount: practiceStore.getErrorCount(),
  }
})

const weeklyData = computed(() => {
  const records = dataStore.last7Days
  const totalAnswered = records.reduce((s, r) => s + r.answered, 0)
  const totalCorrect = records.reduce((s, r) => s + r.correct, 0)
  const totalTime = records.reduce((s, r) => s + r.playTime, 0)

  // Compare with previous week (approximate)
  const prevRecords = dataStore.dailyRecords.slice(-14, -7)
  const prevAnswered = prevRecords.reduce((s, r) => s + r.answered, 0)

  return {
    totalAnswered,
    totalCorrect,
    accuracy: totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0,
    totalTime,
    dailyAvg: Math.round(totalAnswered / 7),
    trend: prevAnswered > 0 ? Math.round((totalAnswered - prevAnswered) / prevAnswered * 100) : 0,
  }
})

const weeklyReport = computed(() => {
  return dataStore.generateWeeklyReport()
})

const rankChange = computed(() => {
  return {
    tier: pvpStore.rankName,
    color: pvpStore.currentTier.color,
    icon: pvpStore.currentTier.icon,
  }
})

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}小时${m}分`
  return `${m}分钟`
}

function getAccuracyEmoji(acc: number): string {
  if (acc >= 90) return '🌟'
  if (acc >= 80) return '👍'
  if (acc >= 60) return '📈'
  return '💪'
}

function goBack() {
  router.push('/my')
}
</script>

<template>
  <div class="parent-page">
    <div class="header">
      <button class="back-btn" @click="goBack">←</button>
      <h1>家长端</h1>
    </div>

    <!-- Student info -->
    <div class="student-banner">
      <div class="sb-avatar">{{ userStore.profile.avatar }}</div>
      <div class="sb-info">
        <div class="sb-name">{{ userStore.profile.nickname }}</div>
        <div class="sb-level">Lv.{{ userStore.profile.gameProfile.level }}</div>
      </div>
      <div class="sb-rank" :style="{ color: rankChange.color }">
        <div class="rank-icon">{{ rankChange.icon }}</div>
        <div class="rank-name">{{ rankChange.tier }}</div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="tabs">
      <button class="tab" :class="{ active: activeTab === 'today' }" @click="activeTab = 'today'">今日</button>
      <button class="tab" :class="{ active: activeTab === 'week' }" @click="activeTab = 'week'">本周</button>
      <button class="tab" :class="{ active: activeTab === 'report' }" @click="activeTab = 'report'">周报</button>
    </div>

    <!-- Today tab -->
    <div v-if="activeTab === 'today'" class="tab-content">
      <div class="summary-card">
        <div class="summary-title">今日学习概览</div>
        <div class="summary-grid">
          <div class="sg-item">
            <div class="sg-icon">📝</div>
            <div class="sg-value">{{ todaySummary.answered }}</div>
            <div class="sg-label">答题数</div>
          </div>
          <div class="sg-item">
            <div class="sg-icon">✅</div>
            <div class="sg-value" :style="{ color: todaySummary.accuracy >= 80 ? '#2ed573' : todaySummary.accuracy >= 60 ? '#ffd700' : '#ff4757' }">
              {{ todaySummary.accuracy }}%
            </div>
            <div class="sg-label">正确率</div>
          </div>
          <div class="sg-item">
            <div class="sg-icon">⏱️</div>
            <div class="sg-value">{{ formatTime(todaySummary.playTime) }}</div>
            <div class="sg-label">学习时长</div>
          </div>
          <div class="sg-item">
            <div class="sg-icon">❌</div>
            <div class="sg-value" style="color: #ff4757">{{ todaySummary.errorCount }}</div>
            <div class="sg-label">待复习错题</div>
          </div>
        </div>
      </div>

      <div class="encourage-card">
        <div class="encourage-icon">{{ getAccuracyEmoji(todaySummary.accuracy) }}</div>
        <div class="encourage-text">
          <template v-if="todaySummary.answered === 0">
            今天还没有开始学习哦，提醒孩子打开练习吧！
          </template>
          <template v-else-if="todaySummary.accuracy >= 80">
            今天表现很棒！正确率很高，继续保持！
          </template>
          <template v-else-if="todaySummary.accuracy >= 60">
            今天的学习还不错，再加把劲提高正确率！
          </template>
          <template v-else>
            错题较多，建议复习后再练习，不要气馁！
          </template>
        </div>
      </div>
    </div>

    <!-- Week tab -->
    <div v-if="activeTab === 'week'" class="tab-content">
      <div class="summary-card">
        <div class="summary-title">本周数据</div>
        <div class="weekly-stats">
          <div class="ws-item">
            <div class="ws-value">{{ weeklyData.totalAnswered }}</div>
            <div class="ws-label">总答题</div>
          </div>
          <div class="ws-item">
            <div class="ws-value" :style="{ color: weeklyData.accuracy >= 80 ? '#2ed573' : '#ffd700' }">
              {{ weeklyData.accuracy }}%
            </div>
            <div class="ws-label">正确率</div>
          </div>
          <div class="ws-item">
            <div class="ws-value">{{ formatTime(weeklyData.totalTime) }}</div>
            <div class="ws-label">总时长</div>
          </div>
          <div class="ws-item">
            <div class="ws-value">{{ weeklyData.dailyAvg }}</div>
            <div class="ws-label">日均答题</div>
          </div>
        </div>
      </div>

      <!-- Daily chart -->
      <div class="summary-card">
        <div class="summary-title">每日答题量</div>
        <div class="daily-chart">
          <div v-for="day in dataStore.last7Days" :key="day.date" class="dc-column">
            <div class="dc-value">{{ day.answered > 0 ? day.answered : '' }}</div>
            <div class="dc-bar" :style="{ height: (day.answered > 0 ? Math.max(8, day.answered / Math.max(...dataStore.last7Days.map(d => d.answered)) * 100) : 0) + '%' }"></div>
            <div class="dc-label">{{ day.date.slice(5) }}</div>
          </div>
        </div>
      </div>

      <div class="trend-card" v-if="weeklyData.trend !== 0">
        <span class="trend-icon">{{ weeklyData.trend > 0 ? '📈' : '📉' }}</span>
        <span class="trend-text">
          本周做题量{{ weeklyData.trend > 0 ? '增加' : '减少' }}了 {{ Math.abs(weeklyData.trend) }}%
        </span>
      </div>
    </div>

    <!-- Report tab -->
    <div v-if="activeTab === 'report'" class="tab-content">
      <div class="report-card">
        <div class="report-header">
          <div class="report-title">学习周报</div>
          <div class="report-date">{{ weeklyReport.weekStart }} ~ {{ weeklyReport.weekEnd }}</div>
        </div>

        <div class="report-section">
          <div class="rs-title">📊 数据摘要</div>
          <div class="rs-content">
            本周共完成 <strong>{{ weeklyReport.totalAnswered }}</strong> 道题，
            正确率 <strong>{{ weeklyReport.accuracy }}%</strong>，
            总学习时长 <strong>{{ formatTime(weeklyReport.totalPlayTime) }}</strong>。
          </div>
        </div>

        <div class="report-section" v-if="weeklyReport.improvements.length > 0">
          <div class="rs-title">✨ 进步亮点</div>
          <div v-for="(item, i) in weeklyReport.improvements" :key="i" class="rs-item">
            {{ item }}
          </div>
        </div>

        <div class="report-section" v-if="weeklyReport.suggestions.length > 0">
          <div class="rs-title">💡 改进建议</div>
          <div v-for="(item, i) in weeklyReport.suggestions" :key="i" class="rs-item">
            {{ item }}
          </div>
        </div>

        <div class="report-section" v-if="weeklyReport.topWeakPoints.length > 0">
          <div class="rs-title">🎯 需加强知识点</div>
          <div class="weak-tags">
            <span v-for="kp in weeklyReport.topWeakPoints" :key="kp" class="weak-tag">{{ kp }}</span>
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
.parent-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #0f1923 0%, #1a0a2e 100%);
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
  color: #2ed573;
  font-size: 20px;
  margin: 0;
}

.student-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
}

.sb-avatar {
  font-size: 36px;
}

.sb-info { flex: 1; }

.sb-name {
  color: #fff;
  font-size: 16px;
  font-weight: bold;
}

.sb-level {
  color: rgba(255, 255, 255, 0.5);
  font-size: 12px;
}

.sb-rank {
  text-align: center;
}

.rank-icon {
  font-size: 28px;
}

.rank-name {
  font-size: 12px;
  font-weight: bold;
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
}

.tab.active {
  border-color: #2ed573;
  background: rgba(46, 213, 115, 0.1);
  color: #2ed573;
}

.summary-card {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
}

.summary-title {
  color: #fff;
  font-size: 15px;
  font-weight: bold;
  margin-bottom: 12px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.sg-item {
  text-align: center;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
  padding: 12px 8px;
}

.sg-icon {
  font-size: 20px;
  margin-bottom: 4px;
}

.sg-value {
  color: #ffd700;
  font-size: 20px;
  font-weight: bold;
}

.sg-label {
  color: rgba(255, 255, 255, 0.5);
  font-size: 11px;
  margin-top: 2px;
}

.encourage-card {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(46, 213, 115, 0.1);
  border: 1px solid rgba(46, 213, 115, 0.2);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
}

.encourage-icon {
  font-size: 32px;
}

.encourage-text {
  color: rgba(255, 255, 255, 0.8);
  font-size: 14px;
  line-height: 1.5;
}

/* Weekly */
.weekly-stats {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.ws-item {
  text-align: center;
  padding: 8px;
}

.ws-value {
  color: #ffd700;
  font-size: 20px;
  font-weight: bold;
}

.ws-label {
  color: rgba(255, 255, 255, 0.5);
  font-size: 11px;
  margin-top: 2px;
}

.daily-chart {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  height: 120px;
  gap: 8px;
}

.dc-column {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
  justify-content: flex-end;
}

.dc-value {
  color: rgba(255, 255, 255, 0.5);
  font-size: 10px;
  margin-bottom: 2px;
}

.dc-bar {
  width: 100%;
  background: linear-gradient(180deg, #2ed573, #00b894);
  border-radius: 4px 4px 0 0;
  min-height: 0;
  transition: height 0.3s;
}

.dc-label {
  color: rgba(255, 255, 255, 0.4);
  font-size: 10px;
  margin-top: 4px;
}

.trend-card {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  padding: 12px;
  margin-bottom: 12px;
}

.trend-icon { font-size: 20px; }
.trend-text { color: rgba(255, 255, 255, 0.7); font-size: 13px; }

/* Report */
.report-card {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 12px;
}

.report-header {
  margin-bottom: 20px;
  text-align: center;
}

.report-title {
  color: #ffd700;
  font-size: 20px;
  font-weight: bold;
  margin-bottom: 4px;
}

.report-date {
  color: rgba(255, 255, 255, 0.5);
  font-size: 12px;
}

.report-section {
  margin-bottom: 16px;
}

.rs-title {
  color: #fff;
  font-size: 14px;
  font-weight: bold;
  margin-bottom: 8px;
}

.rs-content {
  color: rgba(255, 255, 255, 0.7);
  font-size: 13px;
  line-height: 1.6;
}

.rs-content strong {
  color: #ffd700;
}

.rs-item {
  color: rgba(255, 255, 255, 0.7);
  font-size: 13px;
  padding: 4px 0;
  padding-left: 10px;
  border-left: 2px solid rgba(46, 213, 115, 0.3);
  margin-bottom: 4px;
}

.weak-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.weak-tag {
  padding: 4px 10px;
  border-radius: 12px;
  background: rgba(255, 71, 87, 0.1);
  border: 1px solid rgba(255, 71, 87, 0.3);
  color: #ff6b81;
  font-size: 12px;
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

.nav-item.active { color: #2ed573; }
.nav-icon { font-size: 20px; }
</style>

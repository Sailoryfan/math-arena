<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useLearningPlanStore } from '@/stores/learningPlanStore'
import { useUserStore } from '@/stores/userStore'
import type { DailyTask } from '@/types/user'

const router = useRouter()
const planStore = useLearningPlanStore()
const userStore = useUserStore()

const showCelebration = ref(false)

const todayTasks = computed(() => planStore.todayTasks)
const progress = computed(() => planStore.todayProgress)
const allCompleted = computed(() => planStore.allTasksCompleted)

const taskTypeIcons: Record<string, string> = {
  knowledge_video: '📖',
  practice: '✏️',
  review: '🔄',
  test: '📝',
  game_level: '🎮',
}

const taskTypeLabels: Record<string, string> = {
  knowledge_video: '知识点学习',
  practice: '练习',
  review: '复习',
  test: '测试',
  game_level: '闯关',
}

onMounted(() => {
  if (!planStore.hasPlan()) {
    planStore.generatePlan()
  }

  if (allCompleted.value) {
    showCelebration.value = true
  }
})

function startTask(task: DailyTask) {
  if (task.status === 'completed') return

  if (task.type === 'knowledge_video') {
    router.push(`/knowledge/${task.knowledgePointId}`)
  } else if (task.type === 'practice' || task.type === 'review') {
    router.push(`/practice?taskId=${task.id}&kpId=${task.knowledgePointId}&count=${task.targetCount}`)
  } else if (task.type === 'test') {
    router.push(`/practice?taskId=${task.id}&count=${task.targetCount}`)
  }
}

function getTaskTimeEstimate(task: DailyTask): string {
  const minutes = task.type === 'knowledge_video' ? 5
    : task.type === 'practice' ? task.targetCount * 1
    : task.type === 'review' ? task.targetCount * 1
    : task.type === 'test' ? 15
    : 5
  return `约${minutes}分钟`
}
</script>

<template>
  <div class="plan-page">
    <div class="header">
      <button class="back-btn" @click="router.push('/')">←</button>
      <h1>今日计划</h1>
      <div class="progress-ring">
        <svg viewBox="0 0 36 36">
          <path class="ring-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
          <path class="ring-fill" :stroke-dasharray="`${progress}, 100`" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
        </svg>
        <span class="ring-text">{{ progress }}%</span>
      </div>
    </div>

    <div class="date-info">
      <span class="date">{{ new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' }) }}</span>
      <span class="streak">连续学习 {{ userStore.profile.stats.loginStreak }} 天</span>
    </div>

    <div v-if="todayTasks.length === 0" class="empty">
      <div class="empty-icon">📋</div>
      <div class="empty-text">暂无今日计划</div>
      <button class="gen-btn" @click="planStore.generatePlan()">生成学习计划</button>
    </div>

    <div v-else class="task-list">
      <div
        v-for="task in todayTasks"
        :key="task.id"
        class="task-card"
        :class="{ completed: task.status === 'completed' }"
        @click="startTask(task)"
      >
        <div class="task-icon">{{ taskTypeIcons[task.type] || '📝' }}</div>
        <div class="task-info">
          <div class="task-title">{{ task.title }}</div>
          <div class="task-desc">{{ task.description }}</div>
          <div class="task-meta">
            <span class="task-type">{{ taskTypeLabels[task.type] }}</span>
            <span class="task-time">{{ getTaskTimeEstimate(task) }}</span>
          </div>
        </div>
        <div class="task-right">
          <div v-if="task.status === 'completed'" class="task-done">✓</div>
          <div v-else class="task-reward">
            <span class="exp">+{{ task.reward.exp }} exp</span>
            <span class="gold">+{{ task.reward.gold }} 🪙</span>
          </div>
          <div v-if="task.targetCount > 1" class="task-progress">
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: (task.completedCount / task.targetCount * 100) + '%' }"></div>
            </div>
            <span class="progress-text">{{ task.completedCount }}/{{ task.targetCount }}</span>
          </div>
        </div>
      </div>
    </div>

    <div v-if="allCompleted && showCelebration" class="celebration" @click="showCelebration = false">
      <div class="celebration-content">
        <div class="celebration-icon">🎉</div>
        <div class="celebration-title">今日任务全部完成！</div>
        <div class="celebration-desc">太棒了，继续保持！</div>
        <button class="celebration-btn">收下奖励</button>
      </div>
    </div>

    <nav class="bottom-nav">
      <router-link to="/" class="nav-item">
        <span class="nav-icon">🏠</span>
        <span class="nav-label">首页</span>
      </router-link>
      <router-link to="/plan" class="nav-item active">
        <span class="nav-icon">📋</span>
        <span class="nav-label">计划</span>
      </router-link>
      <router-link to="/errors" class="nav-item">
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
.plan-page {
  min-height: 100vh;
  background: #0f1923;
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
  padding: 4px;
}

.header h1 {
  flex: 1;
  color: #fff;
  font-size: 20px;
  margin: 0;
}

.progress-ring {
  width: 48px;
  height: 48px;
  position: relative;
}

.progress-ring svg {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.ring-bg {
  fill: none;
  stroke: rgba(255, 255, 255, 0.1);
  stroke-width: 3;
}

.ring-fill {
  fill: none;
  stroke: #ffd700;
  stroke-width: 3;
  stroke-linecap: round;
  transition: stroke-dasharray 0.3s;
}

.ring-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: #ffd700;
  font-size: 11px;
  font-weight: bold;
}

.date-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
  color: rgba(255, 255, 255, 0.5);
  font-size: 13px;
}

.empty {
  text-align: center;
  padding: 60px 20px;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.empty-text {
  color: rgba(255, 255, 255, 0.5);
  font-size: 16px;
  margin-bottom: 20px;
}

.gen-btn {
  background: linear-gradient(135deg, #ffd700, #ff8c00);
  color: #1a1a2e;
  border: none;
  padding: 12px 24px;
  border-radius: 12px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
}

.task-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.task-card {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s;
}

.task-card:hover:not(.completed) {
  border-color: #ffd700;
  background: rgba(255, 215, 0, 0.05);
}

.task-card.completed {
  opacity: 0.6;
}

.task-icon {
  font-size: 28px;
  flex-shrink: 0;
}

.task-info {
  flex: 1;
  min-width: 0;
}

.task-title {
  color: #fff;
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 4px;
}

.task-desc {
  color: rgba(255, 255, 255, 0.5);
  font-size: 12px;
  margin-bottom: 6px;
}

.task-meta {
  display: flex;
  gap: 8px;
}

.task-type, .task-time {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 8px;
}

.task-type {
  background: rgba(255, 215, 0, 0.1);
  color: #ffd700;
}

.task-time {
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.4);
}

.task-right {
  text-align: right;
  flex-shrink: 0;
}

.task-done {
  color: #2ed573;
  font-size: 24px;
  font-weight: bold;
}

.task-reward {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-bottom: 4px;
}

.exp {
  color: #7bed9f;
  font-size: 11px;
}

.gold {
  color: #ffd700;
  font-size: 11px;
}

.task-progress {
  width: 80px;
}

.progress-bar {
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  margin-bottom: 4px;
}

.progress-fill {
  height: 100%;
  background: #ffd700;
  border-radius: 2px;
  transition: width 0.3s;
}

.progress-text {
  color: rgba(255, 255, 255, 0.4);
  font-size: 10px;
}

.celebration {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.celebration-content {
  text-align: center;
  padding: 40px;
}

.celebration-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.celebration-title {
  color: #ffd700;
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 8px;
}

.celebration-desc {
  color: rgba(255, 255, 255, 0.7);
  font-size: 16px;
  margin-bottom: 24px;
}

.celebration-btn {
  background: linear-gradient(135deg, #ffd700, #ff8c00);
  color: #1a1a2e;
  border: none;
  padding: 14px 32px;
  border-radius: 12px;
  font-size: 18px;
  font-weight: bold;
  cursor: pointer;
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

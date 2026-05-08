<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/userStore'

const router = useRouter()
const userStore = useUserStore()

function handleLogout() {
  localStorage.removeItem('math-arena-user-profile')
  location.reload()
}

function handleRetest() {
  userStore.resetDiagnostic()
  router.push('/onboarding/test')
}
</script>

<template>
  <div class="my-page">
    <div class="profile-card">
      <div class="avatar-large">{{ userStore.profile.avatar }}</div>
      <div class="nickname">{{ userStore.profile.nickname }}</div>
      <div class="rank">{{ userStore.profile.gameProfile.rankTier || '未定段' }}</div>
    </div>

    <div class="stats-grid">
      <div class="stat-item">
        <div class="stat-value">{{ userStore.profile.stats.totalAnswered }}</div>
        <div class="stat-label">总答题数</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">
          {{ userStore.profile.stats.totalAnswered > 0
            ? Math.round(userStore.profile.stats.totalCorrect / userStore.profile.stats.totalAnswered * 100)
            : 0 }}%
        </div>
        <div class="stat-label">正确率</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">Lv.{{ userStore.profile.gameProfile.level }}</div>
        <div class="stat-label">等级</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">{{ userStore.profile.gameProfile.gold }}</div>
        <div class="stat-label">金币</div>
      </div>
    </div>

    <div class="menu-list">
      <div class="menu-item" @click="router.push('/data')">
        <span class="menu-icon">📊</span>
        <span class="menu-label">数据中心</span>
        <span class="menu-arrow">›</span>
      </div>
      <div class="menu-item" @click="router.push('/errors')">
        <span class="menu-icon">📝</span>
        <span class="menu-label">错题本</span>
        <span class="menu-arrow">›</span>
      </div>
      <div class="menu-item" @click="router.push('/achievements')">
        <span class="menu-icon">🏆</span>
        <span class="menu-label">成就</span>
        <span class="menu-arrow">›</span>
      </div>
      <div class="menu-item" @click="router.push('/plan')">
        <span class="menu-icon">📅</span>
        <span class="menu-label">学习计划</span>
        <span class="menu-arrow">›</span>
      </div>
      <div class="menu-item" @click="router.push('/teacher')">
        <span class="menu-icon">👨‍🏫</span>
        <span class="menu-label">老师后台</span>
        <span class="menu-arrow">›</span>
      </div>
      <div class="menu-item" @click="router.push('/parent')">
        <span class="menu-icon">👨‍👩‍👧</span>
        <span class="menu-label">家长端</span>
        <span class="menu-arrow">›</span>
      </div>
    </div>

    <div class="actions">
      <button class="action-btn" @click="handleRetest">重新段位定位赛</button>
      <button class="action-btn danger" @click="handleLogout">清除数据并退出</button>
    </div>
  </div>
</template>

<style scoped>
.my-page {
  min-height: 100vh;
  background: #0f1923;
  padding: 20px;
  padding-bottom: 80px;
}

.profile-card {
  text-align: center;
  padding: 32px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  margin-bottom: 20px;
}

.avatar-large {
  font-size: 64px;
  margin-bottom: 12px;
}

.nickname {
  font-size: 24px;
  color: #fff;
  font-weight: bold;
}

.rank {
  color: #ffd700;
  font-size: 16px;
  margin-top: 4px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}

.stat-item {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 16px;
  text-align: center;
}

.stat-value {
  font-size: 24px;
  color: #ffd700;
  font-weight: bold;
}

.stat-label {
  color: rgba(255, 255, 255, 0.6);
  font-size: 12px;
  margin-top: 4px;
}

.menu-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 20px;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  cursor: pointer;
  transition: background 0.2s;
}

.menu-item:hover {
  background: rgba(255, 255, 255, 0.05);
}

.menu-item + .menu-item {
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.menu-icon {
  font-size: 20px;
}

.menu-label {
  flex: 1;
  color: #fff;
  font-size: 15px;
}

.menu-arrow {
  color: rgba(255, 255, 255, 0.3);
  font-size: 18px;
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.action-btn {
  padding: 14px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  background: transparent;
  color: #fff;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:hover {
  border-color: #ffd700;
  color: #ffd700;
}

.action-btn.danger {
  border-color: #ff4757;
  color: #ff4757;
}

.action-btn.danger:hover {
  background: rgba(255, 71, 87, 0.1);
}
</style>

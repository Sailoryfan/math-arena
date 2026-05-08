<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAchievementStore } from '@/stores/achievementStore'

const router = useRouter()
const achievementStore = useAchievementStore()

const activeCategory = ref<string>('all')

const categories = [
  { id: 'all', name: '全部', icon: '📋' },
  { id: 'practice', name: '练习', icon: '📝' },
  { id: 'adventure', name: '冒险', icon: '⚔️' },
  { id: 'pvp', name: '对战', icon: '🏆' },
  { id: 'social', name: '社交', icon: '👥' },
  { id: 'special', name: '特殊', icon: '✨' },
]

const filteredAchievements = computed(() => {
  if (activeCategory.value === 'all') return achievementStore.achievements
  return achievementStore.getAchievementsByCategory(activeCategory.value)
})

function getProgressPercent(progress: number, max: number): number {
  return Math.min(100, Math.round((progress / max) * 100))
}
</script>

<template>
  <div class="achievements-page">
    <div class="header">
      <button class="back-btn" @click="router.push('/')">←</button>
      <h1>成就系统</h1>
    </div>

    <!-- Progress overview -->
    <div class="progress-card">
      <div class="progress-info">
        <div class="progress-title">成就进度</div>
        <div class="progress-numbers">
          <span class="unlocked">{{ achievementStore.unlockedCount }}</span>
          <span class="separator">/</span>
          <span class="total">{{ achievementStore.totalCount }}</span>
        </div>
      </div>
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: achievementStore.completionRate + '%' }"></div>
      </div>
      <div class="progress-percent">{{ achievementStore.completionRate }}% 完成</div>
    </div>

    <!-- Category tabs -->
    <div class="category-tabs">
      <button
        v-for="cat in categories"
        :key="cat.id"
        class="cat-btn"
        :class="{ active: activeCategory === cat.id }"
        @click="activeCategory = cat.id"
      >
        <span class="cat-icon">{{ cat.icon }}</span>
        <span class="cat-name">{{ cat.name }}</span>
      </button>
    </div>

    <!-- Achievements list -->
    <div class="achievements-list">
      <div
        v-for="achievement in filteredAchievements"
        :key="achievement.id"
        class="achievement-card"
        :class="{ unlocked: achievement.unlocked }"
      >
        <div class="achievement-icon" :class="{ locked: !achievement.unlocked }">
          {{ achievement.unlocked ? achievement.icon : '🔒' }}
        </div>
        <div class="achievement-info">
          <div class="achievement-name">{{ achievement.name }}</div>
          <div class="achievement-desc">{{ achievement.description }}</div>
          <div class="achievement-progress" v-if="!achievement.unlocked">
            <div class="mini-progress-bar">
              <div class="mini-progress-fill" :style="{ width: getProgressPercent(achievement.progress, achievement.maxProgress) + '%' }"></div>
            </div>
            <span class="progress-text">{{ achievement.progress }}/{{ achievement.maxProgress }}</span>
          </div>
          <div class="achievement-reward">
            <span class="reward-icon">{{ achievement.reward.type === 'gold' ? '🪙' : achievement.reward.type === 'exp' ? '✨' : '👑' }}</span>
            <span class="reward-value">+{{ achievement.reward.value }}</span>
          </div>
        </div>
        <div class="achievement-status" v-if="achievement.unlocked">
          <span class="check-icon">✓</span>
        </div>
      </div>
    </div>

    <!-- Unlock popup -->
    <div v-if="achievementStore.showUnlockPopup && achievementStore.unlockedAchievement" class="unlock-popup">
      <div class="popup-content">
        <div class="popup-icon">🎉</div>
        <div class="popup-title">成就解锁！</div>
        <div class="popup-achievement">
          <span class="popup-ach-icon">{{ achievementStore.unlockedAchievement.icon }}</span>
          <span class="popup-ach-name">{{ achievementStore.unlockedAchievement.name }}</span>
        </div>
        <div class="popup-reward">
          获得奖励：{{ achievementStore.unlockedAchievement.reward.type === 'gold' ? '🪙' : '✨' }} +{{ achievementStore.unlockedAchievement.reward.value }}
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
      <router-link to="/achievements" class="nav-item active">
        <span class="nav-icon">🏆</span>
        <span class="nav-label">成就</span>
      </router-link>
      <router-link to="/my" class="nav-item">
        <span class="nav-icon">👤</span>
        <span class="nav-label">我的</span>
      </router-link>
    </nav>
  </div>
</template>

<style scoped>
.achievements-page {
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

/* Progress card */
.progress-card {
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.1), rgba(255, 140, 0, 0.08));
  border: 1px solid rgba(255, 215, 0, 0.2);
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 20px;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.progress-title {
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
}

.progress-numbers {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.unlocked {
  color: #ffd700;
  font-size: 24px;
  font-weight: bold;
}

.separator {
  color: rgba(255, 255, 255, 0.3);
  font-size: 16px;
}

.total {
  color: rgba(255, 255, 255, 0.5);
  font-size: 16px;
}

.progress-bar {
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 8px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #ffd700, #ff8c00);
  border-radius: 4px;
  transition: width 0.3s;
}

.progress-percent {
  color: rgba(255, 255, 255, 0.5);
  font-size: 12px;
  text-align: right;
}

/* Category tabs */
.category-tabs {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 8px;
  margin-bottom: 16px;
}

.cat-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  background: transparent;
  color: rgba(255, 255, 255, 0.5);
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
}

.cat-btn.active {
  border-color: #ffd700;
  background: rgba(255, 215, 0, 0.1);
  color: #ffd700;
}

.cat-icon {
  font-size: 14px;
}

/* Achievements list */
.achievements-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.achievement-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.achievement-card.unlocked {
  background: rgba(255, 215, 0, 0.05);
  border-color: rgba(255, 215, 0, 0.15);
}

.achievement-icon {
  font-size: 32px;
  flex-shrink: 0;
}

.achievement-icon.locked {
  opacity: 0.5;
}

.achievement-info {
  flex: 1;
}

.achievement-name {
  color: #fff;
  font-size: 14px;
  font-weight: bold;
  margin-bottom: 2px;
}

.achievement-desc {
  color: rgba(255, 255, 255, 0.5);
  font-size: 12px;
  margin-bottom: 6px;
}

.achievement-progress {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.mini-progress-bar {
  flex: 1;
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  overflow: hidden;
}

.mini-progress-fill {
  height: 100%;
  background: #ffd700;
  border-radius: 2px;
}

.progress-text {
  color: rgba(255, 255, 255, 0.4);
  font-size: 10px;
}

.achievement-reward {
  display: flex;
  align-items: center;
  gap: 4px;
}

.reward-icon {
  font-size: 12px;
}

.reward-value {
  color: #ffd700;
  font-size: 12px;
}

.achievement-status {
  flex-shrink: 0;
}

.check-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: #2ed573;
  border-radius: 50%;
  color: #fff;
  font-size: 14px;
}

/* Unlock popup */
.unlock-popup {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 100;
  animation: slideDown 0.3s ease-out;
}

@keyframes slideDown {
  from { transform: translateX(-50%) translateY(-100%); opacity: 0; }
  to { transform: translateX(-50%) translateY(0); opacity: 1; }
}

.popup-content {
  background: linear-gradient(135deg, #1a1a2e, #2d1b4e);
  border: 1px solid rgba(255, 215, 0, 0.3);
  border-radius: 16px;
  padding: 20px;
  text-align: center;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
}

.popup-icon {
  font-size: 32px;
  margin-bottom: 8px;
}

.popup-title {
  color: #ffd700;
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 12px;
}

.popup-achievement {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 8px;
}

.popup-ach-icon {
  font-size: 24px;
}

.popup-ach-name {
  color: #fff;
  font-size: 18px;
  font-weight: bold;
}

.popup-reward {
  color: rgba(255, 255, 255, 0.7);
  font-size: 13px;
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

<script setup lang="ts">
import { ref } from 'vue'
import { useUserStore } from '@/stores/userStore'
import { useRouter } from 'vue-router'
import RankBadge from '@/components/RankBadge.vue'

const userStore = useUserStore()
const router = useRouter()
const showDiagPrompt = ref(!userStore.hasDiagnostic)

const quickEntries = [
  { icon: '🗡️', label: '冒险闯关', path: '/adventure', disabled: false },
  { icon: '🏰', label: '地牢探险', path: '/dungeon', disabled: false },
  { icon: '⚔️', label: '排位对战', path: '/pvp', disabled: false },
  { icon: '🎵', label: '节奏模式', path: '/rhythm', disabled: false },
]

function goDiagTest() {
  router.push('/onboarding/test')
}

function goRetest() {
  userStore.resetDiagnostic()
  router.push('/onboarding/test')
}

function dismissDiagPrompt() {
  showDiagPrompt.value = false
}
</script>

<template>
  <div class="home-page">
    <div class="top-bar">
      <div class="user-info">
        <span class="avatar">{{ userStore.profile.avatar }}</span>
        <span class="nickname">{{ userStore.profile.nickname }}</span>
        <span class="level">Lv.{{ userStore.profile.gameProfile.level }}</span>
      </div>
      <div class="currency">
        <span class="gold">🪙 {{ userStore.profile.gameProfile.gold }}</span>
      </div>
    </div>

    <div class="diag-prompt" v-if="showDiagPrompt">
      <div class="diag-prompt-icon">📋</div>
      <div class="diag-prompt-content">
        <div class="diag-prompt-title">欢迎来到数学竞技场！</div>
        <div class="diag-prompt-sub">七年级数学</div>
        <div class="diag-prompt-desc">完成段位定位赛，了解你的数学水平，获得个性化学习计划。</div>
      </div>
      <div class="diag-prompt-actions">
        <button class="diag-btn primary" @click="goDiagTest">开始定位赛</button>
        <button class="diag-btn secondary" @click="dismissDiagPrompt">稍后再说</button>
      </div>
    </div>

    <div class="rank-card" v-if="userStore.profile.gameProfile.rankTier">
      <RankBadge :tier="userStore.profile.gameProfile.rankTier" size="medium" />
      <div class="rank-text">
        <div class="rank-label">当前段位</div>
        <div class="rank-value">{{ userStore.profile.gameProfile.rankTier }}</div>
      </div>
      <button class="retest-btn" @click="goRetest">重新定位</button>
    </div>

    <div class="section-title">快捷入口</div>
    <div class="quick-grid">
      <button
        v-for="entry in quickEntries"
        :key="entry.label"
        class="quick-btn"
        :class="{ disabled: entry.disabled }"
        @click="!entry.disabled && router.push(entry.path)"
      >
        <span class="quick-icon">{{ entry.icon }}</span>
        <span class="quick-label">{{ entry.label }}</span>
        <span v-if="entry.disabled" class="coming-soon">即将开放</span>
      </button>
    </div>

    <div class="section-title">今日学习</div>
    <div class="daily-card">
      <div class="daily-stats">
        <div class="daily-stat">
          <div class="stat-val">{{ userStore.profile.stats.totalAnswered }}</div>
          <div class="stat-lbl">总答题</div>
        </div>
        <div class="daily-stat">
          <div class="stat-val">
            {{ userStore.profile.stats.totalAnswered > 0
              ? Math.round(userStore.profile.stats.totalCorrect / userStore.profile.stats.totalAnswered * 100)
              : 0 }}%
          </div>
          <div class="stat-lbl">正确率</div>
        </div>
        <div class="daily-stat">
          <div class="stat-val">{{ userStore.profile.diagnosticProfile.weakPoints.length }}</div>
          <div class="stat-lbl">薄弱点</div>
        </div>
      </div>
    </div>

    <nav class="bottom-nav">
      <router-link to="/" class="nav-item active">
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
      <router-link to="/my" class="nav-item">
        <span class="nav-icon">👤</span>
        <span class="nav-label">我的</span>
      </router-link>
    </nav>
  </div>
</template>

<style scoped>
.home-page {
  min-height: 100vh;
  background: #0f1923;
  padding: 16px;
  padding-bottom: 80px;
  max-width: 500px;
  margin: 0 auto;
}

.top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.avatar {
  font-size: 28px;
}

.nickname {
  color: #fff;
  font-size: 16px;
  font-weight: bold;
}

.level {
  background: rgba(255, 215, 0, 0.15);
  color: #ffd700;
  padding: 2px 8px;
  border-radius: 8px;
  font-size: 12px;
}

.gold {
  color: #ffd700;
  font-size: 14px;
}

.rank-card {
  display: flex;
  align-items: center;
  gap: 16px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 24px;
}

.rank-text {
  flex: 1;
}

.rank-label {
  color: rgba(255, 255, 255, 0.5);
  font-size: 12px;
}

.rank-value {
  color: #ffd700;
  font-size: 22px;
  font-weight: bold;
}

.retest-btn {
  padding: 8px 16px;
  border: 1px solid rgba(255, 215, 0, 0.3);
  border-radius: 8px;
  background: transparent;
  color: #ffd700;
  font-size: 12px;
  cursor: pointer;
}

.retest-btn:hover {
  background: rgba(255, 215, 0, 0.1);
}

.no-rank {
  justify-content: center;
  flex-direction: column;
  gap: 12px;
  text-align: center;
}

.no-rank-text {
  color: rgba(255, 255, 255, 0.5);
}

.diag-prompt {
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.1), rgba(255, 140, 0, 0.08));
  border: 1px solid rgba(255, 215, 0, 0.2);
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 24px;
  text-align: center;
}

.diag-prompt-icon {
  font-size: 40px;
  margin-bottom: 8px;
}

.diag-prompt-title {
  color: #ffd700;
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 4px;
}

.diag-prompt-sub {
  color: rgba(255, 255, 255, 0.5);
  font-size: 12px;
  margin-bottom: 8px;
}

.diag-prompt-desc {
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
  line-height: 1.5;
  margin-bottom: 16px;
}

.diag-prompt-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.diag-btn {
  padding: 10px 24px;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
}

.diag-btn.primary {
  background: linear-gradient(135deg, #ffd700, #ff8c00);
  color: #1a1a2e;
}

.diag-btn.primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(255, 215, 0, 0.3);
}

.diag-btn.secondary {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.15);
}

.diag-btn.secondary:hover {
  background: rgba(255, 255, 255, 0.15);
}

.section-title {
  color: #fff;
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 12px;
}

.quick-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 24px;
}

.quick-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 20px 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.03);
  color: #fff;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.quick-btn:hover:not(.disabled) {
  border-color: #ffd700;
  background: rgba(255, 215, 0, 0.05);
}

.quick-btn.disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.quick-icon {
  font-size: 32px;
}

.quick-label {
  font-size: 14px;
}

.coming-soon {
  position: absolute;
  top: 8px;
  right: 8px;
  font-size: 10px;
  color: rgba(255, 255, 255, 0.3);
  background: rgba(255, 255, 255, 0.05);
  padding: 2px 6px;
  border-radius: 4px;
}

.daily-card {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 24px;
}

.daily-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  text-align: center;
}

.stat-val {
  font-size: 24px;
  color: #ffd700;
  font-weight: bold;
}

.stat-lbl {
  color: rgba(255, 255, 255, 0.5);
  font-size: 12px;
  margin-top: 4px;
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
  cursor: pointer;
}

.nav-item.active {
  color: #ffd700;
}

.nav-item.disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.nav-icon {
  font-size: 20px;
}
</style>

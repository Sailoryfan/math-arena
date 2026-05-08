<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useDungeonStore } from '@/stores/dungeonStore'

const router = useRouter()
const dungeonStore = useDungeonStore()

onMounted(() => {
  dungeonStore.loadRun()
})

function startNewRun() {
  if (!dungeonStore.canRun) return
  const success = dungeonStore.startRun()
  if (success) {
    router.push('/dungeon/map')
  }
}

function continueRun() {
  router.push('/dungeon/map')
}
</script>

<template>
  <div class="dungeon-entrance">
    <div class="header">
      <button class="back-btn" @click="router.push('/')">←</button>
      <h1>地牢探险</h1>
    </div>

    <div class="entrance-art">
      <div class="gate-icon">🏰</div>
      <div class="gate-glow"></div>
    </div>

    <div class="info-card">
      <div class="info-title">无尽地牢</div>
      <div class="info-desc">
        探索随机生成的地牢，用数学知识击败怪物。<br>
        每次答题决定卡牌效果，答对全额生效，答错效果减半！
      </div>
    </div>

    <div class="stats-grid">
      <div class="stat-item">
        <div class="stat-icon">🏔️</div>
        <div class="stat-value">{{ dungeonStore.highestFloor }}</div>
        <div class="stat-label">最高层数</div>
      </div>
      <div class="stat-item">
        <div class="stat-icon">🎫</div>
        <div class="stat-value">{{ dungeonStore.runsRemaining }}</div>
        <div class="stat-label">今日剩余次数</div>
      </div>
    </div>

    <div class="rules-card">
      <div class="rules-title">📜 玩法说明</div>
      <ul class="rules-list">
        <li>每层有多个节点，选择路径前进</li>
        <li>⚔️ 战斗：用卡牌击败怪物</li>
        <li>👹 精英：更强的敌人，掉落遗物</li>
        <li>📦 宝箱：获得新卡牌</li>
        <li>🏪 商店：用金币购买卡牌和遗物</li>
        <li>🏕️ 休息：恢复生命或升级卡牌</li>
        <li>❓ 事件：随机遭遇，做出选择</li>
      </ul>
    </div>

    <div class="action-area">
      <button
        v-if="dungeonStore.currentRun?.isActive"
        class="start-btn continue"
        @click="continueRun"
      >
        继续探险（第{{ dungeonStore.currentRun.floor }}层）
      </button>
      <button
        class="start-btn"
        :class="{ disabled: !dungeonStore.canRun }"
        @click="startNewRun"
      >
        {{ dungeonStore.canRun ? '开始新的探险' : '今日次数已用完' }}
      </button>
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
      <router-link to="/dungeon" class="nav-item active">
        <span class="nav-icon">🏰</span>
        <span class="nav-label">地牢</span>
      </router-link>
      <router-link to="/my" class="nav-item">
        <span class="nav-icon">👤</span>
        <span class="nav-label">我的</span>
      </router-link>
    </nav>
  </div>
</template>

<style scoped>
.dungeon-entrance {
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
  padding: 4px;
}

.header h1 {
  flex: 1;
  color: #fff;
  font-size: 20px;
  margin: 0;
}

.entrance-art {
  text-align: center;
  margin-bottom: 24px;
  position: relative;
}

.gate-icon {
  font-size: 80px;
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

.gate-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 120px;
  height: 120px;
  background: radial-gradient(circle, rgba(138, 43, 226, 0.3), transparent);
  border-radius: 50%;
  z-index: -1;
}

.info-card {
  background: linear-gradient(135deg, rgba(138, 43, 226, 0.1), rgba(75, 0, 130, 0.08));
  border: 1px solid rgba(138, 43, 226, 0.2);
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 20px;
  text-align: center;
}

.info-title {
  color: #bb86fc;
  font-size: 20px;
  font-weight: bold;
  margin-bottom: 8px;
}

.info-desc {
  color: rgba(255, 255, 255, 0.7);
  font-size: 13px;
  line-height: 1.6;
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

.stat-icon {
  font-size: 28px;
  margin-bottom: 8px;
}

.stat-value {
  color: #bb86fc;
  font-size: 28px;
  font-weight: bold;
}

.stat-label {
  color: rgba(255, 255, 255, 0.5);
  font-size: 12px;
  margin-top: 4px;
}

.rules-card {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 24px;
}

.rules-title {
  color: #ffd700;
  font-size: 14px;
  font-weight: bold;
  margin-bottom: 12px;
}

.rules-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.rules-list li {
  color: rgba(255, 255, 255, 0.6);
  font-size: 13px;
  padding: 4px 0;
  padding-left: 8px;
  border-left: 2px solid rgba(138, 43, 226, 0.3);
  margin-bottom: 6px;
}

.action-area {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.start-btn {
  width: 100%;
  padding: 14px;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  background: linear-gradient(135deg, #bb86fc, #6200ea);
  color: #fff;
  transition: all 0.2s;
}

.start-btn:hover {
  filter: brightness(1.1);
  transform: translateY(-1px);
}

.start-btn.continue {
  background: linear-gradient(135deg, #ffd700, #ff8c00);
  color: #1a1a2e;
}

.start-btn.disabled {
  opacity: 0.5;
  cursor: not-allowed;
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
  color: #bb86fc;
}

.nav-icon {
  font-size: 20px;
}
</style>

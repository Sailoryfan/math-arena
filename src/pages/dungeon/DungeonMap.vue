<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useDungeonStore } from '@/stores/dungeonStore'
import type { DungeonNode } from '@/stores/dungeonStore'

const router = useRouter()
const dungeonStore = useDungeonStore()

const currentRun = computed(() => dungeonStore.currentRun)

const currentFloor = computed(() => {
  if (!currentRun.value) return null
  return currentRun.value.map[0]
})

const nodeTypeConfig: Record<string, { icon: string; label: string; color: string }> = {
  battle: { icon: '⚔️', label: '战斗', color: '#ff6b35' },
  elite: { icon: '💀', label: '精英', color: '#ff4757' },
  chest: { icon: '📦', label: '宝箱', color: '#ffd700' },
  shop: { icon: '🏪', label: '商店', color: '#2ed573' },
  rest: { icon: '🏕️', label: '休息', color: '#7bed9f' },
  event: { icon: '❓', label: '事件', color: '#bb86fc' },
  boss: { icon: '👹', label: 'BOSS', color: '#ff4757' },
}

function getNodeConfig(type: string) {
  return nodeTypeConfig[type] || nodeTypeConfig['battle'] || { icon: '⚔️', label: '战斗', color: '#ff6b35' }
}

function selectNode(node: DungeonNode) {
  if (!node.available || node.visited) return
  dungeonStore.selectNode(node.id)

  // Navigate based on node type
  if (node.type === 'battle' || node.type === 'elite' || node.type === 'boss') {
    router.push(`/dungeon/battle/${node.id}`)
  } else if (node.type === 'chest') {
    handleChest(node)
  } else if (node.type === 'shop') {
    handleShop(node)
  } else if (node.type === 'rest') {
    handleRest(node)
  } else if (node.type === 'event') {
    handleEvent(node)
  }
}

function handleChest(node: DungeonNode) {
  if (!currentRun.value) return
  // Give a random card
  const randomCard = dungeonStore.ALL_CARDS[Math.floor(Math.random() * dungeonStore.ALL_CARDS.length)]
  if (!randomCard) return
  currentRun.value.deck.push({ ...randomCard })
  dungeonStore.saveRun()
  alert(`获得卡牌：${randomCard.name}`)
}

function handleShop(node: DungeonNode) {
  // Simple shop: buy a random card for 30 gold
  if (!currentRun.value) return
  if (currentRun.value.gold >= 30) {
    const randomCard = dungeonStore.ALL_CARDS[Math.floor(Math.random() * dungeonStore.ALL_CARDS.length)]
    if (!randomCard) return
    currentRun.value.gold -= 30
    currentRun.value.deck.push({ ...randomCard })
    dungeonStore.saveRun()
    alert(`花费30金币购买了：${randomCard.name}`)
  } else {
    alert('金币不足！')
  }
}

function handleRest(node: DungeonNode) {
  if (!currentRun.value) return
  const heal = Math.round(currentRun.value.playerMaxHP * 0.3)
  currentRun.value.playerHP = Math.min(currentRun.value.playerHP + heal, currentRun.value.playerMaxHP)
  dungeonStore.saveRun()
  alert(`休息恢复了${heal}点生命`)
}

function handleEvent(node: DungeonNode) {
  if (!currentRun.value) return
  const events = [
    { text: '发现一个神秘宝箱！获得20金币', gold: 20, hp: 0 },
    { text: '遇到流浪商人，免费获得一瓶药水。恢复10HP', gold: 0, hp: 10 },
    { text: '触发陷阱！损失10HP', gold: 0, hp: -10 },
    { text: '发现隐藏宝库！获得50金币', gold: 50, hp: 0 },
  ]
  const event = events[Math.floor(Math.random() * events.length)]
  if (!event) return
  currentRun.value.gold += event.gold
  currentRun.value.playerHP = Math.max(1, Math.min(currentRun.value.playerHP + event.hp, currentRun.value.playerMaxHP))
  dungeonStore.saveRun()
  alert(event.text)
}

function nextFloor() {
  dungeonStore.nextFloor()
}

function goBack() {
  router.push('/dungeon')
}
</script>

<template>
  <div class="dungeon-map">
    <div class="header">
      <button class="back-btn" @click="goBack">←</button>
      <h1>第{{ currentRun?.floor || 1 }}层</h1>
      <div class="header-stats">
        <span class="hp">❤️ {{ currentRun?.playerHP }}/{{ currentRun?.playerMaxHP }}</span>
        <span class="gold">🪙 {{ currentRun?.gold }}</span>
      </div>
    </div>

    <div v-if="!currentRun" class="no-run">
      <p>没有进行中的探险</p>
      <button class="btn" @click="router.push('/dungeon')">返回入口</button>
    </div>

    <div v-else class="map-container">
      <!-- Floor info -->
      <div class="floor-info">
        <div class="floor-label">当前层数</div>
        <div class="floor-number">{{ currentRun.floor }}</div>
      </div>

      <!-- Map nodes -->
      <div class="map-grid" v-if="currentFloor">
        <div
          v-for="(row, rowIdx) in Array.from({ length: 7 }, (_, i) => currentFloor!.nodes.filter(n => n.row === i))"
          :key="rowIdx"
          class="map-row"
        >
          <div
            v-for="node in row"
            :key="node.id"
            class="map-node"
            :class="{
              available: node.available && !node.visited,
              visited: node.visited,
              current: currentRun.currentNodeId === node.id,
              locked: !node.available && !node.visited,
            }"
            @click="selectNode(node)"
          >
            <div class="node-icon" :style="{ color: getNodeConfig(node.type).color }">
              {{ getNodeConfig(node.type).icon }}
            </div>
            <div class="node-label">{{ getNodeConfig(node.type).label }}</div>
            <div v-if="node.visited" class="node-check">✓</div>
          </div>
        </div>
      </div>

      <!-- Next floor button -->
      <div v-if="currentFloor?.nodes.every(n => n.visited || !n.available)" class="next-floor-area">
        <button class="next-floor-btn" @click="nextFloor">
          前往第{{ (currentRun.floor || 1) + 1 }}层 →
        </button>
      </div>

      <!-- Deck info -->
      <div class="deck-info">
        <div class="deck-item">
          <span class="deck-label">牌组</span>
          <span class="deck-value">{{ currentRun.deck.length }}张</span>
        </div>
        <div class="deck-item">
          <span class="deck-label">遗物</span>
          <span class="deck-value">{{ currentRun.relics.length }}个</span>
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
.dungeon-map {
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
  color: #bb86fc;
  font-size: 20px;
  margin: 0;
}

.header-stats {
  display: flex;
  gap: 12px;
  font-size: 14px;
}

.hp { color: #ff6b81; }
.gold { color: #ffd700; }

.no-run {
  text-align: center;
  padding: 40px;
  color: rgba(255, 255, 255, 0.5);
}

.btn {
  padding: 10px 24px;
  border: none;
  border-radius: 8px;
  background: linear-gradient(135deg, #bb86fc, #6200ea);
  color: #fff;
  font-size: 14px;
  cursor: pointer;
  margin-top: 12px;
}

.floor-info {
  text-align: center;
  margin-bottom: 24px;
}

.floor-label {
  color: rgba(255, 255, 255, 0.5);
  font-size: 12px;
}

.floor-number {
  color: #bb86fc;
  font-size: 48px;
  font-weight: bold;
}

.map-container {
  position: relative;
}

.map-grid {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
}

.map-row {
  display: flex;
  gap: 16px;
  justify-content: center;
}

.map-node {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 16px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid rgba(255, 255, 255, 0.1);
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
  min-width: 60px;
}

.map-node.available {
  border-color: rgba(187, 134, 252, 0.5);
  background: rgba(187, 134, 252, 0.1);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(187, 134, 252, 0.3); }
  50% { box-shadow: 0 0 0 8px rgba(187, 134, 252, 0); }
}

.map-node.available:hover {
  transform: scale(1.05);
  border-color: #bb86fc;
}

.map-node.visited {
  opacity: 0.5;
  border-color: rgba(46, 213, 115, 0.3);
  cursor: default;
}

.map-node.current {
  border-color: #ffd700;
  background: rgba(255, 215, 0, 0.1);
}

.map-node.locked {
  opacity: 0.3;
  cursor: not-allowed;
}

.node-icon {
  font-size: 24px;
}

.node-label {
  color: rgba(255, 255, 255, 0.7);
  font-size: 11px;
}

.node-check {
  position: absolute;
  top: -4px;
  right: -4px;
  width: 16px;
  height: 16px;
  background: #2ed573;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  color: #fff;
}

.next-floor-area {
  text-align: center;
  margin-bottom: 20px;
}

.next-floor-btn {
  padding: 12px 32px;
  border: none;
  border-radius: 12px;
  background: linear-gradient(135deg, #ffd700, #ff8c00);
  color: #1a1a2e;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
}

.next-floor-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(255, 215, 0, 0.3);
}

.deck-info {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.deck-item {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 8px 16px;
  display: flex;
  gap: 8px;
  align-items: center;
}

.deck-label {
  color: rgba(255, 255, 255, 0.5);
  font-size: 12px;
}

.deck-value {
  color: #bb86fc;
  font-size: 14px;
  font-weight: bold;
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

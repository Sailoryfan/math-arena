<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAdventureStore } from '@/stores/adventureStore'

const router = useRouter()
const adventureStore = useAdventureStore()

const activeChapter = ref(2)
const selectedLevel = ref<string | null>(null)

const chapters = [
  { id: 2, name: '有理数之原', icon: '🌿' },
  { id: 4, name: '方程要塞', icon: '🏰' },
]

const levels = computed(() => adventureStore.getLevels(activeChapter.value))
const chapterProgress = computed(() => adventureStore.getChapterProgress(activeChapter.value))
const chapterStars = computed(() => adventureStore.getChapterStars(activeChapter.value))

function selectLevel(levelId: string) {
  if (!adventureStore.isLevelUnlocked(levelId)) return
  selectedLevel.value = levelId
}

function startBattle() {
  if (!selectedLevel.value) return
  router.push(`/adventure/battle/${selectedLevel.value}`)
}

function closeDetail() {
  selectedLevel.value = null
}

function getStarDisplay(stars: number): string {
  return '★'.repeat(stars) + '☆'.repeat(3 - stars)
}
</script>

<template>
  <div class="adventure-page">
    <div class="header">
      <button class="back-btn" @click="router.push('/')">←</button>
      <h1>冒险闯关</h1>
    </div>

    <!-- Chapter tabs -->
    <div class="chapter-tabs">
      <button
        v-for="ch in chapters"
        :key="ch.id"
        class="chapter-tab"
        :class="{ active: activeChapter === ch.id, locked: !adventureStore.state.chapterProgress[ch.id]?.unlocked }"
        @click="adventureStore.state.chapterProgress[ch.id]?.unlocked && (activeChapter = ch.id)"
      >
        <span class="ch-icon">{{ ch.icon }}</span>
        <span class="ch-name">{{ ch.name }}</span>
        <span class="ch-stars">{{ chapterStars }}★</span>
      </button>
    </div>

    <!-- Chapter progress -->
    <div class="chapter-info">
      <div class="progress-text">{{ chapterProgress.completed }}/{{ chapterProgress.total }} 关卡已通关</div>
      <div class="progress-bar-bg">
        <div class="progress-bar-fill" :style="{ width: (chapterProgress.total > 0 ? chapterProgress.completed / chapterProgress.total * 100 : 0) + '%' }"></div>
      </div>
    </div>

    <!-- Level list -->
    <div class="level-list">
      <div
        v-for="(level, idx) in levels"
        :key="level.id"
        class="level-item"
        :class="{
          locked: !adventureStore.getLevelProgress(level.id).unlocked,
          completed: adventureStore.getLevelProgress(level.id).completed,
          boss: level.isBoss
        }"
        @click="selectLevel(level.id)"
      >
        <div class="level-connector" v-if="idx > 0">
          <div class="connector-line" :class="{ active: adventureStore.getLevelProgress(level.id).unlocked }"></div>
        </div>
        <div class="level-node">
          <div class="level-icon">
            <span v-if="!adventureStore.getLevelProgress(level.id).unlocked">🔒</span>
            <span v-else-if="level.isBoss">👹</span>
            <span v-else-if="adventureStore.getLevelProgress(level.id).completed">⚔️</span>
            <span v-else>🗡️</span>
          </div>
          <div class="level-name">{{ level.name }}</div>
          <div class="level-stars" v-if="adventureStore.getLevelProgress(level.id).completed">
            {{ getStarDisplay(adventureStore.getLevelProgress(level.id).stars) }}
          </div>
          <div class="level-diff">
            <span v-for="i in 5" :key="i" :class="{ active: i <= level.difficulty }">★</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Level detail modal -->
    <div v-if="selectedLevel" class="modal-overlay" @click.self="closeDetail">
      <div class="modal" v-if="adventureStore.getLevelConfig(selectedLevel)">
        <div class="modal-header" :class="{ boss: adventureStore.getLevelConfig(selectedLevel)?.isBoss }">
          <h2>{{ adventureStore.getLevelConfig(selectedLevel)?.name }}</h2>
          <button class="close-btn" @click="closeDetail">×</button>
        </div>
        <div class="modal-body">
          <p class="desc">{{ adventureStore.getLevelConfig(selectedLevel)?.description }}</p>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">难度</span>
              <span class="info-value">
                <span v-for="i in 5" :key="i" :class="{ active: i <= (adventureStore.getLevelConfig(selectedLevel)?.difficulty || 0) }">★</span>
              </span>
            </div>
            <div class="info-item">
              <span class="info-label">怪物数</span>
              <span class="info-value">{{ adventureStore.getLevelConfig(selectedLevel)?.monsterCount }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">奖励经验</span>
              <span class="info-value gold">+{{ adventureStore.getLevelConfig(selectedLevel)?.reward.exp }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">奖励金币</span>
              <span class="info-value gold">+{{ adventureStore.getLevelConfig(selectedLevel)?.reward.gold }} 🪙</span>
            </div>
          </div>
          <div class="star-conditions">
            <div class="star-title">星星条件</div>
            <div class="star-row">
              <span class="star">★</span>
              <span>通关</span>
            </div>
            <div class="star-row">
              <span class="star">★★</span>
              <span>正确率 ≥ {{ adventureStore.getLevelConfig(selectedLevel)?.starConditions.accuracy }}%</span>
            </div>
            <div class="star-row">
              <span class="star">★★★</span>
              <span>连击 ≥ {{ adventureStore.getLevelConfig(selectedLevel)?.starConditions.combo }}</span>
            </div>
          </div>
          <div class="best-record" v-if="adventureStore.getLevelProgress(selectedLevel).completed">
            <div class="record-title">最佳记录</div>
            <div class="record-grid">
              <span>最高连击: {{ adventureStore.getLevelProgress(selectedLevel).bestCombo }}</span>
              <span>最佳正确率: {{ adventureStore.getLevelProgress(selectedLevel).bestAccuracy }}%</span>
            </div>
          </div>
        </div>
        <button class="start-btn" @click="startBattle">
          {{ adventureStore.getLevelConfig(selectedLevel)?.isBoss ? '挑战BOSS' : '开始挑战' }}
        </button>
      </div>
    </div>

    <nav class="bottom-nav">
      <router-link to="/" class="nav-item">
        <span class="nav-icon">🏠</span>
        <span class="nav-label">首页</span>
      </router-link>
      <router-link to="/adventure" class="nav-item active">
        <span class="nav-icon">⚔️</span>
        <span class="nav-label">冒险</span>
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
.adventure-page {
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

.chapter-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.chapter-tab {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  transition: all 0.2s;
}

.chapter-tab.active {
  border-color: #ffd700;
  background: rgba(255, 215, 0, 0.1);
  color: #ffd700;
}

.chapter-tab.locked {
  opacity: 0.4;
  cursor: not-allowed;
}

.ch-icon {
  font-size: 24px;
}

.ch-name {
  font-size: 13px;
  font-weight: bold;
}

.ch-stars {
  font-size: 11px;
  color: #ffd700;
}

.chapter-info {
  margin-bottom: 20px;
}

.progress-text {
  color: rgba(255, 255, 255, 0.5);
  font-size: 12px;
  margin-bottom: 6px;
}

.progress-bar-bg {
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
}

.progress-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #ffd700, #ff8c00);
  border-radius: 3px;
  transition: width 0.3s;
}

.level-list {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
}

.level-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  width: 100%;
}

.level-item.locked {
  opacity: 0.4;
  cursor: not-allowed;
}

.level-connector {
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.connector-line {
  width: 2px;
  height: 100%;
  background: rgba(255, 255, 255, 0.1);
}

.connector-line.active {
  background: #ffd700;
}

.level-node {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  width: 80%;
  transition: all 0.2s;
}

.level-item:not(.locked):hover .level-node {
  border-color: #ffd700;
  background: rgba(255, 215, 0, 0.05);
}

.level-item.completed .level-node {
  border-color: rgba(46, 213, 115, 0.3);
  background: rgba(46, 213, 115, 0.05);
}

.level-item.boss .level-node {
  border-color: rgba(255, 71, 87, 0.3);
  background: rgba(255, 71, 87, 0.05);
}

.level-icon {
  font-size: 28px;
}

.level-name {
  color: #fff;
  font-size: 14px;
  font-weight: bold;
}

.level-stars {
  color: #ffd700;
  font-size: 14px;
  letter-spacing: 2px;
}

.level-diff span {
  color: rgba(255, 255, 255, 0.2);
  font-size: 10px;
}

.level-diff span.active {
  color: #ffd700;
}

/* Modal */
.modal-overlay {
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
  padding: 20px;
}

.modal {
  background: #1a1a2e;
  border-radius: 16px;
  width: 100%;
  max-width: 400px;
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: rgba(255, 215, 0, 0.1);
  border-bottom: 1px solid rgba(255, 215, 0, 0.2);
}

.modal-header.boss {
  background: rgba(255, 71, 87, 0.1);
  border-bottom-color: rgba(255, 71, 87, 0.2);
}

.modal-header h2 {
  color: #ffd700;
  font-size: 18px;
  margin: 0;
}

.modal-header.boss h2 {
  color: #ff4757;
}

.close-btn {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.5);
  font-size: 24px;
  cursor: pointer;
  padding: 0 4px;
}

.modal-body {
  padding: 20px;
}

.desc {
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
  margin-bottom: 16px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-label {
  color: rgba(255, 255, 255, 0.4);
  font-size: 12px;
}

.info-value {
  color: #fff;
  font-size: 14px;
}

.info-value.gold {
  color: #ffd700;
}

.star-conditions {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 12px;
}

.star-title {
  color: #ffd700;
  font-size: 13px;
  font-weight: bold;
  margin-bottom: 8px;
}

.star-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
}

.star {
  color: #ffd700;
  min-width: 36px;
}

.best-record {
  background: rgba(46, 213, 115, 0.05);
  border-radius: 8px;
  padding: 12px;
}

.record-title {
  color: #2ed573;
  font-size: 13px;
  font-weight: bold;
  margin-bottom: 8px;
}

.record-grid {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
}

.start-btn {
  width: 100%;
  padding: 14px;
  background: linear-gradient(135deg, #ffd700, #ff8c00);
  color: #1a1a2e;
  border: none;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
}

.start-btn:hover {
  filter: brightness(1.1);
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

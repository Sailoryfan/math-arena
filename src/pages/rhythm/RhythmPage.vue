<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useRhythmStore } from '@/stores/rhythmStore'

const router = useRouter()
const rhythmStore = useRhythmStore()

const selectedSong = ref<string | null>(null)
const selectedDifficulty = ref(1)
const showResult = ref(false)
const answerInput = ref('')
const activeLane = ref(-1)
const judgmentText = ref('')
const judgmentType = ref('')

let animFrame: number | null = null
let lastTime = 0

const songConfig = computed(() => rhythmStore.songs.find(s => s.id === selectedSong.value))

// Notes currently visible on screen
const visibleNotes = computed(() => {
  return rhythmStore.notes
    .filter(n => !n.hit && !n.missed && n.y > -80 && n.y < 620)
    .sort((a, b) => a.y - b.y)
})

// The closest note to the hit line that hasn't been hit
const targetNote = computed(() => {
  const hitLineY = 380
  let closest: typeof rhythmStore.notes[0] | null = null
  let closestDist = Infinity
  for (const note of rhythmStore.notes) {
    if (note.hit || note.missed) continue
    const dist = Math.abs(note.y - hitLineY)
    if (dist < closestDist && dist < 150) {
      closestDist = dist
      closest = note
    }
  }
  return closest
})

onMounted(() => {
  // Auto-select first song
  if (rhythmStore.songs.length > 0) {
    selectedSong.value = rhythmStore.songs[0].id
  }
})

onUnmounted(() => {
  stopGame()
})

function selectSong(songId: string) {
  selectedSong.value = songId
}

function startGame() {
  if (!selectedSong.value) return
  showResult.value = false
  answerInput.value = ''
  judgmentText.value = ''

  rhythmStore.startGame(selectedSong.value, selectedDifficulty.value)

  lastTime = performance.now()
  gameLoop()
}

function gameLoop() {
  const now = performance.now()
  const delta = now - lastTime
  lastTime = now

  rhythmStore.updateNotes(delta)

  if (rhythmStore.isPlaying) {
    animFrame = requestAnimationFrame(gameLoop)
  } else {
    showResult.value = true
  }
}

function stopGame() {
  if (animFrame) {
    cancelAnimationFrame(animFrame)
    animFrame = null
  }
}

function handleSubmitAnswer() {
  const input = answerInput.value.trim()
  if (!input || !targetNote.value) return

  const userAnswer = Number(input)
  if (isNaN(userAnswer)) {
    answerInput.value = ''
    return
  }

  if (userAnswer === targetNote.value.answer) {
    // Correct — hit the note
    const judgment = rhythmStore.hitNote(targetNote.value.lane)
    if (judgment) {
      showJudgment(judgment, true)
    }
  } else {
    // Wrong answer — treat as miss
    showJudgment('MISS', false)
    rhythmStore.combo = 0
    rhythmStore.hp = Math.max(0, rhythmStore.hp - 5)
    // Mark the note as missed so it doesn't linger
    targetNote.value.missed = true
    rhythmStore.missCount++
  }

  answerInput.value = ''
  activeLane.value = -1
}

function handleLaneClick(lane: number) {
  activeLane.value = lane
  // Find closest note in this lane
  const hitLineY = 500
  let closest: typeof rhythmStore.notes[0] | null = null
  let closestDist = Infinity
  for (const note of rhythmStore.notes) {
    if (note.hit || note.missed || note.lane !== lane) continue
    const dist = Math.abs(note.y - hitLineY)
    if (dist < closestDist && dist < 150) {
      closestDist = dist
      closest = note
    }
  }
  if (closest) {
    // Pre-fill the input with hint
    answerInput.value = ''
    // Focus input
    const el = document.querySelector('.answer-input') as HTMLInputElement
    if (el) el.focus()
  }
}

function showJudgment(text: string, correct: boolean) {
  judgmentText.value = text
  judgmentType.value = correct ? (text === 'PERFECT' ? 'perfect' : text === 'GREAT' ? 'great' : 'good') : 'miss'
  setTimeout(() => { judgmentText.value = '' }, 500)
}

function endGame() {
  stopGame()
  rhythmStore.endGame(true)
  showResult.value = true
}

function getGradeColor(grade: string): string {
  if (grade === 'S') return '#ffd700'
  if (grade === 'A') return '#2ed573'
  if (grade === 'B') return '#bb86fc'
  if (grade === 'C') return '#ff8c00'
  return '#ff4757'
}

function getNoteColor(lane: number): string {
  const colors = ['#ff6b35', '#2ed573', '#bb86fc', '#ffd700']
  return colors[lane] || '#fff'
}

function getLaneLabel(lane: number): string {
  return ['A', 'B', 'C', 'D'][lane] || ''
}

function goBack() {
  stopGame()
  rhythmStore.isPlaying = false
  showResult.value = false
  router.push('/')
}
</script>

<template>
  <div class="rhythm-page">
    <div class="header">
      <button class="back-btn" @click="goBack">←</button>
      <h1>节奏模式</h1>
    </div>

    <!-- Song selection -->
    <div v-if="!rhythmStore.isPlaying && !showResult" class="song-select">
      <div class="section-title">选择曲目</div>
      <div class="song-list">
        <div
          v-for="song in rhythmStore.songs"
          :key="song.id"
          class="song-card"
          :class="{ selected: selectedSong === song.id }"
          @click="selectSong(song.id)"
        >
          <div class="song-icon">{{ song.icon }}</div>
          <div class="song-info">
            <div class="song-name">{{ song.name }}</div>
            <div class="song-desc">{{ song.description }}</div>
            <div class="song-high" v-if="rhythmStore.getHighScore(song.id, selectedDifficulty) > 0">
              最高分: {{ rhythmStore.getHighScore(song.id, selectedDifficulty) }}
            </div>
          </div>
        </div>
      </div>

      <div v-if="selectedSong" class="difficulty-select">
        <div class="section-title">选择难度</div>
        <div class="diff-buttons">
          <button
            v-for="diff in [1, 2, 3]"
            :key="diff"
            class="diff-btn"
            :class="{ active: selectedDifficulty === diff }"
            @click="selectedDifficulty = diff"
          >
            {{ ['简单', '普通', '困难'][diff - 1] }}
          </button>
        </div>
      </div>

      <button v-if="selectedSong" class="start-btn" @click="startGame">
        开始游戏
      </button>

      <div class="rules-card">
        <div class="rules-title">🎮 玩法说明</div>
        <ul class="rules-list">
          <li>运算式从上方下落，到达判定线时输入答案</li>
          <li>答案正确且越靠近判定线，评价越高</li>
          <li>PERFECT/GREAT/GOOD 不同得分</li>
          <li>答错或漏掉会扣血，血量归零游戏结束</li>
          <li>连击可获得额外分数加成</li>
        </ul>
      </div>
    </div>

    <!-- Game area -->
    <div v-if="rhythmStore.isPlaying" class="game-area">
      <!-- HUD -->
      <div class="hud">
        <div class="hud-left">
          <div class="score-label">得分</div>
          <div class="score-value">{{ rhythmStore.score }}</div>
        </div>
        <div class="hud-center">
          <div v-if="rhythmStore.combo >= 2" class="combo-display">
            <span class="combo-fire">🔥</span>
            <span class="combo-num">{{ rhythmStore.combo }}</span>
          </div>
        </div>
        <div class="hud-right">
          <div class="progress-text">{{ rhythmStore.notes.filter(n => n.hit || n.missed).length }}/{{ rhythmStore.totalNotes }}</div>
        </div>
      </div>

      <!-- HP bar -->
      <div class="hp-bar-container">
        <div class="hp-bar">
          <div class="hp-fill" :style="{ width: rhythmStore.hp + '%' }" :class="{ low: rhythmStore.hp < 30 }"></div>
        </div>
        <span class="hp-text">{{ Math.round(rhythmStore.hp) }}%</span>
      </div>

      <!-- Falling notes area -->
      <div class="falling-area">
        <!-- Lane dividers -->
        <div class="lanes">
          <div v-for="lane in 4" :key="lane" class="lane" @click="handleLaneClick(lane - 1)">
            <div class="lane-label">{{ getLaneLabel(lane - 1) }}</div>
          </div>
        </div>

        <!-- Hit line -->
        <div class="hit-line">
          <div class="hit-line-segment" v-for="lane in 4" :key="lane"></div>
        </div>

        <!-- Notes -->
        <div
          v-for="note in visibleNotes"
          :key="note.id"
          class="note"
          :class="{ target: targetNote?.id === note.id }"
          :style="{
            left: (note.lane * 25 + 2) + '%',
            top: note.y + 'px',
            borderColor: getNoteColor(note.lane),
            background: targetNote?.id === note.id ? getNoteColor(note.lane) + '33' : 'rgba(255,255,255,0.08)'
          }"
        >
          <span class="note-expression">{{ note.expression }}</span>
        </div>

        <!-- Judgment text -->
        <div v-if="judgmentText" class="judgment" :class="judgmentType">
          {{ judgmentText }}
        </div>
      </div>

      <!-- Answer input -->
      <div class="input-area">
        <div class="target-hint" v-if="targetNote">
          目标: <strong>{{ targetNote.expression }} = ?</strong>
        </div>
        <div class="target-hint" v-else>
          等待音符到达判定线...
        </div>
        <form class="input-row" @submit.prevent="handleSubmitAnswer">
          <input
            v-model="answerInput"
            class="answer-input"
            type="number"
            placeholder="输入答案"
            autocomplete="off"
            ref="inputRef"
          />
          <button type="submit" class="submit-btn" :disabled="!answerInput || !targetNote">
            确认
          </button>
        </form>
      </div>

      <!-- Stats -->
      <div class="game-stats">
        <div class="stat-item perfect">
          <span class="stat-label">PERFECT</span>
          <span class="stat-value">{{ rhythmStore.perfectCount }}</span>
        </div>
        <div class="stat-item great">
          <span class="stat-label">GREAT</span>
          <span class="stat-value">{{ rhythmStore.greatCount }}</span>
        </div>
        <div class="stat-item good">
          <span class="stat-label">GOOD</span>
          <span class="stat-value">{{ rhythmStore.goodCount }}</span>
        </div>
        <div class="stat-item miss">
          <span class="stat-label">MISS</span>
          <span class="stat-value">{{ rhythmStore.missCount }}</span>
        </div>
      </div>
    </div>

    <!-- Result -->
    <div v-if="showResult" class="result-screen">
      <div class="result-grade" :style="{ color: getGradeColor(rhythmStore.grade) }">
        {{ rhythmStore.grade }}
      </div>
      <div class="result-song">{{ songConfig?.name }}</div>
      <div class="result-difficulty">{{ ['简单', '普通', '困难'][selectedDifficulty - 1] }}</div>

      <div class="result-stats">
        <div class="result-stat">
          <span class="stat-label">得分</span>
          <span class="stat-value gold">{{ rhythmStore.score }}</span>
        </div>
        <div class="result-stat">
          <span class="stat-label">最高连击</span>
          <span class="stat-value">{{ rhythmStore.maxCombo }}</span>
        </div>
        <div class="result-stat">
          <span class="stat-label">准确率</span>
          <span class="stat-value">{{ rhythmStore.accuracy }}%</span>
        </div>
        <div class="result-stat">
          <span class="stat-label">评价</span>
          <span class="stat-value" :style="{ color: getGradeColor(rhythmStore.grade) }">{{ rhythmStore.grade }}</span>
        </div>
      </div>

      <div class="result-breakdown">
        <div class="breakdown-item perfect">
          <span class="bd-label">PERFECT</span>
          <span class="bd-value">{{ rhythmStore.perfectCount }}</span>
        </div>
        <div class="breakdown-item great">
          <span class="bd-label">GREAT</span>
          <span class="bd-value">{{ rhythmStore.greatCount }}</span>
        </div>
        <div class="breakdown-item good">
          <span class="bd-label">GOOD</span>
          <span class="bd-value">{{ rhythmStore.goodCount }}</span>
        </div>
        <div class="breakdown-item miss">
          <span class="bd-label">MISS</span>
          <span class="bd-value">{{ rhythmStore.missCount }}</span>
        </div>
      </div>

      <div class="result-actions">
        <button class="btn-primary" @click="startGame">再来一次</button>
        <button class="btn-secondary" @click="showResult = false; selectedSong = null">返回</button>
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
      <router-link to="/rhythm" class="nav-item active">
        <span class="nav-icon">🎵</span>
        <span class="nav-label">节奏</span>
      </router-link>
      <router-link to="/my" class="nav-item">
        <span class="nav-icon">👤</span>
        <span class="nav-label">我的</span>
      </router-link>
    </nav>
  </div>
</template>

<style scoped>
.rhythm-page {
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
  color: #fff;
  font-size: 20px;
  margin: 0;
}

.section-title {
  color: #fff;
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 12px;
}

.song-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
}

.song-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.song-card:hover {
  border-color: rgba(187, 134, 252, 0.3);
}

.song-card.selected {
  border-color: #bb86fc;
  background: rgba(187, 134, 252, 0.1);
}

.song-icon {
  font-size: 32px;
}

.song-info {
  flex: 1;
}

.song-name {
  color: #fff;
  font-size: 16px;
  font-weight: bold;
}

.song-desc {
  color: rgba(255, 255, 255, 0.5);
  font-size: 12px;
  margin-top: 2px;
}

.song-high {
  color: #ffd700;
  font-size: 11px;
  margin-top: 2px;
}

.difficulty-select {
  margin-bottom: 20px;
}

.diff-buttons {
  display: flex;
  gap: 8px;
}

.diff-btn {
  flex: 1;
  padding: 10px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  background: transparent;
  color: rgba(255, 255, 255, 0.7);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.diff-btn.active {
  border-color: #bb86fc;
  background: rgba(187, 134, 252, 0.1);
  color: #bb86fc;
}

.start-btn {
  width: 100%;
  padding: 14px;
  border: none;
  border-radius: 12px;
  background: linear-gradient(135deg, #bb86fc, #6200ea);
  color: #fff;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  margin-bottom: 20px;
}

.rules-card {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 12px;
  padding: 16px;
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
  border-left: 2px solid rgba(187, 134, 252, 0.3);
  margin-bottom: 6px;
}

/* Game area */
.game-area {
  text-align: center;
}

.hud {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.hud-left { text-align: left; }
.hud-center { text-align: center; }
.hud-right { text-align: right; }

.score-label {
  color: rgba(255, 255, 255, 0.5);
  font-size: 11px;
}

.score-value {
  color: #ffd700;
  font-size: 24px;
  font-weight: bold;
}

.combo-display {
  display: flex;
  align-items: center;
  gap: 4px;
  background: rgba(255, 107, 53, 0.2);
  padding: 4px 14px;
  border-radius: 20px;
}

.combo-fire { font-size: 18px; }
.combo-num { color: #ff6b35; font-weight: bold; font-size: 18px; }

.progress-text {
  color: rgba(255, 255, 255, 0.5);
  font-size: 13px;
}

.hp-bar-container {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.hp-bar {
  flex: 1;
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  overflow: hidden;
}

.hp-fill {
  height: 100%;
  background: linear-gradient(90deg, #2ed573, #7bed9f);
  border-radius: 4px;
  transition: width 0.3s;
}

.hp-fill.low {
  background: linear-gradient(90deg, #ff4757, #ff6b81);
}

.hp-text {
  color: rgba(255, 255, 255, 0.5);
  font-size: 12px;
  min-width: 40px;
}

/* Falling area */
.falling-area {
  position: relative;
  height: 450px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.lanes {
  display: flex;
  position: absolute;
  inset: 0;
}

.lane {
  flex: 1;
  border-right: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding-bottom: 8px;
  cursor: pointer;
}

.lane:last-child {
  border-right: none;
}

.lane-label {
  color: rgba(255, 255, 255, 0.15);
  font-size: 14px;
  font-weight: bold;
}

/* Hit line */
.hit-line {
  position: absolute;
  bottom: 70px;
  left: 0;
  right: 0;
  display: flex;
  pointer-events: none;
}

.hit-line-segment {
  flex: 1;
  height: 3px;
  background: rgba(255, 255, 255, 0.3);
  margin: 0 1px;
  box-shadow: 0 0 8px rgba(187, 134, 252, 0.5);
}

/* Notes */
.note {
  position: absolute;
  width: 22%;
  padding: 8px 4px;
  border: 2px solid;
  border-radius: 8px;
  text-align: center;
  transition: background 0.1s;
  pointer-events: none;
}

.note.target {
  box-shadow: 0 0 12px rgba(255, 255, 255, 0.3);
  z-index: 2;
}

.note-expression {
  color: #fff;
  font-size: 13px;
  font-weight: bold;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Judgment */
.judgment {
  position: absolute;
  top: 40%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 28px;
  font-weight: bold;
  pointer-events: none;
  animation: judgmentPop 0.5s forwards;
  z-index: 10;
}

.judgment.perfect { color: #ffd700; text-shadow: 0 0 10px #ffd700; }
.judgment.great { color: #2ed573; text-shadow: 0 0 10px #2ed573; }
.judgment.good { color: #bb86fc; text-shadow: 0 0 10px #bb86fc; }
.judgment.miss { color: #ff4757; text-shadow: 0 0 10px #ff4757; }

@keyframes judgmentPop {
  0% { opacity: 1; transform: translate(-50%, -50%) scale(1.5); }
  50% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
  100% { opacity: 0; transform: translate(-50%, -60%) scale(0.8); }
}

/* Input area */
.input-area {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 12px;
  margin-bottom: 12px;
}

.target-hint {
  color: rgba(255, 255, 255, 0.6);
  font-size: 13px;
  margin-bottom: 8px;
  min-height: 20px;
}

.target-hint strong {
  color: #ffd700;
}

.input-row {
  display: flex;
  gap: 8px;
}

.answer-input {
  flex: 1;
  padding: 12px;
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  color: #fff;
  font-size: 18px;
  text-align: center;
}

.answer-input:focus {
  outline: none;
  border-color: #bb86fc;
}

.submit-btn {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  background: linear-gradient(135deg, #bb86fc, #6200ea);
  color: #fff;
  font-size: 15px;
  font-weight: bold;
  cursor: pointer;
}

.submit-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* Stats */
.game-stats {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.stat-label {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.5);
}

.stat-value {
  font-size: 16px;
  font-weight: bold;
}

.stat-item.perfect .stat-value { color: #ffd700; }
.stat-item.great .stat-value { color: #2ed573; }
.stat-item.good .stat-value { color: #bb86fc; }
.stat-item.miss .stat-value { color: #ff4757; }

/* Result screen */
.result-screen {
  text-align: center;
  padding: 20px;
}

.result-grade {
  font-size: 80px;
  font-weight: bold;
  margin-bottom: 8px;
}

.result-song {
  color: #fff;
  font-size: 20px;
  font-weight: bold;
}

.result-difficulty {
  color: rgba(255, 255, 255, 0.5);
  font-size: 14px;
  margin-bottom: 24px;
}

.result-stats {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}

.result-stat {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 12px;
}

.result-stat .stat-label {
  color: rgba(255, 255, 255, 0.5);
  font-size: 11px;
  display: block;
  margin-bottom: 4px;
}

.result-stat .stat-value {
  color: #fff;
  font-size: 18px;
  font-weight: bold;
}

.result-stat .stat-value.gold { color: #ffd700; }

.result-breakdown {
  display: flex;
  gap: 8px;
  justify-content: center;
  margin-bottom: 24px;
}

.breakdown-item {
  padding: 8px 12px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.03);
}

.bd-label {
  font-size: 10px;
  display: block;
  margin-bottom: 2px;
}

.bd-value {
  font-size: 16px;
  font-weight: bold;
}

.breakdown-item.perfect .bd-label { color: #ffd700; }
.breakdown-item.perfect .bd-value { color: #ffd700; }
.breakdown-item.great .bd-label { color: #2ed573; }
.breakdown-item.great .bd-value { color: #2ed573; }
.breakdown-item.good .bd-label { color: #bb86fc; }
.breakdown-item.good .bd-value { color: #bb86fc; }
.breakdown-item.miss .bd-label { color: #ff4757; }
.breakdown-item.miss .bd-value { color: #ff4757; }

.result-actions {
  display: flex;
  gap: 12px;
}

.btn-primary, .btn-secondary {
  flex: 1;
  padding: 12px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
  border: none;
}

.btn-primary {
  background: linear-gradient(135deg, #bb86fc, #6200ea);
  color: #fff;
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
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

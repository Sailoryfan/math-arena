<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useSocialStore } from '@/stores/socialStore'

const router = useRouter()
const socialStore = useSocialStore()

const activeTab = ref<'friends' | 'leaderboard'>('friends')
const showAddFriend = ref(false)
const newFriendName = ref('')

function addFriend() {
  if (!newFriendName.value.trim()) return
  socialStore.addFriend(newFriendName.value.trim())
  newFriendName.value = ''
  showAddFriend.value = false
}

function getRankColor(rank: string): string {
  const colors: Record<string, string> = {
    '青铜': '#cd7f32',
    '白银': '#c0c0c0',
    '黄金': '#ffd700',
    '铂金': '#00ced1',
    '钻石': '#b9f2ff',
    '大师': '#ff6b35',
    '王者': '#ff4757',
  }
  return colors[rank] || '#c0c0c0'
}

function getMedalIcon(index: number): string {
  if (index === 0) return '🥇'
  if (index === 1) return '🥈'
  if (index === 2) return '🥉'
  return `${index + 1}`
}
</script>

<template>
  <div class="social-page">
    <div class="header">
      <button class="back-btn" @click="router.push('/')">←</button>
      <h1>社交</h1>
    </div>

    <!-- Tabs -->
    <div class="tabs">
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'friends' }"
        @click="activeTab = 'friends'"
      >
        👥 好友
      </button>
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'leaderboard' }"
        @click="activeTab = 'leaderboard'"
      >
        🏆 排行榜
      </button>
    </div>

    <!-- Friends Tab -->
    <div v-if="activeTab === 'friends'" class="tab-content">
      <!-- Online friends -->
      <div class="section" v-if="socialStore.onlineFriends.length">
        <div class="section-title">在线 ({{ socialStore.onlineFriends.length }})</div>
        <div class="friend-list">
          <div v-for="friend in socialStore.onlineFriends" :key="friend.id" class="friend-card">
            <div class="friend-avatar">
              <span class="avatar-icon">{{ friend.avatar }}</span>
              <span class="online-dot"></span>
            </div>
            <div class="friend-info">
              <div class="friend-name">{{ friend.name }}</div>
              <div class="friend-meta">
                <span class="friend-rank" :style="{ color: getRankColor(friend.rank) }">{{ friend.rank }}</span>
                <span class="friend-level">Lv.{{ friend.level }}</span>
              </div>
            </div>
            <div class="friend-actions">
              <button class="action-btn challenge" @click="router.push('/pvp')">挑战</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Offline friends -->
      <div class="section" v-if="socialStore.offlineFriends.length">
        <div class="section-title">离线 ({{ socialStore.offlineFriends.length }})</div>
        <div class="friend-list">
          <div v-for="friend in socialStore.offlineFriends" :key="friend.id" class="friend-card offline">
            <div class="friend-avatar">
              <span class="avatar-icon">{{ friend.avatar }}</span>
            </div>
            <div class="friend-info">
              <div class="friend-name">{{ friend.name }}</div>
              <div class="friend-meta">
                <span class="friend-rank" :style="{ color: getRankColor(friend.rank) }">{{ friend.rank }}</span>
                <span class="friend-level">Lv.{{ friend.level }}</span>
                <span class="friend-last-active">{{ friend.lastActive }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Add friend button -->
      <button class="add-friend-btn" @click="showAddFriend = true">
        <span>+</span> 添加好友
      </button>
    </div>

    <!-- Leaderboard Tab -->
    <div v-if="activeTab === 'leaderboard'" class="tab-content">
      <!-- My rank -->
      <div class="my-rank-card">
        <div class="my-rank-label">我的排名</div>
        <div class="my-rank-info">
          <span class="my-rank-pos">#--</span>
          <span class="my-rank-score">继续努力上榜！</span>
        </div>
      </div>

      <!-- Leaderboard list -->
      <div class="leaderboard-list">
        <div
          v-for="(entry, idx) in socialStore.leaderboard"
          :key="entry.id"
          class="leaderboard-item"
          :class="{ top3: idx < 3 }"
        >
          <div class="rank-pos">
            <span class="medal" v-if="idx < 3">{{ getMedalIcon(idx) }}</span>
            <span class="rank-num" v-else>{{ idx + 1 }}</span>
          </div>
          <div class="entry-avatar">{{ entry.avatar }}</div>
          <div class="entry-info">
            <div class="entry-name">{{ entry.name }}</div>
            <div class="entry-meta">
              <span class="entry-rank" :style="{ color: getRankColor(entry.rank) }">{{ entry.rank }}</span>
              <span class="entry-matches">{{ entry.totalMatches }}场</span>
            </div>
          </div>
          <div class="entry-score">{{ entry.score }}</div>
        </div>
      </div>
    </div>

    <!-- Add friend modal -->
    <div v-if="showAddFriend" class="modal-overlay" @click.self="showAddFriend = false">
      <div class="modal">
        <div class="modal-header">
          <h2>添加好友</h2>
          <button class="close-btn" @click="showAddFriend = false">×</button>
        </div>
        <div class="modal-body">
          <input
            v-model="newFriendName"
            class="friend-input"
            placeholder="输入好友昵称"
            @keyup.enter="addFriend"
          />
          <button class="submit-btn" @click="addFriend">添加</button>
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
      <router-link to="/social" class="nav-item active">
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
.social-page {
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
  color: #fff;
  font-size: 20px;
  margin: 0;
}

/* Tabs */
.tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
}

.tab-btn {
  flex: 1;
  padding: 10px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  background: transparent;
  color: rgba(255, 255, 255, 0.5);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.tab-btn.active {
  border-color: #ffd700;
  background: rgba(255, 215, 0, 0.1);
  color: #ffd700;
}

/* Friends */
.section {
  margin-bottom: 20px;
}

.section-title {
  color: rgba(255, 255, 255, 0.5);
  font-size: 12px;
  margin-bottom: 10px;
  padding-left: 4px;
}

.friend-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.friend-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
}

.friend-card.offline {
  opacity: 0.6;
}

.friend-avatar {
  position: relative;
}

.avatar-icon {
  font-size: 32px;
}

.online-dot {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 10px;
  height: 10px;
  background: #2ed573;
  border-radius: 50%;
  border: 2px solid #0f1923;
}

.friend-info {
  flex: 1;
}

.friend-name {
  color: #fff;
  font-size: 14px;
  font-weight: bold;
}

.friend-meta {
  display: flex;
  gap: 8px;
  margin-top: 2px;
}

.friend-rank {
  font-size: 12px;
  font-weight: bold;
}

.friend-level {
  color: rgba(255, 255, 255, 0.4);
  font-size: 12px;
}

.friend-last-active {
  color: rgba(255, 255, 255, 0.3);
  font-size: 11px;
}

.friend-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  padding: 6px 12px;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
}

.action-btn.challenge {
  background: linear-gradient(135deg, #ff6b35, #ff4757);
  color: #fff;
}

.add-friend-btn {
  width: 100%;
  padding: 12px;
  border: 1px dashed rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  background: transparent;
  color: rgba(255, 255, 255, 0.5);
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.add-friend-btn:hover {
  border-color: #ffd700;
  color: #ffd700;
}

/* Leaderboard */
.my-rank-card {
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.1), rgba(255, 140, 0, 0.08));
  border: 1px solid rgba(255, 215, 0, 0.2);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
  text-align: center;
}

.my-rank-label {
  color: rgba(255, 255, 255, 0.5);
  font-size: 12px;
  margin-bottom: 4px;
}

.my-rank-info {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.my-rank-pos {
  color: #ffd700;
  font-size: 20px;
  font-weight: bold;
}

.my-rank-score {
  color: rgba(255, 255, 255, 0.5);
  font-size: 13px;
}

.leaderboard-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.leaderboard-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
}

.leaderboard-item.top3 {
  background: rgba(255, 215, 0, 0.05);
  border: 1px solid rgba(255, 215, 0, 0.1);
}

.rank-pos {
  width: 32px;
  text-align: center;
}

.medal {
  font-size: 20px;
}

.rank-num {
  color: rgba(255, 255, 255, 0.5);
  font-size: 14px;
}

.entry-avatar {
  font-size: 28px;
}

.entry-info {
  flex: 1;
}

.entry-name {
  color: #fff;
  font-size: 14px;
  font-weight: bold;
}

.entry-meta {
  display: flex;
  gap: 8px;
  margin-top: 2px;
}

.entry-rank {
  font-size: 12px;
  font-weight: bold;
}

.entry-matches {
  color: rgba(255, 255, 255, 0.4);
  font-size: 11px;
}

.entry-score {
  color: #ffd700;
  font-size: 16px;
  font-weight: bold;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
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
  max-width: 360px;
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.modal-header h2 {
  color: #fff;
  font-size: 16px;
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.5);
  font-size: 24px;
  cursor: pointer;
}

.modal-body {
  padding: 20px;
}

.friend-input {
  width: 100%;
  padding: 10px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  color: #fff;
  font-size: 14px;
  box-sizing: border-box;
  margin-bottom: 12px;
}

.friend-input:focus {
  outline: none;
  border-color: #ffd700;
}

.submit-btn {
  width: 100%;
  padding: 10px;
  border: none;
  border-radius: 8px;
  background: linear-gradient(135deg, #ffd700, #ff8c00);
  color: #1a1a2e;
  font-size: 14px;
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

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/userStore'
import { AVATARS, NICKNAMES } from '@/types/user'

const router = useRouter()
const userStore = useUserStore()

const selectedAvatar = ref('')
const selectedNickname = ref('')

function selectNickname(name: string) {
  selectedNickname.value = name
}

function selectAvatar(avatar: string) {
  selectedAvatar.value = avatar
}

function handleLogin() {
  if (!selectedNickname.value || !selectedAvatar.value) return
  userStore.login(selectedNickname.value, selectedAvatar.value)
  router.push('/')
}
</script>

<template>
  <div class="login-page">
    <div class="login-card">
      <h1 class="title">数学竞技场</h1>
      <p class="subtitle">七年级 · Math Arena</p>

      <div class="section">
        <h2>选择你的昵称</h2>
        <div class="nickname-grid">
          <button
            v-for="name in NICKNAMES"
            :key="name"
            :class="['nickname-btn', { active: selectedNickname === name }]"
            @click="selectNickname(name)"
          >
            {{ name }}
          </button>
        </div>
      </div>

      <div class="section">
        <h2>选择你的头像</h2>
        <div class="avatar-grid">
          <button
            v-for="avatar in AVATARS"
            :key="avatar"
            :class="['avatar-btn', { active: selectedAvatar === avatar }]"
            @click="selectAvatar(avatar)"
          >
            {{ avatar }}
          </button>
        </div>
      </div>

      <button
        class="login-btn"
        :disabled="!selectedNickname || !selectedAvatar"
        @click="handleLogin"
      >
        进入竞技场
      </button>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  padding: 20px;
}

.login-card {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 32px;
  max-width: 500px;
  width: 100%;
}

.title {
  font-size: 36px;
  color: #ffd700;
  text-align: center;
  margin: 0;
}

.subtitle {
  text-align: center;
  color: rgba(255, 255, 255, 0.5);
  margin: 4px 0 24px;
  font-size: 14px;
}

.section {
  margin-bottom: 24px;
}

.section h2 {
  color: #fff;
  font-size: 16px;
  margin-bottom: 12px;
}

.nickname-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.nickname-btn {
  padding: 8px 16px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 20px;
  background: transparent;
  color: #fff;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.nickname-btn:hover {
  border-color: #ffd700;
  color: #ffd700;
}

.nickname-btn.active {
  background: #ffd700;
  color: #1a1a2e;
  border-color: #ffd700;
  font-weight: bold;
}

.avatar-grid {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 8px;
}

.avatar-btn {
  width: 48px;
  height: 48px;
  border: 2px solid transparent;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.05);
  font-size: 24px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-btn:hover {
  border-color: rgba(255, 255, 255, 0.3);
  transform: scale(1.1);
}

.avatar-btn.active {
  border-color: #ffd700;
  background: rgba(255, 215, 0, 0.1);
  transform: scale(1.1);
}

.login-btn {
  width: 100%;
  padding: 14px;
  border: none;
  border-radius: 12px;
  background: linear-gradient(135deg, #ffd700, #ff8c00);
  color: #1a1a2e;
  font-size: 18px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
}

.login-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(255, 215, 0, 0.4);
}

.login-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>

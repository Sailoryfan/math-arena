import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { UserProfile } from '@/types/user'
import { getStorage, setStorage, generateId } from '@/utils/storage'

const STORAGE_KEY = 'user-profile'

function createDefaultProfile(): UserProfile {
  return {
    id: generateId(),
    nickname: '',
    avatar: '',
    createdAt: new Date().toISOString(),
    gameProfile: {
      level: 1,
      exp: 0,
      gold: 0,
      rankTier: '',
      rankDivision: 0,
      rankStars: 0,
    },
    diagnosticProfile: {
      lastFullTestDate: null,
      abilityScores: {},
      weakPoints: [],
      strongPoints: [],
    },
    stats: {
      totalAnswered: 0,
      totalCorrect: 0,
      totalPlayTime: 0,
      maxCombo: 0,
      lastLoginDate: '',
      loginStreak: 0,
    },
  }
}

export const useUserStore = defineStore('user', () => {
  const profile = ref<UserProfile>(getStorage(STORAGE_KEY, createDefaultProfile()))

  const isLoggedIn = computed(() => !!profile.value.nickname)
  const hasDiagnostic = computed(() => !!profile.value.diagnosticProfile.lastFullTestDate)

  function save() {
    setStorage(STORAGE_KEY, profile.value)
  }

  function login(nickname: string, avatar: string) {
    profile.value.nickname = nickname
    profile.value.avatar = avatar
    profile.value.stats.lastLoginDate = new Date().toISOString().slice(0, 10)
    save()
  }

  function updateDiagnostic(abilityScores: Record<string, number>, weakPoints: string[], strongPoints: string[], rankTier: string) {
    profile.value.diagnosticProfile.lastFullTestDate = new Date().toISOString()
    profile.value.diagnosticProfile.abilityScores = abilityScores
    profile.value.diagnosticProfile.weakPoints = weakPoints
    profile.value.diagnosticProfile.strongPoints = strongPoints
    profile.value.gameProfile.rankTier = rankTier
    save()
  }

  function addExp(amount: number) {
    profile.value.gameProfile.exp += amount
    while (profile.value.gameProfile.exp >= profile.value.gameProfile.level * 100) {
      profile.value.gameProfile.exp -= profile.value.gameProfile.level * 100
      profile.value.gameProfile.level++
    }
    save()
  }

  function addGold(amount: number) {
    profile.value.gameProfile.gold += amount
    save()
  }

  function updateStats(correct: boolean) {
    profile.value.stats.totalAnswered++
    if (correct) profile.value.stats.totalCorrect++
    save()
  }

  function resetDiagnostic() {
    profile.value.diagnosticProfile = createDefaultProfile().diagnosticProfile
    profile.value.gameProfile.rankTier = ''
    save()
  }

  return {
    profile,
    isLoggedIn,
    hasDiagnostic,
    login,
    updateDiagnostic,
    addExp,
    addGold,
    updateStats,
    resetDiagnostic,
    save,
  }
})

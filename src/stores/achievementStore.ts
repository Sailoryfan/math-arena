import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getStorage, setStorage } from '@/utils/storage'

export interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  category: 'practice' | 'adventure' | 'pvp' | 'social' | 'special'
  condition: string
  reward: { type: 'gold' | 'exp' | 'title'; value: number | string }
  progress: number
  maxProgress: number
  unlocked: boolean
  unlockedAt?: string
}

const ACHIEVEMENTS: Achievement[] = [
  // Practice achievements
  { id: 'a1', name: '初出茅庐', description: '完成第一道题目', icon: '📝', category: 'practice', condition: 'answer_1', reward: { type: 'gold', value: 10 }, progress: 0, maxProgress: 1, unlocked: false },
  { id: 'a2', name: '百题斩', description: '累计答对100道题', icon: '💯', category: 'practice', condition: 'correct_100', reward: { type: 'gold', value: 100 }, progress: 0, maxProgress: 100, unlocked: false },
  { id: 'a3', name: '千题斩', description: '累计答对1000道题', icon: '🏆', category: 'practice', condition: 'correct_1000', reward: { type: 'gold', value: 500 }, progress: 0, maxProgress: 1000, unlocked: false },
  { id: 'a4', name: '完美答题', description: '连续答对10道题', icon: '✨', category: 'practice', condition: 'combo_10', reward: { type: 'gold', value: 50 }, progress: 0, maxProgress: 10, unlocked: false },
  { id: 'a5', name: '答题狂人', description: '一天内答对50道题', icon: '🔥', category: 'practice', condition: 'daily_50', reward: { type: 'exp', value: 100 }, progress: 0, maxProgress: 50, unlocked: false },

  // Adventure achievements
  { id: 'a6', name: '冒险新手', description: '完成第一个冒险关卡', icon: '🗡️', category: 'adventure', condition: 'adventure_1', reward: { type: 'gold', value: 20 }, progress: 0, maxProgress: 1, unlocked: false },
  { id: 'a7', name: '章节征服者', description: '完成一个章节所有关卡', icon: '👑', category: 'adventure', condition: 'chapter_complete', reward: { type: 'gold', value: 200 }, progress: 0, maxProgress: 1, unlocked: false },
  { id: 'a8', name: '三星达人', description: '获得10个三星评价', icon: '⭐', category: 'adventure', condition: 'three_stars_10', reward: { type: 'gold', value: 150 }, progress: 0, maxProgress: 10, unlocked: false },
  { id: 'a9', name: 'BOSS猎手', description: '击败5个BOSS', icon: '👹', category: 'adventure', condition: 'boss_5', reward: { type: 'gold', value: 300 }, progress: 0, maxProgress: 5, unlocked: false },

  // PvP achievements
  { id: 'a10', name: '对战新手', description: '完成第一场排位赛', icon: '⚔️', category: 'pvp', condition: 'pvp_1', reward: { type: 'gold', value: 30 }, progress: 0, maxProgress: 1, unlocked: false },
  { id: 'a11', name: '十连胜', description: '获得10场连胜', icon: '🔥', category: 'pvp', condition: 'streak_10', reward: { type: 'gold', value: 200 }, progress: 0, maxProgress: 10, unlocked: false },
  { id: 'a12', name: '黄金之路', description: '达到黄金段位', icon: '🥇', category: 'pvp', condition: 'rank_gold', reward: { type: 'gold', value: 500 }, progress: 0, maxProgress: 1, unlocked: false },
  { id: 'a13', name: '百战老兵', description: '完成100场排位赛', icon: '🎖️', category: 'pvp', condition: 'pvp_100', reward: { type: 'gold', value: 300 }, progress: 0, maxProgress: 100, unlocked: false },

  // Social achievements
  { id: 'a14', name: '社交达人', description: '添加5个好友', icon: '👥', category: 'social', condition: 'friends_5', reward: { type: 'gold', value: 50 }, progress: 0, maxProgress: 5, unlocked: false },
  { id: 'a15', name: '好友满天下', description: '添加20个好友', icon: '🌍', category: 'social', condition: 'friends_20', reward: { type: 'gold', value: 200 }, progress: 0, maxProgress: 20, unlocked: false },

  // Special achievements
  { id: 'a16', name: '早起鸟', description: '在早上6点前答题', icon: '🐦', category: 'special', condition: 'early_bird', reward: { type: 'gold', value: 30 }, progress: 0, maxProgress: 1, unlocked: false },
  { id: 'a17', name: '夜猫子', description: '在凌晨12点后答题', icon: '🦉', category: 'special', condition: 'night_owl', reward: { type: 'gold', value: 30 }, progress: 0, maxProgress: 1, unlocked: false },
  { id: 'a18', name: '数学之王', description: '解锁所有其他成就', icon: '👑', category: 'special', condition: 'all_achievements', reward: { type: 'title', value: '数学之王' }, progress: 0, maxProgress: 17, unlocked: false },
  { id: 'a19', name: '地牢探险家', description: '到达地牢第10层', icon: '🏰', category: 'special', condition: 'dungeon_10', reward: { type: 'gold', value: 200 }, progress: 0, maxProgress: 10, unlocked: false },
  { id: 'a20', name: '节奏大师', description: '在节奏模式获得S评价', icon: '🎵', category: 'special', condition: 'rhythm_s', reward: { type: 'gold', value: 150 }, progress: 0, maxProgress: 1, unlocked: false },
]

export const useAchievementStore = defineStore('achievement', () => {
  const achievements = ref<Achievement[]>(getStorage('achievements', ACHIEVEMENTS))
  const showUnlockPopup = ref(false)
  const unlockedAchievement = ref<Achievement | null>(null)

  const unlockedCount = computed(() => achievements.value.filter(a => a.unlocked).length)
  const totalCount = computed(() => achievements.value.length)
  const completionRate = computed(() => Math.round((unlockedCount.value / totalCount.value) * 100))

  function checkAchievement(condition: string, value?: number) {
    const achievement = achievements.value.find(a => a.condition === condition && !a.unlocked)
    if (!achievement) return

    if (value !== undefined) {
      achievement.progress = Math.min(value, achievement.maxProgress)
    } else {
      achievement.progress = achievement.maxProgress
    }

    if (achievement.progress >= achievement.maxProgress) {
      unlockAchievement(achievement)
    }

    setStorage('achievements', achievements.value)
  }

  function incrementAchievement(condition: string, amount = 1) {
    const achievement = achievements.value.find(a => a.condition === condition && !a.unlocked)
    if (!achievement) return

    achievement.progress = Math.min(achievement.progress + amount, achievement.maxProgress)

    if (achievement.progress >= achievement.maxProgress) {
      unlockAchievement(achievement)
    }

    setStorage('achievements', achievements.value)
  }

  function unlockAchievement(achievement: Achievement) {
    achievement.unlocked = true
    achievement.unlockedAt = new Date().toISOString()
    unlockedAchievement.value = achievement
    showUnlockPopup.value = true

    // Auto hide popup after 3 seconds
    setTimeout(() => {
      showUnlockPopup.value = false
      unlockedAchievement.value = null
    }, 3000)
  }

  function getAchievementsByCategory(category: string) {
    return achievements.value.filter(a => a.category === category)
  }

  function resetAchievements() {
    achievements.value = [...ACHIEVEMENTS]
    setStorage('achievements', achievements.value)
  }

  return {
    achievements,
    showUnlockPopup,
    unlockedAchievement,
    unlockedCount,
    totalCount,
    completionRate,
    checkAchievement,
    incrementAchievement,
    getAchievementsByCategory,
    resetAchievements,
  }
})

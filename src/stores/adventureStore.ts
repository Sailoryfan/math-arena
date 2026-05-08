import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getStorage, setStorage } from '@/utils/storage'

export interface LevelConfig {
  id: string
  chapterId: number
  name: string
  description: string
  knowledgePointId: string
  difficulty: number
  starConditions: { time: number; accuracy: number; combo: number }
  reward: { exp: number; gold: number }
  isBoss: boolean
  monsterCount: number
  monsterHP: number
  monsterAtk: number
}

export interface LevelProgress {
  levelId: string
  unlocked: boolean
  completed: boolean
  stars: number
  bestTime: number
  bestAccuracy: number
  bestCombo: number
  clearCount: number
}

interface AdventureState {
  chapterProgress: Record<number, { unlocked: boolean; completed: boolean }>
  levelProgress: Record<string, LevelProgress>
}

const STORAGE_KEY = 'adventure-progress'

// Level definitions
const LEVELS: LevelConfig[] = [
  // Chapter 2: 有理数之原
  { id: 'ch2_l1', chapterId: 2, name: '正负数之门', description: '掌握正负数概念，打开冒险之路', knowledgePointId: 'c2_1_1', difficulty: 1, starConditions: { time: 60, accuracy: 100, combo: 3 }, reward: { exp: 30, gold: 15 }, isBoss: false, monsterCount: 3, monsterHP: 30, monsterAtk: 5 },
  { id: 'ch2_l2', chapterId: 2, name: '分类迷宫', description: '学会有理数分类，走出迷宫', knowledgePointId: 'c2_2_1', difficulty: 1, starConditions: { time: 60, accuracy: 100, combo: 3 }, reward: { exp: 30, gold: 15 }, isBoss: false, monsterCount: 3, monsterHP: 35, monsterAtk: 5 },
  { id: 'ch2_l3', chapterId: 2, name: '数轴走廊', description: '理解数轴，通过走廊', knowledgePointId: 'c2_3_1', difficulty: 2, starConditions: { time: 90, accuracy: 80, combo: 4 }, reward: { exp: 40, gold: 20 }, isBoss: false, monsterCount: 4, monsterHP: 40, monsterAtk: 8 },
  { id: 'ch2_l4', chapterId: 2, name: '绝对值之塔', description: '攀登绝对值之塔', knowledgePointId: 'c2_4_1', difficulty: 2, starConditions: { time: 90, accuracy: 80, combo: 4 }, reward: { exp: 40, gold: 20 }, isBoss: false, monsterCount: 4, monsterHP: 45, monsterAtk: 8 },
  { id: 'ch2_l5', chapterId: 2, name: '加减法战场', description: '有理数加减法战斗', knowledgePointId: 'c2_5_1', difficulty: 2, starConditions: { time: 120, accuracy: 80, combo: 5 }, reward: { exp: 50, gold: 25 }, isBoss: false, monsterCount: 5, monsterHP: 50, monsterAtk: 10 },
  { id: 'ch2_l6', chapterId: 2, name: '乘除法密林', description: '穿越乘除法密林', knowledgePointId: 'c2_6_1', difficulty: 3, starConditions: { time: 120, accuracy: 80, combo: 5 }, reward: { exp: 50, gold: 25 }, isBoss: false, monsterCount: 5, monsterHP: 55, monsterAtk: 12 },
  { id: 'ch2_l7', chapterId: 2, name: '乘方高地', description: '征服乘方高地', knowledgePointId: 'c2_7_1', difficulty: 3, starConditions: { time: 120, accuracy: 80, combo: 5 }, reward: { exp: 50, gold: 25 }, isBoss: false, monsterCount: 5, monsterHP: 60, monsterAtk: 12 },
  { id: 'ch2_l8', chapterId: 2, name: '混合运算深渊', description: '挑战混合运算深渊', knowledgePointId: 'c2_8_1', difficulty: 3, starConditions: { time: 150, accuracy: 80, combo: 6 }, reward: { exp: 60, gold: 30 }, isBoss: false, monsterCount: 6, monsterHP: 65, monsterAtk: 15 },
  { id: 'ch2_boss', chapterId: 2, name: '有理数之王', description: 'BOSS战：击败有理数之王', knowledgePointId: 'c2_8_1', difficulty: 4, starConditions: { time: 180, accuracy: 80, combo: 8 }, reward: { exp: 100, gold: 50 }, isBoss: true, monsterCount: 1, monsterHP: 200, monsterAtk: 20 },
  // Chapter 4: 方程要塞
  { id: 'ch4_l1', chapterId: 4, name: '方程概念大厅', description: '理解方程概念', knowledgePointId: 'c4_1_1', difficulty: 1, starConditions: { time: 60, accuracy: 100, combo: 3 }, reward: { exp: 30, gold: 15 }, isBoss: false, monsterCount: 3, monsterHP: 30, monsterAtk: 5 },
  { id: 'ch4_l2', chapterId: 4, name: '简单方程通道', description: '掌握简单方程解法', knowledgePointId: 'c4_2_1', difficulty: 1, starConditions: { time: 60, accuracy: 100, combo: 3 }, reward: { exp: 30, gold: 15 }, isBoss: false, monsterCount: 3, monsterHP: 35, monsterAtk: 5 },
  { id: 'ch4_l3', chapterId: 4, name: '移项之桥', description: '通过移项之桥', knowledgePointId: 'c4_3_1', difficulty: 2, starConditions: { time: 90, accuracy: 80, combo: 4 }, reward: { exp: 40, gold: 20 }, isBoss: false, monsterCount: 4, monsterHP: 40, monsterAtk: 8 },
  { id: 'ch4_l4', chapterId: 4, name: '去括号关隘', description: '攻破去括号关隘', knowledgePointId: 'c4_4_1', difficulty: 2, starConditions: { time: 90, accuracy: 80, combo: 4 }, reward: { exp: 40, gold: 20 }, isBoss: false, monsterCount: 4, monsterHP: 45, monsterAtk: 8 },
  { id: 'ch4_l5', chapterId: 4, name: '去分母险境', description: '穿越去分母险境', knowledgePointId: 'c4_5_1', difficulty: 3, starConditions: { time: 120, accuracy: 80, combo: 5 }, reward: { exp: 50, gold: 25 }, isBoss: false, monsterCount: 5, monsterHP: 50, monsterAtk: 10 },
  { id: 'ch4_l6', chapterId: 4, name: '应用题工坊', description: '解决和差倍分问题', knowledgePointId: 'c4_6_1', difficulty: 3, starConditions: { time: 120, accuracy: 80, combo: 5 }, reward: { exp: 50, gold: 25 }, isBoss: false, monsterCount: 5, monsterHP: 55, monsterAtk: 12 },
  { id: 'ch4_l7', chapterId: 4, name: '行程问题赛道', description: '在赛道上解行程问题', knowledgePointId: 'c4_7_1', difficulty: 3, starConditions: { time: 120, accuracy: 80, combo: 5 }, reward: { exp: 50, gold: 25 }, isBoss: false, monsterCount: 5, monsterHP: 60, monsterAtk: 12 },
  { id: 'ch4_l8', chapterId: 4, name: '综合应用试炼', description: '综合应用大试炼', knowledgePointId: 'c4_8_1', difficulty: 4, starConditions: { time: 150, accuracy: 80, combo: 6 }, reward: { exp: 60, gold: 30 }, isBoss: false, monsterCount: 6, monsterHP: 65, monsterAtk: 15 },
  { id: 'ch4_boss', chapterId: 4, name: '方程魔王', description: 'BOSS战：击败方程魔王', knowledgePointId: 'c4_8_1', difficulty: 5, starConditions: { time: 180, accuracy: 80, combo: 8 }, reward: { exp: 100, gold: 50 }, isBoss: true, monsterCount: 1, monsterHP: 250, monsterAtk: 25 },
]

const CHAPTER_NAMES: Record<number, string> = {
  2: '有理数之原',
  4: '方程要塞',
}

function createDefaultState(): AdventureState {
  const state: AdventureState = {
    chapterProgress: {},
    levelProgress: {},
  }

  for (const level of LEVELS) {
    const isFirst = level.id === 'ch2_l1'
    state.levelProgress[level.id] = {
      levelId: level.id,
      unlocked: isFirst,
      completed: false,
      stars: 0,
      bestTime: 0,
      bestAccuracy: 0,
      bestCombo: 0,
      clearCount: 0,
    }
  }

  state.chapterProgress[2] = { unlocked: true, completed: false }
  state.chapterProgress[4] = { unlocked: false, completed: false }

  return state
}

export const useAdventureStore = defineStore('adventure', () => {
  const state = ref<AdventureState>(getStorage(STORAGE_KEY, createDefaultState()))

  function getLevels(chapterId: number): LevelConfig[] {
    return LEVELS.filter(l => l.chapterId === chapterId)
  }

  function getLevelConfig(levelId: string): LevelConfig | undefined {
    return LEVELS.find(l => l.id === levelId)
  }

  function getLevelProgress(levelId: string): LevelProgress {
    return state.value.levelProgress[levelId] || {
      levelId, unlocked: false, completed: false, stars: 0,
      bestTime: 0, bestAccuracy: 0, bestCombo: 0, clearCount: 0,
    }
  }

  function isLevelUnlocked(levelId: string): boolean {
    return state.value.levelProgress[levelId]?.unlocked || false
  }

  function completeLevel(levelId: string, time: number, accuracy: number, combo: number) {
    const progress = state.value.levelProgress[levelId]
    if (!progress) return

    const config = getLevelConfig(levelId)
    if (!config) return

    progress.completed = true
    progress.clearCount++

    // Calculate stars
    let stars = 1
    if (accuracy >= config.starConditions.accuracy) stars = 2
    if (accuracy >= config.starConditions.accuracy && combo >= config.starConditions.combo) stars = 3
    progress.stars = Math.max(progress.stars, stars)

    // Update bests
    if (progress.bestTime === 0 || time < progress.bestTime) progress.bestTime = time
    if (accuracy > progress.bestAccuracy) progress.bestAccuracy = accuracy
    if (combo > progress.bestCombo) progress.bestCombo = combo

    // Unlock next level
    const chapterLevels = LEVELS.filter(l => l.chapterId === config.chapterId)
    const currentIdx = chapterLevels.findIndex(l => l.id === levelId)
    if (currentIdx < chapterLevels.length - 1) {
      const nextId = chapterLevels[currentIdx + 1]?.id
      if (nextId && state.value.levelProgress[nextId]) {
        state.value.levelProgress[nextId]!.unlocked = true
      }
    }

    // If boss completed, unlock next chapter
    if (config.isBoss) {
      state.value.chapterProgress[config.chapterId]!.completed = true
      const nextChapterId = config.chapterId === 2 ? 4 : null
      if (nextChapterId && state.value.chapterProgress[nextChapterId]) {
        state.value.chapterProgress[nextChapterId].unlocked = true
      }
    }

    save()
  }

  function getChapterStars(chapterId: number): number {
    const levels = LEVELS.filter(l => l.chapterId === chapterId)
    return levels.reduce((sum, l) => sum + (state.value.levelProgress[l.id]?.stars || 0), 0)
  }

  function getChapterProgress(chapterId: number): { completed: number; total: number } {
    const levels = LEVELS.filter(l => l.chapterId === chapterId)
    const completed = levels.filter(l => state.value.levelProgress[l.id]?.completed).length
    return { completed, total: levels.length }
  }

  function save() {
    setStorage(STORAGE_KEY, state.value)
  }

  function reset() {
    state.value = createDefaultState()
    save()
  }

  return {
    state,
    getLevels,
    getLevelConfig,
    getLevelProgress,
    isLevelUnlocked,
    completeLevel,
    getChapterStars,
    getChapterProgress,
    save,
    reset,
    CHAPTER_NAMES,
    LEVELS,
  }
})

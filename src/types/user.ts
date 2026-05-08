export interface UserProfile {
  id: string
  nickname: string
  avatar: string
  createdAt: string

  gameProfile: {
    level: number
    exp: number
    gold: number
    rankTier: string
    rankDivision: number
    rankStars: number
  }

  diagnosticProfile: {
    lastFullTestDate: string | null
    abilityScores: Record<string, number>
    weakPoints: string[]
    strongPoints: string[]
  }

  stats: {
    totalAnswered: number
    totalCorrect: number
    totalPlayTime: number
    maxCombo: number
    lastLoginDate: string
    loginStreak: number
  }
}

export interface DailyTask {
  id: string
  type: 'knowledge_video' | 'practice' | 'game_level' | 'review' | 'test'
  title: string
  description: string
  chapterId: number
  knowledgePointId: string | null
  targetCount: number
  completedCount: number
  status: 'pending' | 'in_progress' | 'completed'
  reward: { exp: number; gold: number }
}

export const AVATARS = [
  '🧑‍🎓', '👨‍🎓', '👩‍🎓', '🧑‍💻', '🧙‍♂️', '🦸‍♂️', '🦸‍♀️', '🧑‍🚀',
  '👨‍🔬', '👩‍🔬', '🧑‍🎨', '👨‍🏫', '👩‍🏫', '🧑‍⚕️', '🦊', '🐱',
]

export const NICKNAMES = [
  '数学小达人', '计算高手', '几何探索者', '代数勇士', '逻辑大师',
  '解题能手', '学霸小明', '数学小天才', '方程解密者', '图形大师',
  '运算快手', '推理高手', '数轴旅行者', '公式记忆王', '应用题克星',
]

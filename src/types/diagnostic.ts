export interface DiagnosticAnswer {
  questionId: string
  userAnswer: string
  correct: boolean
  responseTime: number
  knowledgePointId: string
  difficulty: number
}

export interface DiagnosticResult {
  id: string
  userId: string
  date: string
  answers: DiagnosticAnswer[]
  result: {
    overallScore: number
    rankEstimate: string
    abilityScores: Record<string, number>
    weakPoints: string[]
    strongPoints: string[]
  }
}

export interface RankConfig {
  tier: string
  minScore: number
  maxScore: number
  icon: string
  color: string
}

export const RANK_TIERS: RankConfig[] = [
  { tier: '青铜', minScore: 0, maxScore: 40, icon: '🥉', color: '#CD7F32' },
  { tier: '白银', minScore: 40, maxScore: 55, icon: '🥈', color: '#C0C0C0' },
  { tier: '黄金', minScore: 55, maxScore: 70, icon: '🥇', color: '#FFD700' },
  { tier: '铂金', minScore: 70, maxScore: 85, icon: '💎', color: '#00CED1' },
  { tier: '钻石', minScore: 85, maxScore: 100, icon: '💠', color: '#B9F2FF' },
]

export const ABILITY_DIMENSIONS = [
  { key: 'rational', label: '有理数运算' },
  { key: 'algebraic', label: '代数式' },
  { key: 'equation', label: '方程' },
  { key: 'geometry', label: '图形' },
  { key: 'angle', label: '角度' },
  { key: 'application', label: '综合应用' },
]

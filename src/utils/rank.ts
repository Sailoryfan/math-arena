import { RANK_TIERS, ABILITY_DIMENSIONS, type RankConfig } from '@/types/diagnostic'

export function calculateRank(accuracy: number, avgDifficulty: number): RankConfig {
  const score = accuracy * 0.7 + (avgDifficulty / 5) * 30
  for (let i = RANK_TIERS.length - 1; i >= 0; i--) {
    if (score >= RANK_TIERS[i]!.minScore) {
      return RANK_TIERS[i]!
    }
  }
  return RANK_TIERS[0]!
}

export function calculateAbilityScores(
  answers: { knowledgePointId: string; correct: boolean; difficulty: number }[]
): Record<string, number> {
  const grouped: Record<string, { correct: number; total: number; diffSum: number }> = {}

  for (const a of answers) {
    if (!grouped[a.knowledgePointId]) {
      grouped[a.knowledgePointId] = { correct: 0, total: 0, diffSum: 0 }
    }
    grouped[a.knowledgePointId]!.total++
    if (a.correct) grouped[a.knowledgePointId]!.correct++
    grouped[a.knowledgePointId]!.diffSum += a.difficulty
  }

  const scores: Record<string, number> = {}
  for (const [key, val] of Object.entries(grouped)) {
    const accuracy = val.correct / val.total
    const avgDiff = val.diffSum / val.total
    scores[key] = Math.round(accuracy * 60 + (avgDiff / 5) * 40)
  }

  return scores
}

function getLabel(key: string): string {
  const dim = ABILITY_DIMENSIONS.find(d => d.key === key)
  return dim?.label || key
}

export function findWeakPoints(scores: Record<string, number>, count = 3): string[] {
  return Object.entries(scores)
    .sort(([, a], [, b]) => a - b)
    .slice(0, count)
    .map(([key]) => getLabel(key))
}

export function findStrongPoints(scores: Record<string, number>, count = 3): string[] {
  return Object.entries(scores)
    .sort(([, a], [, b]) => b - a)
    .slice(0, count)
    .map(([key]) => getLabel(key))
}

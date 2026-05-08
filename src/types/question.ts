export interface Question {
  id: string
  chapterId: number
  sectionId: number
  knowledgePoint: string
  knowledgePointId: string
  difficulty: number // 1-5
  type: 'choice' | 'fill_blank' | 'true_false'
  stem: string
  options: string[] | null
  answer: string
  solution: string
  hints: string[]
  timeLimit: number // seconds
  tags: string[]
}

export interface KnowledgePoint {
  id: string
  chapterId: number
  sectionId: number
  name: string
  description: string
  difficulty: number
  prerequisites: string[]
  keyFormulas: string[]
  commonMistakes: string[]
}

export interface Chapter {
  id: number
  name: string
  description: string
  knowledgePoints: KnowledgePoint[]
}

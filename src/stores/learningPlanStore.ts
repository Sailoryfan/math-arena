import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { DailyTask } from '@/types/user'
import { getStorage, setStorage, generateId } from '@/utils/storage'
import { useUserStore } from './userStore'

interface DayPlan {
  date: string
  tasks: DailyTask[]
  completed: boolean
}

interface LearningPlan {
  id: string
  createdAt: string
  days: DayPlan[]
  currentDay: number
}

const STORAGE_KEY = 'learning-plan'

export const useLearningPlanStore = defineStore('learningPlan', () => {
  const plan = ref<LearningPlan | null>(getStorage(STORAGE_KEY, null))

  const todayPlan = computed(() => {
    if (!plan.value) return null
    const today = new Date().toISOString().slice(0, 10)
    return plan.value.days.find(d => d.date === today) || null
  })

  const todayTasks = computed(() => todayPlan.value?.tasks || [])

  const todayProgress = computed(() => {
    const tasks = todayTasks.value
    if (tasks.length === 0) return 0
    const completed = tasks.filter(t => t.status === 'completed').length
    return Math.round((completed / tasks.length) * 100)
  })

  const allTasksCompleted = computed(() => {
    const tasks = todayTasks.value
    return tasks.length > 0 && tasks.every(t => t.status === 'completed')
  })

  function generatePlan() {
    const userStore = useUserStore()
    const weakPoints = userStore.profile.diagnosticProfile.weakPoints
    const abilityScores = userStore.profile.diagnosticProfile.abilityScores

    // Knowledge point definitions with tasks
    const knowledgeTasks = getKnowledgeTaskTemplates()

    // Sort knowledge points by ability score (lowest first)
    const sortedKPs = Object.entries(abilityScores)
      .sort(([, a], [, b]) => a - b)
      .map(([id]) => id)

    // Generate 7 days of plans
    const days: DayPlan[] = []
    const today = new Date()

    // Day 1-2: Focus on weakest 3 knowledge points (learn + practice)
    // Day 3-4: Next 3 weakest (learn + practice) + review day 1-2
    // Day 5-6: Practice all weak points + mixed review
    // Day 7: Comprehensive review + assessment

    for (let i = 0; i < 7; i++) {
      const date = new Date(today)
      date.setDate(date.getDate() + i)
      const dateStr = date.toISOString().slice(0, 10)

      const tasks: DailyTask[] = []

      if (i < 2) {
        // Days 1-2: Learn weakest points
        const targetKPs = sortedKPs.slice(0, 3)
        for (const kpId of targetKPs) {
          const template = knowledgeTasks[kpId]
          if (template) {
            tasks.push(createTask(template.learn, kpId, dateStr))
            tasks.push(createTask(template.practice, kpId, dateStr))
          }
        }
      } else if (i < 4) {
        // Days 3-4: Next set + review
        const targetKPs = sortedKPs.slice(3, 6)
        for (const kpId of targetKPs) {
          const template = knowledgeTasks[kpId]
          if (template) {
            tasks.push(createTask(template.learn, kpId, dateStr))
            tasks.push(createTask(template.practice, kpId, dateStr))
          }
        }
        // Add review task
        const reviewKPs = sortedKPs.slice(0, 3)
        tasks.push({
          id: generateId(),
          type: 'review',
          title: '复习巩固',
          description: `复习${reviewKPs.length}个已学知识点`,
          chapterId: 0,
          knowledgePointId: reviewKPs.join(','),
          targetCount: reviewKPs.length * 3,
          completedCount: 0,
          status: 'pending',
          reward: { exp: 30, gold: 15 },
        })
      } else if (i < 6) {
        // Days 5-6: Practice all weak points
        const allWeakKPs = sortedKPs.slice(0, 6)
        tasks.push({
          id: generateId(),
          type: 'practice',
          title: '薄弱点强化',
          description: '针对所有薄弱知识点进行强化练习',
          chapterId: 0,
          knowledgePointId: allWeakKPs.join(','),
          targetCount: 15,
          completedCount: 0,
          status: 'pending',
          reward: { exp: 50, gold: 25 },
        })
        // Mixed review
        tasks.push({
          id: generateId(),
          type: 'review',
          title: '综合复习',
          description: '混合练习已学知识点',
          chapterId: 0,
          knowledgePointId: allWeakKPs.join(','),
          targetCount: 10,
          completedCount: 0,
          status: 'pending',
          reward: { exp: 30, gold: 15 },
        })
      } else {
        // Day 7: Assessment
        tasks.push({
          id: generateId(),
          type: 'test',
          title: '阶段测试',
          description: '完成20道综合测试题，检验学习成果',
          chapterId: 0,
          knowledgePointId: sortedKPs.join(','),
          targetCount: 20,
          completedCount: 0,
          status: 'pending',
          reward: { exp: 100, gold: 50 },
        })
      }

      // Add daily bonus task
      tasks.push({
        id: generateId(),
        type: 'practice',
        title: '每日速算',
        description: '完成5道计算题，保持手感',
        chapterId: 2,
        knowledgePointId: 'c2_8_1',
        targetCount: 5,
        completedCount: 0,
        status: 'pending',
        reward: { exp: 20, gold: 10 },
      })

      days.push({ date: dateStr, tasks, completed: false })
    }

    plan.value = {
      id: generateId(),
      createdAt: new Date().toISOString(),
      days,
      currentDay: 0,
    }

    setStorage(STORAGE_KEY, plan.value)
  }

  function createTask(template: Omit<DailyTask, 'id' | 'completedCount' | 'status'>, kpId: string, date: string): DailyTask {
    return {
      ...template,
      id: generateId(),
      knowledgePointId: kpId,
      completedCount: 0,
      status: 'pending',
    }
  }

  function updateTaskProgress(taskId: string, increment: number) {
    if (!plan.value) return

    for (const day of plan.value.days) {
      const task = day.tasks.find(t => t.id === taskId)
      if (task) {
        task.completedCount = Math.min(task.completedCount + increment, task.targetCount)
        if (task.completedCount >= task.targetCount) {
          task.status = 'completed'
        } else if (task.completedCount > 0) {
          task.status = 'in_progress'
        }
        break
      }
    }

    // Check if today is complete
    if (todayPlan.value) {
      todayPlan.value.completed = todayPlan.value.tasks.every(t => t.status === 'completed')
    }

    setStorage(STORAGE_KEY, plan.value)
  }

  function completeTask(taskId: string) {
    if (!plan.value) return

    for (const day of plan.value.days) {
      const task = day.tasks.find(t => t.id === taskId)
      if (task) {
        task.status = 'completed'
        task.completedCount = task.targetCount
        break
      }
    }

    setStorage(STORAGE_KEY, plan.value)
  }

  function hasPlan(): boolean {
    return plan.value !== null
  }

  function resetPlan() {
    plan.value = null
    setStorage(STORAGE_KEY, null)
  }

  return {
    plan,
    todayPlan,
    todayTasks,
    todayProgress,
    allTasksCompleted,
    generatePlan,
    updateTaskProgress,
    completeTask,
    hasPlan,
    resetPlan,
  }
})

// Knowledge point task templates
function getKnowledgeTaskTemplates(): Record<string, { learn: Omit<DailyTask, 'id' | 'completedCount' | 'status'>; practice: Omit<DailyTask, 'id' | 'completedCount' | 'status'> }> {
  return {
    'c2_1_1': {
      learn: { type: 'knowledge_video', title: '学习正负数概念', description: '理解正数、负数、零的概念', chapterId: 2, knowledgePointId: 'c2_1_1', targetCount: 1, reward: { exp: 20, gold: 10 } },
      practice: { type: 'practice', title: '正负数概念练习', description: '完成5道正负数概念题', chapterId: 2, knowledgePointId: 'c2_1_1', targetCount: 5, reward: { exp: 30, gold: 15 } },
    },
    'c2_2_1': {
      learn: { type: 'knowledge_video', title: '学习有理数分类', description: '掌握整数和分数的分类', chapterId: 2, knowledgePointId: 'c2_2_1', targetCount: 1, reward: { exp: 20, gold: 10 } },
      practice: { type: 'practice', title: '有理数分类练习', description: '完成5道有理数分类题', chapterId: 2, knowledgePointId: 'c2_2_1', targetCount: 5, reward: { exp: 30, gold: 15 } },
    },
    'c2_3_1': {
      learn: { type: 'knowledge_video', title: '学习数轴', description: '理解数轴的定义和三要素', chapterId: 2, knowledgePointId: 'c2_3_1', targetCount: 1, reward: { exp: 20, gold: 10 } },
      practice: { type: 'practice', title: '数轴练习', description: '完成5道数轴相关题', chapterId: 2, knowledgePointId: 'c2_3_1', targetCount: 5, reward: { exp: 30, gold: 15 } },
    },
    'c2_4_1': {
      learn: { type: 'knowledge_video', title: '学习绝对值与相反数', description: '掌握绝对值和相反数的概念', chapterId: 2, knowledgePointId: 'c2_4_1', targetCount: 1, reward: { exp: 20, gold: 10 } },
      practice: { type: 'practice', title: '绝对值练习', description: '完成5道绝对值相关题', chapterId: 2, knowledgePointId: 'c2_4_1', targetCount: 5, reward: { exp: 30, gold: 15 } },
    },
    'c2_5_1': {
      learn: { type: 'knowledge_video', title: '学习有理数加减法', description: '掌握有理数的加法和减法运算', chapterId: 2, knowledgePointId: 'c2_5_1', targetCount: 1, reward: { exp: 20, gold: 10 } },
      practice: { type: 'practice', title: '加减法练习', description: '完成5道有理数加减法题', chapterId: 2, knowledgePointId: 'c2_5_1', targetCount: 5, reward: { exp: 30, gold: 15 } },
    },
    'c2_6_1': {
      learn: { type: 'knowledge_video', title: '学习有理数乘除法', description: '掌握有理数的乘法和除法运算', chapterId: 2, knowledgePointId: 'c2_6_1', targetCount: 1, reward: { exp: 20, gold: 10 } },
      practice: { type: 'practice', title: '乘除法练习', description: '完成5道有理数乘除法题', chapterId: 2, knowledgePointId: 'c2_6_1', targetCount: 5, reward: { exp: 30, gold: 15 } },
    },
    'c2_7_1': {
      learn: { type: 'knowledge_video', title: '学习乘方', description: '理解乘方的意义和运算', chapterId: 2, knowledgePointId: 'c2_7_1', targetCount: 1, reward: { exp: 20, gold: 10 } },
      practice: { type: 'practice', title: '乘方练习', description: '完成5道乘方相关题', chapterId: 2, knowledgePointId: 'c2_7_1', targetCount: 5, reward: { exp: 30, gold: 15 } },
    },
    'c2_8_1': {
      learn: { type: 'knowledge_video', title: '学习混合运算', description: '掌握四则混合运算顺序', chapterId: 2, knowledgePointId: 'c2_8_1', targetCount: 1, reward: { exp: 20, gold: 10 } },
      practice: { type: 'practice', title: '混合运算练习', description: '完成5道混合运算题', chapterId: 2, knowledgePointId: 'c2_8_1', targetCount: 5, reward: { exp: 30, gold: 15 } },
    },
    'c4_1_1': {
      learn: { type: 'knowledge_video', title: '学习方程概念', description: '理解方程的定义和解的概念', chapterId: 4, knowledgePointId: 'c4_1_1', targetCount: 1, reward: { exp: 20, gold: 10 } },
      practice: { type: 'practice', title: '方程概念练习', description: '完成5道方程概念题', chapterId: 4, knowledgePointId: 'c4_1_1', targetCount: 5, reward: { exp: 30, gold: 15 } },
    },
    'c4_2_1': {
      learn: { type: 'knowledge_video', title: '学习简单方程', description: '掌握一步和两步方程的解法', chapterId: 4, knowledgePointId: 'c4_2_1', targetCount: 1, reward: { exp: 20, gold: 10 } },
      practice: { type: 'practice', title: '简单方程练习', description: '完成5道简单方程题', chapterId: 4, knowledgePointId: 'c4_2_1', targetCount: 5, reward: { exp: 30, gold: 15 } },
    },
    'c4_3_1': {
      learn: { type: 'knowledge_video', title: '学习移项解方程', description: '掌握通过移项解方程', chapterId: 4, knowledgePointId: 'c4_3_1', targetCount: 1, reward: { exp: 20, gold: 10 } },
      practice: { type: 'practice', title: '移项练习', description: '完成5道移项方程题', chapterId: 4, knowledgePointId: 'c4_3_1', targetCount: 5, reward: { exp: 30, gold: 15 } },
    },
    'c4_4_1': {
      learn: { type: 'knowledge_video', title: '学习去括号解方程', description: '掌握含括号的方程解法', chapterId: 4, knowledgePointId: 'c4_4_1', targetCount: 1, reward: { exp: 20, gold: 10 } },
      practice: { type: 'practice', title: '去括号练习', description: '完成5道去括号方程题', chapterId: 4, knowledgePointId: 'c4_4_1', targetCount: 5, reward: { exp: 30, gold: 15 } },
    },
    'c4_5_1': {
      learn: { type: 'knowledge_video', title: '学习去分母解方程', description: '掌握含分数的方程解法', chapterId: 4, knowledgePointId: 'c4_5_1', targetCount: 1, reward: { exp: 20, gold: 10 } },
      practice: { type: 'practice', title: '去分母练习', description: '完成5道去分母方程题', chapterId: 4, knowledgePointId: 'c4_5_1', targetCount: 5, reward: { exp: 30, gold: 15 } },
    },
    'c4_6_1': {
      learn: { type: 'knowledge_video', title: '学习和差倍分应用题', description: '掌握和差倍分问题的方程解法', chapterId: 4, knowledgePointId: 'c4_6_1', targetCount: 1, reward: { exp: 20, gold: 10 } },
      practice: { type: 'practice', title: '应用题练习', description: '完成5道和差倍分应用题', chapterId: 4, knowledgePointId: 'c4_6_1', targetCount: 5, reward: { exp: 30, gold: 15 } },
    },
    'c4_7_1': {
      learn: { type: 'knowledge_video', title: '学习行程问题', description: '掌握行程问题的方程解法', chapterId: 4, knowledgePointId: 'c4_7_1', targetCount: 1, reward: { exp: 20, gold: 10 } },
      practice: { type: 'practice', title: '行程问题练习', description: '完成5道行程问题', chapterId: 4, knowledgePointId: 'c4_7_1', targetCount: 5, reward: { exp: 30, gold: 15 } },
    },
    'c4_8_1': {
      learn: { type: 'knowledge_video', title: '学习综合应用', description: '掌握复杂方程和综合应用题', chapterId: 4, knowledgePointId: 'c4_8_1', targetCount: 1, reward: { exp: 20, gold: 10 } },
      practice: { type: 'practice', title: '综合应用练习', description: '完成5道综合应用题', chapterId: 4, knowledgePointId: 'c4_8_1', targetCount: 5, reward: { exp: 30, gold: 15 } },
    },
  }
}

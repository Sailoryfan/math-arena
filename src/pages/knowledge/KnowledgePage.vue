<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { renderLatex } from '@/utils/latex'

interface KnowledgePoint {
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

const router = useRouter()
const route = useRoute()

const kp = ref<KnowledgePoint | null>(null)
const loading = ref(true)

const exampleQuestions = computed(() => {
  if (!kp.value) return []
  // Will be loaded from questions.json
  return []
})

onMounted(async () => {
  const kpId = route.params.id as string
  await loadKnowledgePoint(kpId)
})

async function loadKnowledgePoint(id: string) {
  try {
    const res = await fetch('/data/knowledge-tree.json')
    const tree = await res.json()

    for (const chapter of tree) {
      for (const point of chapter.knowledgePoints) {
        if (point.id === id) {
          kp.value = point
          break
        }
      }
      if (kp.value) break
    }
  } catch (e) {
    console.error('Failed to load knowledge point:', e)
  } finally {
    loading.value = false
  }
}

function startPractice() {
  if (!kp.value) return
  router.push(`/practice?kpId=${kp.value.id}&count=5`)
}
</script>

<template>
  <div class="knowledge-page">
    <div class="header">
      <button class="back-btn" @click="router.back()">←</button>
      <h1>{{ kp?.name || '知识点' }}</h1>
    </div>

    <div v-if="loading" class="loading">加载中...</div>

    <div v-else-if="kp" class="content">
      <div class="section">
        <div class="section-title">概念说明</div>
        <div class="section-body">{{ kp.description }}</div>
      </div>

      <div class="section" v-if="kp.keyFormulas.length > 0">
        <div class="section-title">关键公式</div>
        <div class="formula-list">
          <div v-for="(formula, idx) in kp.keyFormulas" :key="idx" class="formula-item">
            <span class="formula-num">{{ idx + 1 }}</span>
            <span class="formula-text" v-html="renderLatex(formula)"></span>
          </div>
        </div>
      </div>

      <div class="section" v-if="kp.commonMistakes.length > 0">
        <div class="section-title">常见错误</div>
        <div class="mistake-list">
          <div v-for="(mistake, idx) in kp.commonMistakes" :key="idx" class="mistake-item">
            <span class="mistake-icon">⚠️</span>
            <span class="mistake-text">{{ mistake }}</span>
          </div>
        </div>
      </div>

      <div class="section" v-if="kp.difficulty > 0">
        <div class="section-title">难度等级</div>
        <div class="difficulty">
          <span v-for="i in 5" :key="i" :class="{ active: i <= kp.difficulty }">★</span>
        </div>
      </div>

      <div class="section" v-if="kp.prerequisites.length > 0">
        <div class="section-title">前置知识</div>
        <div class="prereq-list">
          <span v-for="pre in kp.prerequisites" :key="pre" class="prereq-tag">{{ pre }}</span>
        </div>
      </div>

      <button class="practice-btn" @click="startPractice">
        开始练习
      </button>
    </div>

    <div v-else class="error">
      <div class="error-icon">😕</div>
      <div class="error-text">未找到该知识点</div>
    </div>
  </div>
</template>

<style scoped>
.knowledge-page {
  min-height: 100vh;
  background: #0f1923;
  padding: 16px;
  max-width: 500px;
  margin: 0 auto;
}

.header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
}

.back-btn {
  background: none;
  border: none;
  color: #fff;
  font-size: 24px;
  cursor: pointer;
  padding: 4px;
}

.header h1 {
  flex: 1;
  color: #fff;
  font-size: 20px;
  margin: 0;
}

.loading {
  text-align: center;
  color: rgba(255, 255, 255, 0.5);
  padding: 60px;
}

.content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.section {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 20px;
}

.section-title {
  color: #ffd700;
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 12px;
}

.section-body {
  color: rgba(255, 255, 255, 0.8);
  font-size: 15px;
  line-height: 1.6;
}

.formula-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.formula-item {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(255, 215, 0, 0.05);
  border-radius: 12px;
  padding: 12px;
}

.formula-num {
  width: 24px;
  height: 24px;
  background: rgba(255, 215, 0, 0.2);
  color: #ffd700;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
  flex-shrink: 0;
}

.formula-text {
  color: #fff;
  font-size: 16px;
}

.mistake-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.mistake-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.mistake-icon {
  font-size: 16px;
  flex-shrink: 0;
  margin-top: 2px;
}

.mistake-text {
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
  line-height: 1.5;
}

.difficulty {
  display: flex;
  gap: 4px;
}

.difficulty span {
  color: rgba(255, 255, 255, 0.2);
  font-size: 20px;
}

.difficulty span.active {
  color: #ffd700;
}

.prereq-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.prereq-tag {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.6);
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
}

.practice-btn {
  width: 100%;
  padding: 16px;
  background: linear-gradient(135deg, #ffd700, #ff8c00);
  color: #1a1a2e;
  border: none;
  border-radius: 12px;
  font-size: 18px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
}

.practice-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(255, 215, 0, 0.3);
}

.error {
  text-align: center;
  padding: 60px;
}

.error-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.error-text {
  color: rgba(255, 255, 255, 0.5);
  font-size: 16px;
}
</style>

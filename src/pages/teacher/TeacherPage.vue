<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/userStore'
import { getStorage, setStorage, generateId } from '@/utils/storage'

interface Student {
  id: string
  name: string
  avatar: string
  level: number
  rankTier: string
  totalAnswered: number
  accuracy: number
  lastActive: string
}

interface ClassInfo {
  id: string
  name: string
  students: Student[]
  createdAt: string
}

interface Assignment {
  id: string
  title: string
  description: string
  targetCount: number
  deadline: string
  createdAt: string
}

const router = useRouter()
const userStore = useUserStore()

const classes = ref<ClassInfo[]>(getStorage('teacher-classes', []))
const assignments = ref<Assignment[]>(getStorage('teacher-assignments', []))
const activeTab = ref<'students' | 'data' | 'tasks'>('students')
const showCreateClass = ref(false)
const showCreateTask = ref(false)
const newClassName = ref('')
const newTaskTitle = ref('')
const newTaskDesc = ref('')
const newTaskCount = ref(10)

// Mock students for demo
const mockStudents: Student[] = [
  { id: '1', name: '张小明', avatar: '🧑‍🎓', level: 5, rankTier: '白银', totalAnswered: 120, accuracy: 78, lastActive: '2026-05-08' },
  { id: '2', name: '李小红', avatar: '👩‍🎓', level: 8, rankTier: '黄金', totalAnswered: 230, accuracy: 85, lastActive: '2026-05-08' },
  { id: '3', name: '王小刚', avatar: '🧑', level: 3, rankTier: '青铜', totalAnswered: 50, accuracy: 62, lastActive: '2026-05-07' },
  { id: '4', name: '赵小美', avatar: '👧', level: 6, rankTier: '白银', totalAnswered: 150, accuracy: 82, lastActive: '2026-05-08' },
  { id: '5', name: '刘小伟', avatar: '👦', level: 4, rankTier: '青铜', totalAnswered: 80, accuracy: 55, lastActive: '2026-05-06' },
  { id: '6', name: '陈小丽', avatar: '👩', level: 7, rankTier: '黄金', totalAnswered: 200, accuracy: 88, lastActive: '2026-05-08' },
]

const currentClass = computed(() => classes.value[0] || null)
const students = computed(() => currentClass.value?.students || mockStudents)

const classStats = computed(() => {
  const s = students.value
  if (s.length === 0) return { avgAccuracy: 0, avgLevel: 0, totalAnswered: 0, activeToday: 0 }
  const today = new Date().toISOString().slice(0, 10)
  return {
    avgAccuracy: Math.round(s.reduce((sum, st) => sum + st.accuracy, 0) / s.length),
    avgLevel: Math.round(s.reduce((sum, st) => sum + st.level, 0) / s.length * 10) / 10,
    totalAnswered: s.reduce((sum, st) => sum + st.totalAnswered, 0),
    activeToday: s.filter(st => st.lastActive === today).length,
  }
})

function createClass() {
  if (!newClassName.value.trim()) return
  const cls: ClassInfo = {
    id: generateId(),
    name: newClassName.value.trim(),
    students: [...mockStudents],
    createdAt: new Date().toISOString(),
  }
  classes.value.push(cls)
  setStorage('teacher-classes', classes.value)
  showCreateClass.value = false
  newClassName.value = ''
}

function createAssignment() {
  if (!newTaskTitle.value.trim()) return
  const assignment: Assignment = {
    id: generateId(),
    title: newTaskTitle.value.trim(),
    description: newTaskDesc.value.trim(),
    targetCount: newTaskCount.value,
    deadline: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    createdAt: new Date().toISOString(),
  }
  assignments.value.push(assignment)
  setStorage('teacher-assignments', assignments.value)
  showCreateTask.value = false
  newTaskTitle.value = ''
  newTaskDesc.value = ''
  newTaskCount.value = 10
}

function getAccuracyColor(acc: number): string {
  if (acc >= 80) return '#2ed573'
  if (acc >= 60) return '#ffd700'
  return '#ff4757'
}

function getRankColor(tier: string): string {
  const colors: Record<string, string> = {
    '青铜': '#cd7f32',
    '白银': '#c0c0c0',
    '黄金': '#ffd700',
    '铂金': '#00ced1',
    '钻石': '#bb86fc',
  }
  return colors[tier] || '#fff'
}

function goBack() {
  router.push('/my')
}
</script>

<template>
  <div class="teacher-page">
    <div class="header">
      <button class="back-btn" @click="goBack">←</button>
      <h1>老师后台</h1>
    </div>

    <!-- Class stats -->
    <div class="stats-banner">
      <div class="banner-stat">
        <div class="bs-value">{{ students.length }}</div>
        <div class="bs-label">班级人数</div>
      </div>
      <div class="banner-stat">
        <div class="bs-value" :style="{ color: getAccuracyColor(classStats.avgAccuracy) }">{{ classStats.avgAccuracy }}%</div>
        <div class="bs-label">平均正确率</div>
      </div>
      <div class="banner-stat">
        <div class="bs-value">{{ classStats.avgLevel }}</div>
        <div class="bs-label">平均等级</div>
      </div>
      <div class="banner-stat">
        <div class="bs-value" style="color: #2ed573">{{ classStats.activeToday }}</div>
        <div class="bs-label">今日活跃</div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="tabs">
      <button class="tab" :class="{ active: activeTab === 'students' }" @click="activeTab = 'students'">学生</button>
      <button class="tab" :class="{ active: activeTab === 'data' }" @click="activeTab = 'data'">数据</button>
      <button class="tab" :class="{ active: activeTab === 'tasks' }" @click="activeTab = 'tasks'">任务</button>
    </div>

    <!-- Students tab -->
    <div v-if="activeTab === 'students'" class="tab-content">
      <div v-if="!currentClass" class="create-class-prompt">
        <div class="prompt-text">还未创建班级</div>
        <button class="create-btn" @click="showCreateClass = true">创建班级</button>
      </div>

      <div v-else class="student-list">
        <div v-for="student in students" :key="student.id" class="student-card">
          <div class="student-avatar">{{ student.avatar }}</div>
          <div class="student-info">
            <div class="student-name">
              {{ student.name }}
              <span class="rank-badge" :style="{ color: getRankColor(student.rankTier) }">
                {{ student.rankTier }}
              </span>
            </div>
            <div class="student-meta">
              Lv.{{ student.level }} · {{ student.totalAnswered }}题 ·
              <span :style="{ color: getAccuracyColor(student.accuracy) }">{{ student.accuracy }}%</span>
            </div>
          </div>
          <div class="student-status" :class="{ active: student.lastActive >= new Date().toISOString().slice(0, 10) }">
            {{ student.lastActive >= new Date().toISOString().slice(0, 10) ? '今日' : '离线' }}
          </div>
        </div>
      </div>
    </div>

    <!-- Data tab -->
    <div v-if="activeTab === 'data'" class="tab-content">
      <div class="section-card">
        <div class="section-title">成绩分布</div>
        <div class="dist-bars">
          <div class="dist-row">
            <span class="dist-label">90%+</span>
            <div class="dist-track">
              <div class="dist-fill" :style="{ width: (students.filter(s => s.accuracy >= 90).length / students.length * 100) + '%', background: '#2ed573' }"></div>
            </div>
            <span class="dist-count">{{ students.filter(s => s.accuracy >= 90).length }}人</span>
          </div>
          <div class="dist-row">
            <span class="dist-label">80-89%</span>
            <div class="dist-track">
              <div class="dist-fill" :style="{ width: (students.filter(s => s.accuracy >= 80 && s.accuracy < 90).length / students.length * 100) + '%', background: '#7bed9f' }"></div>
            </div>
            <span class="dist-count">{{ students.filter(s => s.accuracy >= 80 && s.accuracy < 90).length }}人</span>
          </div>
          <div class="dist-row">
            <span class="dist-label">70-79%</span>
            <div class="dist-track">
              <div class="dist-fill" :style="{ width: (students.filter(s => s.accuracy >= 70 && s.accuracy < 80).length / students.length * 100) + '%', background: '#ffd700' }"></div>
            </div>
            <span class="dist-count">{{ students.filter(s => s.accuracy >= 70 && s.accuracy < 80).length }}人</span>
          </div>
          <div class="dist-row">
            <span class="dist-label">&lt;70%</span>
            <div class="dist-track">
              <div class="dist-fill" :style="{ width: (students.filter(s => s.accuracy < 70).length / students.length * 100) + '%', background: '#ff4757' }"></div>
            </div>
            <span class="dist-count">{{ students.filter(s => s.accuracy < 70).length }}人</span>
          </div>
        </div>
      </div>

      <div class="section-card">
        <div class="section-title">需关注学生</div>
        <div v-for="student in students.filter(s => s.accuracy < 70)" :key="student.id" class="alert-student">
          <span class="as-avatar">{{ student.avatar }}</span>
          <span class="as-name">{{ student.name }}</span>
          <span class="as-reason" style="color: #ff4757">正确率 {{ student.accuracy }}%</span>
        </div>
        <div v-if="students.filter(s => s.accuracy < 70).length === 0" class="empty-text">
          所有学生表现良好
        </div>
      </div>
    </div>

    <!-- Tasks tab -->
    <div v-if="activeTab === 'tasks'" class="tab-content">
      <button class="create-task-btn" @click="showCreateTask = true">+ 布置任务</button>

      <div v-if="assignments.length === 0" class="empty-text" style="padding: 40px 0">
        暂无布置的任务
      </div>

      <div v-for="task in assignments" :key="task.id" class="task-card">
        <div class="task-title">{{ task.title }}</div>
        <div class="task-desc">{{ task.description }}</div>
        <div class="task-meta">
          <span>目标: {{ task.targetCount }}题</span>
          <span>截止: {{ task.deadline }}</span>
        </div>
      </div>
    </div>

    <!-- Create class modal -->
    <div v-if="showCreateClass" class="modal-overlay" @click.self="showCreateClass = false">
      <div class="modal">
        <div class="modal-title">创建班级</div>
        <input v-model="newClassName" class="modal-input" placeholder="输入班级名称" />
        <div class="modal-actions">
          <button class="modal-cancel" @click="showCreateClass = false">取消</button>
          <button class="modal-confirm" @click="createClass">创建</button>
        </div>
      </div>
    </div>

    <!-- Create task modal -->
    <div v-if="showCreateTask" class="modal-overlay" @click.self="showCreateTask = false">
      <div class="modal">
        <div class="modal-title">布置任务</div>
        <input v-model="newTaskTitle" class="modal-input" placeholder="任务标题" />
        <textarea v-model="newTaskDesc" class="modal-textarea" placeholder="任务描述"></textarea>
        <div class="modal-field">
          <label>目标题数:</label>
          <input v-model.number="newTaskCount" type="number" class="modal-number" min="1" max="50" />
        </div>
        <div class="modal-actions">
          <button class="modal-cancel" @click="showCreateTask = false">取消</button>
          <button class="modal-confirm" @click="createAssignment">发布</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.teacher-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #1a0a2e 0%, #0f1923 100%);
  padding: 16px;
  max-width: 500px;
  margin: 0 auto;
}

.header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.back-btn {
  background: none;
  border: none;
  color: #fff;
  font-size: 24px;
  cursor: pointer;
}

.header h1 {
  flex: 1;
  color: #ffd700;
  font-size: 20px;
  margin: 0;
}

.stats-banner {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 12px;
}

.banner-stat {
  flex: 1;
  text-align: center;
}

.bs-value {
  color: #ffd700;
  font-size: 18px;
  font-weight: bold;
}

.bs-label {
  color: rgba(255, 255, 255, 0.5);
  font-size: 10px;
  margin-top: 2px;
}

.tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.tab {
  flex: 1;
  padding: 8px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  background: transparent;
  color: rgba(255, 255, 255, 0.5);
  font-size: 13px;
  cursor: pointer;
}

.tab.active {
  border-color: #ffd700;
  background: rgba(255, 215, 0, 0.1);
  color: #ffd700;
}

.create-class-prompt {
  text-align: center;
  padding: 40px;
}

.prompt-text {
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 16px;
}

.create-btn {
  padding: 10px 24px;
  border: none;
  border-radius: 8px;
  background: linear-gradient(135deg, #ffd700, #ff8c00);
  color: #1a1a2e;
  font-weight: bold;
  cursor: pointer;
}

.student-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.student-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
}

.student-avatar {
  font-size: 28px;
}

.student-info {
  flex: 1;
}

.student-name {
  color: #fff;
  font-size: 14px;
  font-weight: bold;
}

.rank-badge {
  font-size: 11px;
  margin-left: 4px;
}

.student-meta {
  color: rgba(255, 255, 255, 0.5);
  font-size: 12px;
  margin-top: 2px;
}

.student-status {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.3);
  padding: 2px 8px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.05);
}

.student-status.active {
  color: #2ed573;
  background: rgba(46, 213, 115, 0.1);
}

.section-card {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
}

.section-title {
  color: #fff;
  font-size: 15px;
  font-weight: bold;
  margin-bottom: 12px;
}

.dist-bars {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.dist-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.dist-label {
  color: rgba(255, 255, 255, 0.6);
  font-size: 12px;
  width: 55px;
}

.dist-track {
  flex: 1;
  height: 8px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
  overflow: hidden;
}

.dist-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s;
}

.dist-count {
  color: rgba(255, 255, 255, 0.5);
  font-size: 12px;
  width: 30px;
  text-align: right;
}

.alert-student {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.as-avatar { font-size: 20px; }
.as-name { color: #fff; font-size: 13px; flex: 1; }
.as-reason { font-size: 12px; }

.empty-text {
  color: rgba(255, 255, 255, 0.4);
  text-align: center;
  font-size: 13px;
}

.create-task-btn {
  width: 100%;
  padding: 12px;
  border: 2px dashed rgba(255, 215, 0, 0.3);
  border-radius: 10px;
  background: transparent;
  color: #ffd700;
  font-size: 14px;
  cursor: pointer;
  margin-bottom: 12px;
}

.task-card {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  padding: 12px;
  margin-bottom: 8px;
}

.task-title {
  color: #fff;
  font-size: 14px;
  font-weight: bold;
  margin-bottom: 4px;
}

.task-desc {
  color: rgba(255, 255, 255, 0.5);
  font-size: 12px;
  margin-bottom: 6px;
}

.task-meta {
  display: flex;
  gap: 16px;
  color: rgba(255, 255, 255, 0.4);
  font-size: 11px;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modal {
  background: #1a1a2e;
  border-radius: 16px;
  padding: 24px;
  width: 90%;
  max-width: 360px;
}

.modal-title {
  color: #fff;
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 16px;
}

.modal-input {
  width: 100%;
  padding: 10px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  color: #fff;
  font-size: 14px;
  margin-bottom: 12px;
  box-sizing: border-box;
}

.modal-textarea {
  width: 100%;
  padding: 10px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  color: #fff;
  font-size: 14px;
  margin-bottom: 12px;
  min-height: 60px;
  resize: vertical;
  box-sizing: border-box;
}

.modal-field {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.modal-field label {
  color: rgba(255, 255, 255, 0.7);
  font-size: 13px;
}

.modal-number {
  width: 60px;
  padding: 6px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.05);
  color: #fff;
  font-size: 14px;
  text-align: center;
}

.modal-actions {
  display: flex;
  gap: 12px;
}

.modal-cancel, .modal-confirm {
  flex: 1;
  padding: 10px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
  border: none;
}

.modal-cancel {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.modal-confirm {
  background: linear-gradient(135deg, #ffd700, #ff8c00);
  color: #1a1a2e;
}
</style>

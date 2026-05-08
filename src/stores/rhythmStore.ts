import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getStorage, setStorage } from '@/utils/storage'

export interface RhythmNote {
  id: string
  expression: string
  answer: number
  lane: number // 0-3
  y: number
  speed: number
  hit: boolean
  missed: boolean
}

export interface RhythmSong {
  id: string
  name: string
  icon: string
  bpm: number
  difficulties: number[]
  description: string
}

export interface RhythmScore {
  songId: string
  difficulty: number
  score: number
  grade: string
  maxCombo: number
  accuracy: number
}

const SONGS: RhythmSong[] = [
  {
    id: 'song1',
    name: '正负交响曲',
    icon: '🎵',
    bpm: 120,
    difficulties: [1, 2, 3, 4],
    description: '正负数的加减运算，节奏明快',
  },
  {
    id: 'song2',
    name: '方程进行曲',
    icon: '🥁',
    bpm: 100,
    difficulties: [1, 2, 3, 4],
    description: '一元一次方程求解，稳健有力',
  },
  {
    id: 'song3',
    name: '几何华尔兹',
    icon: '🎶',
    bpm: 90,
    difficulties: [1, 2, 3, 4],
    description: '角度与几何计算，优雅流畅',
  },
]

const PERFECT_WINDOW = 40
const GREAT_WINDOW = 80
const GOOD_WINDOW = 140

export const useRhythmStore = defineStore('rhythm', () => {
  const songs = ref(SONGS)
  const scores = ref<RhythmScore[]>(getStorage('rhythm-scores', []))
  const highScores = ref<Record<string, number>>(getStorage('rhythm-highscores', {}))

  // Game state
  const isPlaying = ref(false)
  const currentSong = ref<RhythmSong | null>(null)
  const currentDifficulty = ref(1)
  const notes = ref<RhythmNote[]>([])
  const score = ref(0)
  const combo = ref(0)
  const maxCombo = ref(0)
  const hp = ref(100)
  const maxHP = ref(100)
  const perfectCount = ref(0)
  const greatCount = ref(0)
  const goodCount = ref(0)
  const missCount = ref(0)
  const totalNotes = ref(0)
  const elapsedTime = ref(0)
  const gameStartTime = ref(0)

  const accuracy = computed(() => {
    const total = perfectCount.value + greatCount.value + goodCount.value + missCount.value
    if (total === 0) return 0
    return Math.round(((perfectCount.value * 100 + greatCount.value * 80 + goodCount.value * 50) / total))
  })

  const grade = computed(() => {
    if (accuracy.value >= 95) return 'S'
    if (accuracy.value >= 90) return 'A'
    if (accuracy.value >= 80) return 'B'
    if (accuracy.value >= 70) return 'C'
    return 'D'
  })

  function generateExpression(difficulty: number): { expression: string; answer: number } {
    const ops = ['+', '-', '×', '÷']
    let a: number, b: number, op: string, answer: number

    if (difficulty <= 1) {
      a = Math.floor(Math.random() * 20) - 10
      b = Math.floor(Math.random() * 20) - 10
      op = ops[Math.floor(Math.random() * 2)]!
      answer = op === '+' ? a + b : a - b
    } else if (difficulty <= 2) {
      a = Math.floor(Math.random() * 30) - 15
      b = Math.floor(Math.random() * 20) - 10
      op = ops[Math.floor(Math.random() * 3)]!
      if (op === '×') {
        answer = a * b
      } else {
        answer = op === '+' ? a + b : a - b
      }
    } else if (difficulty <= 3) {
      a = Math.floor(Math.random() * 50) - 25
      b = Math.floor(Math.random() * 30) - 15
      op = ops[Math.floor(Math.random() * 4)]!
      if (op === '÷') {
        b = b === 0 ? 1 : b
        a = a - (a % b)
        answer = Math.floor(a / b)
      } else if (op === '×') {
        answer = a * b
      } else {
        answer = op === '+' ? a + b : a - b
      }
    } else {
      // Difficulty 4: two operations
      a = Math.floor(Math.random() * 20) - 10
      b = Math.floor(Math.random() * 15) - 7
      const c = Math.floor(Math.random() * 15) - 7
      const op1 = ops[Math.floor(Math.random() * 2)]
      const op2 = ops[Math.floor(Math.random() * 2)]
      const first = op1 === '+' ? a + b : a - b
      answer = op2 === '+' ? first + c : first - c
      return { expression: `${a} ${op1} ${b} ${op2} ${c}`, answer }
    }

    return { expression: `${a} ${op} ${b}`, answer }
  }

  function startGame(songId: string, difficulty: number) {
    const song = songs.value.find(s => s.id === songId)
    if (!song) return

    currentSong.value = song
    currentDifficulty.value = difficulty
    isPlaying.value = true
    score.value = 0
    combo.value = 0
    maxCombo.value = 0
    hp.value = 100
    perfectCount.value = 0
    greatCount.value = 0
    goodCount.value = 0
    missCount.value = 0
    elapsedTime.value = 0
    gameStartTime.value = Date.now()

    // Generate notes
    const noteCount = 20 + difficulty * 10
    totalNotes.value = noteCount
    const generatedNotes: RhythmNote[] = []

    for (let i = 0; i < noteCount; i++) {
      const { expression, answer } = generateExpression(difficulty)
      generatedNotes.push({
        id: `note_${i}`,
        expression,
        answer,
        lane: Math.floor(Math.random() * 4),
        y: -80 - i * 200,
        speed: 1.5 + difficulty * 0.3,
        hit: false,
        missed: false,
      })
    }

    notes.value = generatedNotes
  }

  function updateNotes(deltaTime: number) {
    if (!isPlaying.value) return

    const hitLineY = 380 // Y position of hit line

    for (const note of notes.value) {
      if (note.hit || note.missed) continue

      note.y += note.speed * deltaTime * 0.06

      // Check if note passed hit line
      if (note.y > hitLineY + GOOD_WINDOW && !note.hit) {
        note.missed = true
        missCount.value++
        combo.value = 0
        hp.value = Math.max(0, hp.value - 5)
      }
    }

    elapsedTime.value = Date.now() - gameStartTime.value

    // Check game over
    if (hp.value <= 0) {
      endGame(false)
    }

    // Check all notes processed
    const allProcessed = notes.value.every(n => n.hit || n.missed)
    if (allProcessed) {
      endGame(true)
    }
  }

  function hitNote(lane: number): string {
    if (!isPlaying.value) return ''

    const hitLineY = 380
    let closestNote: RhythmNote | null = null
    let closestDist = Infinity

    for (const note of notes.value) {
      if (note.hit || note.missed || note.lane !== lane) continue
      const dist = Math.abs(note.y - hitLineY)
      if (dist < closestDist && dist < GOOD_WINDOW) {
        closestDist = dist
        closestNote = note
      }
    }

    if (!closestNote) return ''

    closestNote.hit = true
    let judgment = ''

    if (closestDist <= PERFECT_WINDOW) {
      judgment = 'PERFECT'
      score.value += 100 * (1 + combo.value * 0.1)
      perfectCount.value++
      hp.value = Math.min(maxHP.value, hp.value + 2)
    } else if (closestDist <= GREAT_WINDOW) {
      judgment = 'GREAT'
      score.value += 70 * (1 + combo.value * 0.05)
      greatCount.value++
      hp.value = Math.min(maxHP.value, hp.value + 1)
    } else {
      judgment = 'GOOD'
      score.value += 40
      goodCount.value++
    }

    combo.value++
    maxCombo.value = Math.max(maxCombo.value, combo.value)
    score.value = Math.round(score.value)

    return judgment
  }

  function endGame(completed: boolean) {
    isPlaying.value = false

    if (!currentSong.value) return

    const finalScore: RhythmScore = {
      songId: currentSong.value.id,
      difficulty: currentDifficulty.value,
      score: score.value,
      grade: grade.value,
      maxCombo: maxCombo.value,
      accuracy: accuracy.value,
    }

    // Save score
    scores.value.push(finalScore)
    setStorage('rhythm-scores', scores.value)

    // Update high score
    const key = `${currentSong.value.id}_${currentDifficulty.value}`
    if (!highScores.value[key] || score.value > highScores.value[key]) {
      highScores.value[key] = score.value
      setStorage('rhythm-highscores', highScores.value)
    }
  }

  function getHighScore(songId: string, difficulty: number): number {
    return highScores.value[`${songId}_${difficulty}`] || 0
  }

  function getSongScores(songId: string): RhythmScore[] {
    return scores.value.filter(s => s.songId === songId)
  }

  return {
    songs,
    scores,
    highScores,
    isPlaying,
    currentSong,
    currentDifficulty,
    notes,
    score,
    combo,
    maxCombo,
    hp,
    maxHP,
    perfectCount,
    greatCount,
    goodCount,
    missCount,
    totalNotes,
    elapsedTime,
    accuracy,
    grade,
    startGame,
    updateNotes,
    hitNote,
    endGame,
    getHighScore,
    getSongScores,
  }
})

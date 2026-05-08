<script setup lang="ts">
import { ref } from 'vue'
import type { Question } from '@/types/question'
import { renderLatex } from '@/utils/latex'

const props = withDefaults(
  defineProps<{
    question: Question
    showAnswer?: boolean
  }>(),
  { showAnswer: false }
)

const emit = defineEmits<{
  answer: [value: string]
}>()

const userAnswer = ref<string>('')
const hasAnswered = ref(false)

const optionLabels = ['A', 'B', 'C', 'D']

function selectOption(index: number) {
  if (hasAnswered.value && !props.showAnswer) return
  userAnswer.value = optionLabels[index] || ''
  hasAnswered.value = true
  emit('answer', optionLabels[index] || '')
}

function onNumberInput(value: string) {
  userAnswer.value = value
}

function onNumberSubmit(value: string) {
  hasAnswered.value = true
  emit('answer', value)
}

function getOptionClass(index: number): string {
  if (!props.showAnswer && !hasAnswered.value) return ''
  const label = optionLabels[index]
  if (props.showAnswer && label === props.question.answer) return 'correct'
  if (hasAnswered.value && label === userAnswer.value && label !== props.question.answer) return 'wrong'
  return ''
}

function isFillCorrect(): boolean {
  return userAnswer.value === props.question.answer
}
</script>

<template>
  <div class="question-card">
    <div class="question-stem" v-html="renderLatex(question.stem)"></div>

    <!-- Choice type: 2x2 grid -->
    <div v-if="question.type === 'choice' && question.options" class="options-grid">
      <button
        v-for="(option, index) in question.options"
        :key="index"
        class="option-btn"
        :class="[
          getOptionClass(index),
          { selected: userAnswer === optionLabels[index] && !showAnswer }
        ]"
        :disabled="hasAnswered && !showAnswer"
        @click="selectOption(index)"
      >
        <span class="option-label">{{ optionLabels[index] }}</span>
        <span class="option-text" v-html="renderLatex(option)"></span>
      </button>
    </div>

    <!-- Fill blank type: number keyboard -->
    <div v-else-if="question.type === 'fill_blank'" class="fill-blank-section">
      <div class="input-display" :class="{ correct: showAnswer && isFillCorrect(), wrong: showAnswer && !isFillCorrect() }">
        <span v-if="userAnswer">{{ userAnswer }}</span>
        <span v-else class="placeholder">输入答案...</span>
      </div>

      <div v-if="showAnswer" class="answer-reveal">
        <span class="correct-answer">正确答案: {{ question.answer }}</span>
      </div>

      <div class="numpad-grid">
        <button v-for="n in [1, 2, 3, 4, 5, 6, 7, 8, 9]" :key="n" class="numpad-btn" @click="onNumberInput(userAnswer + n)">
          {{ n }}
        </button>
        <button class="numpad-btn" @click="onNumberInput(userAnswer + '-')">-</button>
        <button class="numpad-btn" @click="onNumberInput(userAnswer + '0')">0</button>
        <button class="numpad-btn" @click="onNumberInput(userAnswer + '.')">.</button>
        <button class="numpad-btn action" @click="onNumberInput(userAnswer.slice(0, -1))">←</button>
        <button class="numpad-btn action submit" @click="onNumberSubmit(userAnswer)">确认</button>
      </div>
    </div>

    <!-- Solution section when showing answer -->
    <div v-if="showAnswer && question.solution" class="solution-section">
      <div class="solution-title">解析</div>
      <div class="solution-text" v-html="renderLatex(question.solution)"></div>
    </div>
  </div>
</template>

<style scoped>
.question-card {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 24px;
  color: #ffffff;
  max-width: 600px;
}

.question-stem {
  font-size: 18px;
  line-height: 1.6;
  margin-bottom: 20px;
}

.options-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.option-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  background: rgba(255, 255, 255, 0.08);
  border: 2px solid rgba(255, 255, 255, 0.15);
  border-radius: 10px;
  color: #ffffff;
  font-size: 15px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
}

.option-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.3);
}

.option-btn.selected {
  border-color: #ffd700;
  background: rgba(255, 215, 0, 0.15);
}

.option-btn.correct {
  border-color: #4caf50;
  background: rgba(76, 175, 80, 0.2);
}

.option-btn.wrong {
  border-color: #f44336;
  background: rgba(244, 67, 54, 0.2);
}

.option-btn:disabled {
  cursor: default;
  opacity: 0.7;
}

.option-label {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgba(255, 215, 0, 0.2);
  color: #ffd700;
  font-weight: 600;
  font-size: 14px;
  flex-shrink: 0;
}

.option-text {
  flex: 1;
}

/* Fill blank section */
.fill-blank-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.input-display {
  padding: 14px 18px;
  background: rgba(255, 255, 255, 0.08);
  border: 2px solid rgba(255, 255, 255, 0.15);
  border-radius: 10px;
  font-size: 20px;
  font-weight: 600;
  min-height: 28px;
  color: #ffd700;
}

.input-display.correct {
  border-color: #4caf50;
  color: #4caf50;
}

.input-display.wrong {
  border-color: #f44336;
  color: #f44336;
}

.placeholder {
  color: rgba(255, 255, 255, 0.3);
  font-weight: 400;
}

.answer-reveal {
  text-align: center;
  padding: 8px;
}

.correct-answer {
  color: #4caf50;
  font-size: 16px;
  font-weight: 600;
}

.numpad-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.numpad-btn {
  padding: 14px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  color: #ffffff;
  font-size: 18px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.numpad-btn:hover {
  background: rgba(255, 255, 255, 0.18);
}

.numpad-btn:active {
  background: rgba(255, 255, 255, 0.25);
}

.numpad-btn.action {
  background: rgba(255, 215, 0, 0.15);
  color: #ffd700;
}

.numpad-btn.submit {
  background: #ffd700;
  color: #1a1a2e;
  grid-column: span 2;
}

.numpad-btn.submit:hover {
  background: #ffe44d;
}

/* Solution */
.solution-section {
  margin-top: 20px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  border-left: 3px solid #ffd700;
}

.solution-title {
  color: #ffd700;
  font-weight: 600;
  margin-bottom: 8px;
}

.solution-text {
  font-size: 15px;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.85);
}
</style>

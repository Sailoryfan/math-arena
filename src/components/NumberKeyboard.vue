<script setup lang="ts">
import { ref } from 'vue'

const emit = defineEmits<{
  input: [value: string]
  submit: [value: string]
}>()

const displayValue = ref('')

function press(key: string) {
  if (key === '←') {
    displayValue.value = displayValue.value.slice(0, -1)
  } else if (key === '-' && displayValue.value === '') {
    displayValue.value = '-'
  } else if (key === '.' && displayValue.value.includes('.')) {
    return // prevent multiple dots
  } else if (key === '-' && displayValue.value !== '') {
    return // minus only at start
  } else {
    displayValue.value += key
  }
  emit('input', displayValue.value)
}

function submit() {
  if (displayValue.value === '' || displayValue.value === '-') return
  emit('submit', displayValue.value)
}

function clear() {
  displayValue.value = ''
  emit('input', '')
}
</script>

<template>
  <div class="number-keyboard">
    <div class="display">
      <span v-if="displayValue" class="display-value">{{ displayValue }}</span>
      <span v-else class="display-placeholder">输入答案</span>
      <button v-if="displayValue" class="clear-btn" @click="clear">清除</button>
    </div>

    <div class="keypad">
      <button class="key" @click="press('1')">1</button>
      <button class="key" @click="press('2')">2</button>
      <button class="key" @click="press('3')">3</button>
      <button class="key action" @click="press('←')">←</button>

      <button class="key" @click="press('4')">4</button>
      <button class="key" @click="press('5')">5</button>
      <button class="key" @click="press('6')">6</button>
      <button class="key action" @click="press('-')">-</button>

      <button class="key" @click="press('7')">7</button>
      <button class="key" @click="press('8')">8</button>
      <button class="key" @click="press('9')">9</button>
      <button class="key action" @click="press('.')">.</button>

      <button class="key zero" @click="press('0')">0</button>
      <button class="key submit" @click="submit">确认</button>
    </div>
  </div>
</template>

<style scoped>
.number-keyboard {
  width: 100%;
  max-width: 360px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 16px;
}

.display {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
  margin-bottom: 12px;
  min-height: 28px;
}

.display-value {
  font-size: 22px;
  font-weight: 700;
  color: #ffd700;
  font-family: 'Courier New', monospace;
}

.display-placeholder {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.3);
}

.clear-btn {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.5);
  font-size: 13px;
  cursor: pointer;
  padding: 4px 8px;
}

.clear-btn:hover {
  color: #ffffff;
}

.keypad {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.key {
  padding: 14px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  color: #ffffff;
  font-size: 18px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s ease;
}

.key:hover {
  background: rgba(255, 255, 255, 0.18);
}

.key:active {
  background: rgba(255, 255, 255, 0.25);
}

.key.action {
  background: rgba(255, 215, 0, 0.12);
  color: #ffd700;
}

.key.action:hover {
  background: rgba(255, 215, 0, 0.22);
}

.key.zero {
  grid-column: span 2;
}

.key.submit {
  background: #ffd700;
  color: #1a1a2e;
  font-weight: 700;
}

.key.submit:hover {
  background: #ffe44d;
}
</style>

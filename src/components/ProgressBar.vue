<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    current: number
    total: number
    showText?: boolean
  }>(),
  { showText: true }
)

const percent = computed(() => {
  if (props.total <= 0) return 0
  return Math.min(100, Math.round((props.current / props.total) * 100))
})
</script>

<template>
  <div class="progress-bar-wrapper">
    <div v-if="showText" class="progress-text">
      第{{ current }}题 / 共{{ total }}题
    </div>
    <div class="progress-track">
      <div class="progress-fill" :style="{ width: percent + '%' }"></div>
    </div>
  </div>
</template>

<style scoped>
.progress-bar-wrapper {
  width: 100%;
  max-width: 600px;
}

.progress-text {
  color: rgba(255, 255, 255, 0.7);
  font-size: 13px;
  margin-bottom: 6px;
  text-align: right;
}

.progress-track {
  width: 100%;
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #ffd700, #ffed4a);
  border-radius: 4px;
  transition: width 0.3s ease;
}
</style>

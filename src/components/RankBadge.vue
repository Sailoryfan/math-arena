<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    tier: string
    size?: 'small' | 'medium' | 'large'
  }>(),
  { size: 'medium' }
)

const tierColors: Record<string, string> = {
  '青铜': '#CD7F32',
  '白银': '#C0C0C0',
  '黄金': '#FFD700',
  '铂金': '#00CED1',
  '钻石': '#B9F2FF',
}

const tierIcons: Record<string, string> = {
  '青铜': '🛡️',
  '白银': '⚔️',
  '黄金': '👑',
  '铂金': '💎',
  '钻石': '💠',
}

const color = computed(() => tierColors[props.tier] || '#888888')
const icon = computed(() => tierIcons[props.tier] || '?')

const sizeMap = {
  small: { badge: 56, icon: 20, font: 11 },
  medium: { badge: 80, icon: 28, font: 13 },
  large: { badge: 110, icon: 40, font: 16 },
}

const dims = computed(() => sizeMap[props.size])
</script>

<template>
  <div
    class="rank-badge"
    :style="{
      width: dims.badge + 'px',
      height: dims.badge + 'px',
      borderColor: color,
      boxShadow: '0 0 12px ' + color + '40',
    }"
  >
    <div class="badge-icon" :style="{ fontSize: dims.icon + 'px' }">
      {{ icon }}
    </div>
    <div class="badge-tier" :style="{ color: color, fontSize: dims.font + 'px' }">
      {{ tier }}
    </div>
  </div>
</template>

<style scoped>
.rank-badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: 3px solid;
  background: rgba(255, 255, 255, 0.05);
  gap: 2px;
  flex-shrink: 0;
}

.badge-icon {
  line-height: 1;
}

.badge-tier {
  font-weight: 700;
  line-height: 1.2;
  white-space: nowrap;
}
</style>

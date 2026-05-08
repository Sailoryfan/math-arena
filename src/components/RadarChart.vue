<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'

const props = defineProps<{
  scores: Record<string, number>
  dimensions: { key: string; label: string }[]
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)

const CANVAS_SIZE = 300
const CENTER = CANVAS_SIZE / 2
const MAX_RADIUS = CENTER - 40
const GRID_LEVELS = [0.2, 0.4, 0.6, 0.8, 1.0]

function draw() {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const dpr = window.devicePixelRatio || 1
  canvas.width = CANVAS_SIZE * dpr
  canvas.height = CANVAS_SIZE * dpr
  ctx.scale(dpr, dpr)

  ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)

  const n = props.dimensions.length
  if (n < 3) return

  const angleStep = (2 * Math.PI) / n
  const startAngle = -Math.PI / 2

  function getPoint(angle: number, radius: number) {
    return {
      x: CENTER + Math.cos(angle) * radius,
      y: CENTER + Math.sin(angle) * radius,
    }
  }

  // Draw grid polygons
  for (const level of GRID_LEVELS) {
    const r = MAX_RADIUS * level
    ctx.beginPath()
    for (let i = 0; i < n; i++) {
      const angle = startAngle + i * angleStep
      const p = getPoint(angle, r)
      if (i === 0) ctx.moveTo(p.x, p.y)
      else ctx.lineTo(p.x, p.y)
    }
    ctx.closePath()
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)'
    ctx.lineWidth = 1
    ctx.stroke()
  }

  // Draw axis lines
  for (let i = 0; i < n; i++) {
    const angle = startAngle + i * angleStep
    const p = getPoint(angle, MAX_RADIUS)
    ctx.beginPath()
    ctx.moveTo(CENTER, CENTER)
    ctx.lineTo(p.x, p.y)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)'
    ctx.lineWidth = 1
    ctx.stroke()
  }

  // Draw data polygon
  ctx.beginPath()
  for (let i = 0; i < n; i++) {
    const dim = props.dimensions[i]
    if (!dim) continue
    const score = Math.max(0, Math.min(100, props.scores[dim.key] ?? 0))
    const ratio = score / 100
    const angle = startAngle + i * angleStep
    const p = getPoint(angle, MAX_RADIUS * ratio)
    if (i === 0) ctx.moveTo(p.x, p.y)
    else ctx.lineTo(p.x, p.y)
  }
  ctx.closePath()
  ctx.fillStyle = 'rgba(255, 215, 0, 0.25)'
  ctx.fill()
  ctx.strokeStyle = '#ffd700'
  ctx.lineWidth = 2
  ctx.stroke()

  // Draw data points
  for (let i = 0; i < n; i++) {
    const dim = props.dimensions[i]
    if (!dim) continue
    const score = Math.max(0, Math.min(100, props.scores[dim.key] ?? 0))
    const ratio = score / 100
    const angle = startAngle + i * angleStep
    const p = getPoint(angle, MAX_RADIUS * ratio)
    ctx.beginPath()
    ctx.arc(p.x, p.y, 4, 0, 2 * Math.PI)
    ctx.fillStyle = '#ffd700'
    ctx.fill()
  }

  // Draw labels
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)'
  ctx.font = '12px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  for (let i = 0; i < n; i++) {
    const dim = props.dimensions[i]
    if (!dim) continue
    const angle = startAngle + i * angleStep
    const labelRadius = MAX_RADIUS + 22
    const p = getPoint(angle, labelRadius)

    // Adjust text alignment based on position
    if (Math.abs(p.x - CENTER) < 5) {
      ctx.textAlign = 'center'
    } else if (p.x > CENTER) {
      ctx.textAlign = 'left'
    } else {
      ctx.textAlign = 'right'
    }

    ctx.fillText(dim.label, p.x, p.y)
  }
}

onMounted(draw)
watch(() => [props.scores, props.dimensions], draw, { deep: true })
</script>

<template>
  <canvas
    ref="canvasRef"
    class="radar-chart"
    :style="{ width: CANVAS_SIZE + 'px', height: CANVAS_SIZE + 'px' }"
  ></canvas>
</template>

<style scoped>
.radar-chart {
  display: block;
}
</style>

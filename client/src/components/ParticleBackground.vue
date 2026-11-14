<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useThemeStore } from '../stores/theme'
import { useParticleStore } from '../stores/particle'

const themeStore = useThemeStore()
const particleStore = useParticleStore()
const canvas = ref<HTMLCanvasElement | null>(null)
let ctx: CanvasRenderingContext2D | null = null
let particles: Particle[] = []
let mouse = { x: -999, y: -999 }
let animId = 0
let running = false
let w = 0, h = 0
let isDark = themeStore.mode === 'dark'
let rebuildTimer: ReturnType<typeof setTimeout> | null = null

interface LevelConfig {
  count: number
  sizeMul: number
  linkDist: number
  linkAlpha: number
  glow: number
  hues: number[]
}

/** 每档的粒子数量 / 尺寸倍率 / 连线距离 / 连线透明度 / 光晕强度 / 色相池（尺寸以原本粒子为上限 1.0） */
const LEVELS: Record<number, LevelConfig> = {
  1: { count: 90, sizeMul: 0.5, linkDist: 110, linkAlpha: 0.5, glow: 0.5, hues: [220, 270] },
  2: { count: 200, sizeMul: 0.68, linkDist: 140, linkAlpha: 1, glow: 1, hues: [220, 270] },
  3: { count: 270, sizeMul: 0.85, linkDist: 165, linkAlpha: 1.4, glow: 1.5, hues: [200, 220, 270] },
  4: { count: 340, sizeMul: 1, linkDist: 185, linkAlpha: 1.8, glow: 2, hues: [190, 220, 270, 300] },
}

function cfg(): LevelConfig {
  return LEVELS[particleStore.level] ?? LEVELS[2]
}

watch(() => themeStore.mode, (v) => { isDark = v === 'dark' })

watch(() => particleStore.level, () => {
  if (rebuildTimer) clearTimeout(rebuildTimer)
  // 拖动滑块时合并多次变更，避免每帧重建粒子
  rebuildTimer = setTimeout(applyLevel, 80)
})

class Particle {
  x: number; y: number; vx: number; vy: number; r: number; baseR: number; hue: number; baseHue: number
  constructor() {
    const c = cfg()
    this.x = Math.random() * w
    this.y = Math.random() * h
    this.vx = (Math.random() - 0.5) * 0.12
    this.vy = (Math.random() - 0.5) * 0.12
    this.baseR = (Math.random() * 2.5 + 1.5) * c.sizeMul
    this.r = this.baseR
    this.baseHue = c.hues[Math.floor(Math.random() * c.hues.length)]
    this.hue = this.baseHue
  }
  update() {
    const c = cfg()
    const dx = mouse.x - this.x
    const dy = mouse.y - this.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist < 250 && mouse.x > 0) {
      const force = (250 - dist) / 250 * 0.04
      this.vx += dx * force * 0.008
      this.vy += dy * force * 0.008
      this.r = Math.min(this.baseR + (250 - dist) / 250 * 5 * c.sizeMul, 7 * c.sizeMul)
      this.hue = 270
    } else {
      this.r += (this.baseR - this.r) * 0.1
      this.hue = this.baseHue
    }
    this.vx *= 0.997
    this.vy *= 0.997
    this.x += this.vx
    this.y += this.vy
    if (this.x < 0) { this.x = 0; this.vx *= -1 }
    if (this.x > w) { this.x = w; this.vx *= -1 }
    if (this.y < 0) { this.y = 0; this.vy *= -1 }
    if (this.y > h) { this.y = h; this.vy *= -1 }
  }
  draw() {
    if (!ctx) return
    ctx.beginPath()
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2)
    const alpha = this.hue === 270 ? 0.85 : 0.6
    const lightness = isDark ? 70 : 45
    ctx.fillStyle = `hsla(${this.hue}, 70%, ${lightness}%, ${alpha})`
    ctx.fill()
  }
}

function buildParticles() {
  const c = cfg()
  particles = Array.from({ length: c.count }, () => new Particle())
}

function startLoop() {
  if (running) return
  running = true
  animId = requestAnimationFrame(animate)
}

function stopLoop() {
  running = false
  cancelAnimationFrame(animId)
}

/** 按当前等级应用效果；0 档直接停掉动画并隐藏画布 */
function applyLevel() {
  if (!canvas.value || !ctx) return
  if (particleStore.level === 0) {
    stopLoop()
    ctx.clearRect(0, 0, w, h)
    canvas.value.style.display = 'none'
    return
  }
  canvas.value.style.display = 'block'
  buildParticles()
  startLoop()
}

function init() {
  if (!canvas.value) return
  ctx = canvas.value.getContext('2d')
  if (!ctx) return
  resize()
  applyLevel()
}

function resize() {
  if (!canvas.value) return
  w = canvas.value.width = window.innerWidth
  h = canvas.value.height = window.innerHeight
}

function animate() {
  if (!running || !ctx || !canvas.value) return
  const c = cfg()
  ctx.clearRect(0, 0, w, h)

  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      const dx = particles[i].x - particles[j].x
      const dy = particles[i].y - particles[j].y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < c.linkDist) {
        ctx.beginPath()
        ctx.moveTo(particles[i].x, particles[i].y)
        ctx.lineTo(particles[j].x, particles[j].y)
        const lineAlpha = (isDark ? 0.12 : 0.18) * c.linkAlpha
        const lineColor = isDark ? '137, 180, 250' : '108, 140, 255'
        ctx.strokeStyle = `rgba(${lineColor}, ${lineAlpha * (1 - dist / c.linkDist)})`
        ctx.lineWidth = 0.7 * c.sizeMul
        ctx.stroke()
      }
    }
  }

  for (const p of particles) {
    p.update()
    p.draw()
  }

  if (mouse.x > 0) {
    const glowAlpha = (isDark ? 0.1 : 0.15) * c.glow
    const g = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 180)
    g.addColorStop(0, `rgba(109, 40, 217, ${glowAlpha})`)
    g.addColorStop(0.5, `rgba(108, 140, 255, ${glowAlpha * 0.5})`)
    g.addColorStop(1, 'rgba(108, 140, 255, 0)')
    ctx.fillStyle = g
    ctx.fillRect(mouse.x - 180, mouse.y - 180, 360, 360)
  }

  animId = requestAnimationFrame(animate)
}

function onMouseMove(e: MouseEvent) {
  mouse.x = e.clientX
  mouse.y = e.clientY
}

function onMouseLeave() {
  mouse.x = -999
  mouse.y = -999
}

onMounted(() => {
  init()
  window.addEventListener('resize', resize)
  window.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseleave', onMouseLeave)
})

onUnmounted(() => {
  stopLoop()
  if (rebuildTimer) clearTimeout(rebuildTimer)
  window.removeEventListener('resize', resize)
  window.removeEventListener('mousemove', onMouseMove)
  document.removeEventListener('mouseleave', onMouseLeave)
})
</script>

<template>
  <canvas ref="canvas" class="particle-canvas"></canvas>
</template>

<style scoped>
.particle-canvas {
  position: fixed;
  top: 0; left: 0;
  width: 100%; height: 100%;
  pointer-events: none;
  z-index: 9999;
  opacity: 0.5;
}
</style>

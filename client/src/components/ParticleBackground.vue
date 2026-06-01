<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const canvas = ref<HTMLCanvasElement | null>(null)
let ctx: CanvasRenderingContext2D | null = null
let particles: Particle[] = []
let mouse = { x: -999, y: -999 }
let animId = 0
let w = 0, h = 0

class Particle {
  x: number; y: number; vx: number; vy: number; r: number; baseR: number; hue: number
  constructor() {
    this.x = Math.random() * w
    this.y = Math.random() * h
    this.vx = (Math.random() - 0.5) * 0.3
    this.vy = (Math.random() - 0.5) * 0.3
    this.baseR = Math.random() * 2.5 + 1.5
    this.r = this.baseR
    this.hue = Math.random() > 0.5 ? 220 : 270
  }
  update() {
    const dx = mouse.x - this.x
    const dy = mouse.y - this.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist < 250 && mouse.x > 0) {
      const force = (250 - dist) / 250 * 0.08
      this.vx += dx * force * 0.015
      this.vy += dy * force * 0.015
      this.r = Math.min(this.baseR + (250 - dist) / 250 * 5, 7)
      this.hue = 270
    } else {
      this.r += (this.baseR - this.r) * 0.1
      this.hue = 220
    }
    this.vx *= 0.999
    this.vy *= 0.999
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
    ctx.fillStyle = `hsla(${this.hue}, 70%, 70%, ${alpha})`
    ctx.fill()
  }
}

function init() {
  if (!canvas.value) return
  ctx = canvas.value.getContext('2d')!
  resize()
  particles = Array.from({ length: 120 }, () => new Particle())
  animate()
}

function resize() {
  if (!canvas.value) return
  w = canvas.value.width = window.innerWidth
  h = canvas.value.height = window.innerHeight
}

function animate() {
  if (!ctx || !canvas.value) return
  ctx.clearRect(0, 0, w, h)

  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      const dx = particles[i].x - particles[j].x
      const dy = particles[i].y - particles[j].y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < 140) {
        ctx.beginPath()
        ctx.moveTo(particles[i].x, particles[i].y)
        ctx.lineTo(particles[j].x, particles[j].y)
        ctx.strokeStyle = `rgba(137, 180, 250, ${0.12 * (1 - dist / 140)})`
        ctx.lineWidth = 0.6
        ctx.stroke()
      }
    }
  }

  for (const p of particles) {
    p.update()
    p.draw()
  }

  if (mouse.x > 0) {
    const g = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 180)
    g.addColorStop(0, 'rgba(183, 148, 244, 0.1)')
    g.addColorStop(0.5, 'rgba(108, 140, 255, 0.05)')
    g.addColorStop(1, 'rgba(183, 148, 244, 0)')
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
  cancelAnimationFrame(animId)
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
  pointer-events: none !important;
  mix-blend-mode: screen;
}
</style>

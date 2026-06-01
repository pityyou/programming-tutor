<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const canvas = ref<HTMLCanvasElement | null>(null)
let ctx: CanvasRenderingContext2D | null = null
let particles: Particle[] = []
let mouse = { x: -999, y: -999 }
let animId = 0
let w = 0, h = 0

class Particle {
  x: number; y: number; vx: number; vy: number; r: number; baseR: number
  constructor() {
    this.x = Math.random() * w
    this.y = Math.random() * h
    this.vx = (Math.random() - 0.5) * 0.3
    this.vy = (Math.random() - 0.5) * 0.3
    this.baseR = Math.random() * 2 + 1
    this.r = this.baseR
  }
  update() {
    // Mouse attraction
    const dx = mouse.x - this.x
    const dy = mouse.y - this.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist < 180 && mouse.x > 0) {
      const force = (180 - dist) / 180 * 0.04
      this.vx += dx * force * 0.01
      this.vy += dy * force * 0.01
      this.r = Math.min(this.baseR + (180 - dist) / 180 * 4, 6)
    } else {
      this.r += (this.baseR - this.r) * 0.1
    }
    // Damping
    this.vx *= 0.999
    this.vy *= 0.999
    this.x += this.vx
    this.y += this.vy
    // Bounce edges
    if (this.x < 0) { this.x = 0; this.vx *= -1 }
    if (this.x > w) { this.x = w; this.vx *= -1 }
    if (this.y < 0) { this.y = 0; this.vy *= -1 }
    if (this.y > h) { this.y = h; this.vy *= -1 }
  }
  draw() {
    if (!ctx) return
    ctx.beginPath()
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(137, 180, 250, 0.5)'
    if (this.r > this.baseR + 0.5) {
      ctx.fillStyle = 'rgba(183, 148, 244, 0.7)'
    }
    ctx.fill()
  }
}

function init() {
  if (!canvas.value) return
  ctx = canvas.value.getContext('2d')!
  resize()
  particles = Array.from({ length: 60 }, () => new Particle())
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

  // Draw connections
  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      const dx = particles[i].x - particles[j].x
      const dy = particles[i].y - particles[j].y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < 100) {
        ctx.beginPath()
        ctx.moveTo(particles[i].x, particles[i].y)
        ctx.lineTo(particles[j].x, particles[j].y)
        ctx.strokeStyle = `rgba(137, 180, 250, ${0.08 * (1 - dist / 100)})`
        ctx.lineWidth = 0.5
        ctx.stroke()
      }
    }
  }

  // Update and draw particles
  for (const p of particles) {
    p.update()
    p.draw()
  }

  // Mouse glow
  if (mouse.x > 0) {
    const g = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 120)
    g.addColorStop(0, 'rgba(183, 148, 244, 0.06)')
    g.addColorStop(1, 'rgba(183, 148, 244, 0)')
    ctx.fillStyle = g
    ctx.fillRect(mouse.x - 120, mouse.y - 120, 240, 240)
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
  width: 100vw; height: 100vh;
  pointer-events: none;
  z-index: 0;
  opacity: 0.6;
}
</style>

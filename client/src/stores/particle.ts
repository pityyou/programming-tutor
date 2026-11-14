import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export type ParticleLevel = 0 | 1 | 2 | 3 | 4

const LEVEL_KEY = 'particle_level'

/**
 * 粒子背景强度：0 关闭 / 1 微光 / 2 标准 / 3 丰富 / 4 星河
 * 等级同时控制粒子数量、尺寸、连线距离与光晕强度。
 */
export const useParticleStore = defineStore('particle', () => {
  const raw = localStorage.getItem(LEVEL_KEY)
  const parsed = raw === null ? NaN : parseInt(raw, 10)
  const level = ref<ParticleLevel>(
    Number.isFinite(parsed) && parsed >= 0 && parsed <= 4 ? (parsed as ParticleLevel) : 2
  )

  watch(level, (v) => localStorage.setItem(LEVEL_KEY, String(v)))

  function setLevel(v: number) {
    const n = Math.min(4, Math.max(0, Math.round(v)))
    level.value = n as ParticleLevel
  }

  return { level, setLevel }
})

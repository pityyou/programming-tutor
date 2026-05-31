<script setup lang="ts">
import { ref } from 'vue'

const emit = defineEmits<{
  'result': [text: string]
}>()

const isListening = ref(false)
const notSupported = ref(!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window))
const interim = ref('')

let recognition: any = null

function start() {
  const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
  if (!SpeechRecognition) { notSupported.value = true; return }

  recognition = new SpeechRecognition()
  recognition.lang = 'zh-CN'
  recognition.interimResults = true
  recognition.continuous = false

  recognition.onresult = (e: any) => {
    let final = ''
    let inter = ''
    for (let i = e.resultIndex; i < e.results.length; i++) {
      if (e.results[i].isFinal) final += e.results[i][0].transcript
      else inter += e.results[i][0].transcript
    }
    interim.value = inter
    if (final) {
      emit('result', final)
      stop()
    }
  }

  recognition.onerror = () => { stop() }
  recognition.onend = () => { if (isListening.value) stop() }

  recognition.start()
  isListening.value = true
}

function stop() {
  if (recognition) {
    recognition.stop()
    recognition = null
  }
  isListening.value = false
  interim.value = ''
}
</script>

<template>
  <div class="voice-wrap">
    <button
      v-if="!notSupported"
      :class="['voice-btn', { listening: isListening }]"
      @click="isListening ? stop() : start()"
      :title="isListening ? '停止录音' : '语音输入'"
    >
      {{ isListening ? '⏹' : '🎤' }}
    </button>
    <span v-if="interim" class="interim-text">{{ interim }}</span>
  </div>
</template>

<style scoped>
.voice-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
}
.voice-btn {
  width: 36px; height: 36px; border-radius: 50%;
  border: 1px solid var(--border-secondary);
  background: var(--bg-secondary);
  font-size: 16px; cursor: pointer; display: flex; align-items: center; justify-content: center;
  transition: all 0.2s;
  flex-shrink: 0;
}
.voice-btn:hover { border-color: var(--accent); }
.voice-btn.listening {
  background: var(--danger);
  border-color: var(--danger);
  animation: pulse 1.2s infinite;
}
@keyframes pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(243,139,168,0.4); }
  50% { box-shadow: 0 0 0 8px rgba(243,139,168,0); }
}
.interim-text {
  font-size: 12px; color: var(--text-muted); font-style: italic;
  max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
</style>

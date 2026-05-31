<script setup lang="ts">
import { MODEL_OPTIONS } from '../api/constants'
import { useAppStore } from '../stores/app'

const store = useAppStore()

const providers = Object.entries(MODEL_OPTIONS).map(([key, val]) => ({
  value: key,
  label: val.label,
}))

const currentModels = MODEL_OPTIONS[store.provider]?.models || []

function onProviderChange(e: Event) {
  const val = (e.target as HTMLSelectElement).value
  store.setProvider(val)
  const models = MODEL_OPTIONS[val]?.models
  if (models?.length) {
    store.setModel(models[0].value)
  }
}

function onModelChange(e: Event) {
  store.setModel((e.target as HTMLSelectElement).value)
}
</script>

<template>
  <div class="model-switcher">
    <select :value="store.provider" @change="onProviderChange" class="provider-select">
      <option v-for="p in providers" :key="p.value" :value="p.value">
        {{ p.label }}
      </option>
    </select>
    <select :value="store.model" @change="onModelChange" class="model-select">
      <option v-for="m in MODEL_OPTIONS[store.provider]?.models || []" :key="m.value" :value="m.value">
        {{ m.label }}
      </option>
    </select>
  </div>
</template>

<style scoped>
.model-switcher {
  display: flex;
  gap: 6px;
}
select {
  padding: 5px 10px;
  border-radius: 6px;
  border: 1px solid #585b70;
  background: #45475a;
  color: #cdd6f4;
  font-size: 12px;
  outline: none;
  cursor: pointer;
}
</style>

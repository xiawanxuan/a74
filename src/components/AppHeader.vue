<template>
  <header class="app-header">
    <div class="header-left">
      <div class="logo-icon">
        <svg viewBox="0 0 32 32" width="28" height="28">
          <path
            d="M6 24 L10 16 L14 20 L18 8 L22 18 L26 12"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <circle cx="6" cy="24" r="2" fill="currentColor" />
        </svg>
      </div>
      <div class="header-text">
        <h1 class="title">文物保护数字化实验室</h1>
        <p class="subtitle">拉曼光谱检索匹配平台</p>
      </div>
    </div>
    <div class="header-right">
      <div class="status-badge" :class="{ active: libraryReady }">
        <span class="dot"></span>
        <span>馆藏光谱库 {{ libraryCount }} 条</span>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useSpectrumStore } from '@/composables/useSpectrumStore'

const { librarySpectra, initLibrary } = useSpectrumStore()

const libraryCount = computed(() => librarySpectra.value.length)
const libraryReady = computed(() => librarySpectra.value.length >= 1500)

onMounted(() => {
  initLibrary()
})
</script>

<style scoped>
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 64px;
  padding: 0 24px;
  background: linear-gradient(180deg, var(--bg-card) 0%, var(--bg-primary) 100%);
  border-bottom: 1px solid var(--border-light);
  box-shadow: var(--shadow-sm);
  z-index: 10;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 14px;
}

.logo-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  color: var(--accent-primary);
  background: rgba(139, 105, 20, 0.1);
  border-radius: var(--radius-md);
}

.header-text .title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: 1px;
}

.header-text .subtitle {
  font-size: 12px;
  color: var(--text-tertiary);
  margin-top: 2px;
  letter-spacing: 2px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.status-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-light);
  border-radius: 20px;
  font-size: 12px;
  color: var(--text-secondary);
  transition: all 0.3s ease;
}

.status-badge.active {
  background: rgba(127, 160, 111, 0.15);
  border-color: rgba(127, 160, 111, 0.3);
  color: var(--accent-celadon);
}

.status-badge .dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--text-tertiary);
  transition: background 0.3s ease;
}

.status-badge.active .dot {
  background: var(--accent-celadon);
  box-shadow: 0 0 8px rgba(127, 160, 111, 0.5);
}
</style>

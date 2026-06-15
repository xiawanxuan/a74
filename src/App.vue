<template>
  <div class="app-container">
    <AppHeader />
    <div class="main-layout">
      <ControlSidebar />
      <div class="canvas-area">
        <SpectraChart />
        <ClusterScatter />
      </div>
    </div>
    <MatchResultPanel />
  </div>
</template>

<script setup lang="ts">
import AppHeader from './components/AppHeader.vue'
import ControlSidebar from './components/ControlSidebar.vue'
import SpectraChart from './components/SpectraChart.vue'
import ClusterScatter from './components/ClusterScatter.vue'
import MatchResultPanel from './components/MatchResultPanel.vue'
</script>

<style scoped>
.app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  background-color: var(--bg-primary);
  color: var(--text-primary);
  font-family: 'Noto Serif SC', 'Songti SC', serif;
}

.main-layout {
  display: flex;
  flex: 1;
  min-height: 0;
}

.canvas-area {
  display: flex;
  flex: 1;
  min-width: 0;
  gap: 12px;
  padding: 12px;
}
</style>

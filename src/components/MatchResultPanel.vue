<template>
  <div class="result-panel">
    <div class="panel-header">
      <div class="header-left">
        <h3 class="panel-title">
          <span class="icon">📋</span>
          矿物匹配结果
        </h3>
        <div class="result-stats">
          <span v-if="isMatching" class="matching-status">
            <span class="spinner"></span>
            匹配计算中...
          </span>
          <span v-else-if="matchResults.length > 0" class="match-count">
            找到 <strong>{{ matchResults.length }}</strong> 条匹配结果
          </span>
          <span v-else class="no-match">
            上传光谱文件开始匹配
          </span>
        </div>
      </div>
      <div class="header-right">
        <span v-if="matchDuration > 0" class="duration">
          耗时 {{ matchDuration.toFixed(1) }} ms
        </span>
        <button
          class="export-btn"
          :disabled="matchResults.length === 0"
          @click="exportReport"
        >
          📄 导出报告
        </button>
        <button
          class="export-btn secondary"
          :disabled="matchResults.length === 0"
          @click="exportCSV"
        >
          📊 导出 CSV
        </button>
      </div>
    </div>

    <div class="result-table-container">
      <table class="result-table">
        <thead>
          <tr>
            <th class="col-rank">排名</th>
            <th class="col-mineral">矿物名称</th>
            <th class="col-category">类别</th>
            <th class="col-similarity">相似度</th>
            <th class="col-cluster">聚类</th>
            <th class="col-wavelength">波长范围</th>
            <th class="col-action">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="result in displayResults"
            :key="result.spectrum.id"
            :class="{
              selected: result.spectrum.id === selectedSpectrumId,
              hovered: result.spectrum.id === hoveredSpectrumId
            }"
            @mouseenter="onRowHover(result.spectrum.id)"
            @mouseleave="onRowLeave"
            @click="onRowClick(result.spectrum.id)"
          >
            <td class="col-rank">
              <span class="rank-badge" :class="getRankClass(result.rank)">
                {{ result.rank }}
              </span>
            </td>
            <td class="col-mineral">
              <div class="mineral-info">
                <span
                  class="mineral-color"
                  :style="{ backgroundColor: getMineralColor(result.rank) }"
                ></span>
                <span class="mineral-name">{{ result.spectrum.mineralName }}</span>
              </div>
            </td>
            <td class="col-category">
              <span class="category-tag">{{ result.spectrum.mineralCategory }}</span>
            </td>
            <td class="col-similarity">
              <div class="similarity-bar">
                <div
                  class="similarity-fill"
                  :style="{
                    width: (result.similarity * 100).toFixed(1) + '%',
                    backgroundColor: getSimilarityColor(result.similarity)
                  }"
                ></div>
                <span class="similarity-text">
                  {{ (result.similarity * 100).toFixed(2) }}%
                </span>
              </div>
            </td>
            <td class="col-cluster">
              <span class="cluster-tag">聚类 {{ result.clusterLabel + 1 }}</span>
            </td>
            <td class="col-wavelength">
              {{ result.spectrum.wavelengthRange.min.toFixed(0) }} -
              {{ result.spectrum.wavelengthRange.max.toFixed(0) }} cm⁻¹
            </td>
            <td class="col-action">
              <button class="action-btn" @click.stop="viewDetail(result)">
                查看
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="matchResults.length === 0 && !isMatching && !uploadedSpectrum" class="empty-state">
        <div class="empty-icon">🔬</div>
        <p class="empty-text">请上传拉曼光谱文件开始检索</p>
        <p class="empty-hint">支持多种光谱仪导出的 TXT / CSV 格式</p>
      </div>

      <div v-if="matchResults.length === 0 && !isMatching && uploadedSpectrum" class="empty-state">
        <div class="empty-icon">📭</div>
        <p class="empty-text">未找到匹配结果</p>
        <p class="empty-hint">请尝试降低匹配阈值或调整波长区间</p>
      </div>
    </div>

    <div v-if="matchResults.length > 0" class="panel-footer">
      <div class="pagination-info">
        显示 {{ (currentPage - 1) * pageSize + 1 }} - {{ Math.min(currentPage * pageSize, matchResults.length) }} 条，
        共 {{ matchResults.length }} 条
      </div>
      <div class="pagination">
        <button
          class="page-btn"
          :disabled="currentPage === 1"
          @click="currentPage--"
        >
          上一页
        </button>
        <span class="page-info">第 {{ currentPage }} / {{ totalPages }} 页</span>
        <button
          class="page-btn"
          :disabled="currentPage >= totalPages"
          @click="currentPage++"
        >
          下一页
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useSpectrumStore } from '@/composables/useSpectrumStore'
import { exportTool } from '@/utils/exportTool'
import type { MatchResult } from '@/types/spectrum'

const {
  matchResults,
  matchDuration,
  isMatching,
  uploadedSpectrum,
  selectedSpectrumId,
  hoveredSpectrumId,
  filter,
  threshold,
  setHoveredSpectrum,
  setSelectedSpectrum
} = useSpectrumStore()

const pageSize = 10
const currentPage = ref(1)

const totalPages = computed(() => Math.ceil(matchResults.value.length / pageSize))

const displayResults = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  const end = start + pageSize
  return matchResults.value.slice(start, end)
})

const getRankClass = (rank: number) => {
  if (rank <= 3) return `rank-${rank}`
  return ''
}

const getMineralColor = (rank: number) => {
  const colors = [
    '#c2563b',
    '#7fa06f',
    '#5c6a91',
    '#8b6914',
    '#6b5d8a',
    '#4a8b8b',
    '#c4956a',
    '#8b4a6b',
    '#5a7a5a',
    '#a67c52'
  ]
  return colors[(rank - 1) % colors.length]
}

const getSimilarityColor = (sim: number) => {
  if (sim >= 0.9) return '#7fa06f'
  if (sim >= 0.8) return '#d4a84b'
  if (sim >= 0.7) return '#c4956a'
  return '#9c8d7a'
}

const onRowHover = (id: string) => {
  setHoveredSpectrum(id)
}

const onRowLeave = () => {
  setHoveredSpectrum(null)
}

const onRowClick = (id: string) => {
  if (selectedSpectrumId.value === id) {
    setSelectedSpectrum(null)
  } else {
    setSelectedSpectrum(id)
  }
}

const viewDetail = (result: MatchResult) => {
  setSelectedSpectrum(result.spectrum.id)
}

const exportReport = () => {
  const report = exportTool.exportMatchReport(
    matchResults.value,
    uploadedSpectrum.value,
    filter.value,
    threshold.value,
    matchDuration.value
  )
  const timestamp = new Date().toISOString().slice(0, 10)
  exportTool.downloadFile(report, `拉曼光谱匹配报告_${timestamp}.txt`, 'text/plain;charset=utf-8')
}

const exportCSV = () => {
  const csv = exportTool.exportMatchCSV(matchResults.value)
  const timestamp = new Date().toISOString().slice(0, 10)
  exportTool.downloadFile(csv, `匹配结果_${timestamp}.csv`, 'text/csv;charset=utf-8')
}
</script>

<style scoped>
.result-panel {
  height: 280px;
  min-height: 280px;
  display: flex;
  flex-direction: column;
  background: var(--bg-card);
  border-top: 1px solid var(--border-light);
  box-shadow: 0 -2px 8px rgba(61, 52, 41, 0.06);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  border-bottom: 1px solid var(--border-light);
  background: linear-gradient(180deg, var(--bg-secondary) 0%, var(--bg-card) 100%);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.panel-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.panel-title .icon {
  font-size: 16px;
}

.result-stats {
  font-size: 12px;
  color: var(--text-secondary);
}

.match-count strong {
  color: var(--accent-primary);
  font-weight: 600;
  margin: 0 2px;
}

.matching-status {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--accent-amber);
}

.spinner {
  width: 14px;
  height: 14px;
  border: 2px solid var(--accent-amber);
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.no-match {
  color: var(--text-tertiary);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.duration {
  font-size: 11px;
  color: var(--text-tertiary);
  margin-right: 8px;
}

.export-btn {
  padding: 6px 14px;
  font-size: 12px;
  background: var(--accent-primary);
  color: var(--text-inverse);
  border-radius: var(--radius-sm);
  transition: all 0.2s;
}

.export-btn:hover:not(:disabled) {
  background: var(--accent-secondary);
  transform: translateY(-1px);
}

.export-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.export-btn.secondary {
  background: transparent;
  color: var(--accent-primary);
  border: 1px solid var(--accent-primary);
}

.export-btn.secondary:hover:not(:disabled) {
  background: rgba(139, 105, 20, 0.1);
}

.result-table-container {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.result-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.result-table thead {
  position: sticky;
  top: 0;
  background: var(--bg-secondary);
  z-index: 1;
}

.result-table th {
  padding: 10px 16px;
  text-align: left;
  font-weight: 600;
  font-size: 12px;
  color: var(--text-secondary);
  border-bottom: 1px solid var(--border-light);
  white-space: nowrap;
}

.result-table tbody tr {
  border-bottom: 1px solid var(--border-light);
  cursor: pointer;
  transition: background 0.15s;
}

.result-table tbody tr:hover {
  background: rgba(139, 105, 20, 0.05);
}

.result-table tbody tr.selected {
  background: rgba(127, 160, 111, 0.12);
}

.result-table tbody tr.hovered {
  background: rgba(212, 168, 75, 0.1);
}

.result-table td {
  padding: 10px 16px;
  vertical-align: middle;
}

.col-rank {
  width: 60px;
  text-align: center;
}

.rank-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  font-size: 12px;
  font-weight: 600;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
}

.rank-badge.rank-1 {
  background: linear-gradient(135deg, #d4a84b, #c2563b);
  color: #fff;
  box-shadow: 0 2px 6px rgba(212, 168, 75, 0.4);
}

.rank-badge.rank-2 {
  background: linear-gradient(135deg, #a0a8b0, #6b7a8a);
  color: #fff;
  box-shadow: 0 2px 6px rgba(107, 122, 138, 0.3);
}

.rank-badge.rank-3 {
  background: linear-gradient(135deg, #c4956a, #a67c52);
  color: #fff;
  box-shadow: 0 2px 6px rgba(166, 124, 82, 0.3);
}

.mineral-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.mineral-color {
  width: 12px;
  height: 12px;
  border-radius: 3px;
  flex-shrink: 0;
}

.mineral-name {
  font-weight: 500;
  color: var(--text-primary);
}

.category-tag {
  display: inline-block;
  padding: 2px 8px;
  font-size: 11px;
  background: var(--bg-secondary);
  color: var(--text-secondary);
  border-radius: 10px;
  border: 1px solid var(--border-light);
}

.col-similarity {
  width: 180px;
}

.similarity-bar {
  position: relative;
  height: 22px;
  background: var(--bg-secondary);
  border-radius: 4px;
  overflow: hidden;
}

.similarity-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s ease;
}

.similarity-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 11px;
  font-weight: 600;
  color: var(--text-primary);
  text-shadow: 0 1px 2px rgba(255, 255, 255, 0.8);
}

.cluster-tag {
  display: inline-block;
  padding: 2px 8px;
  font-size: 11px;
  background: rgba(92, 106, 145, 0.15);
  color: var(--accent-indigo);
  border-radius: 10px;
}

.col-wavelength {
  font-size: 12px;
  color: var(--text-secondary);
}

.col-action {
  width: 70px;
}

.action-btn {
  padding: 4px 12px;
  font-size: 12px;
  color: var(--accent-primary);
  background: transparent;
  border: 1px solid var(--accent-primary);
  border-radius: 4px;
  transition: all 0.2s;
}

.action-btn:hover {
  background: rgba(139, 105, 20, 0.1);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 40px;
}

.empty-icon {
  font-size: 42px;
  margin-bottom: 12px;
  opacity: 0.6;
}

.empty-text {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.empty-hint {
  font-size: 12px;
  color: var(--text-tertiary);
}

.panel-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 20px;
  border-top: 1px solid var(--border-light);
  background: var(--bg-secondary);
}

.pagination-info {
  font-size: 12px;
  color: var(--text-tertiary);
}

.pagination {
  display: flex;
  align-items: center;
  gap: 12px;
}

.page-btn {
  padding: 4px 12px;
  font-size: 12px;
  color: var(--text-secondary);
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: 4px;
  transition: all 0.2s;
}

.page-btn:hover:not(:disabled) {
  color: var(--accent-primary);
  border-color: var(--accent-primary);
}

.page-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.page-info {
  font-size: 12px;
  color: var(--text-tertiary);
}
</style>

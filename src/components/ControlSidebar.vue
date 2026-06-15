<template>
  <aside class="control-sidebar">
    <div class="panel-section">
      <h3 class="section-title">
        <span class="icon">📂</span>
        光谱文件上传
      </h3>
      <div
        class="upload-area"
        :class="{ 'drag-over': isDragOver, 'has-file': uploadedSpectrum }"
        @click="triggerFileInput"
        @dragover.prevent="isDragOver = true"
        @dragleave="isDragOver = false"
        @drop.prevent="handleDrop"
      >
        <input
          ref="fileInputRef"
          type="file"
          accept=".txt,.csv,.raman,.asc"
          @change="handleFileChange"
          hidden
        />
        <template v-if="!uploadedSpectrum">
          <div class="upload-icon">📊</div>
          <p class="upload-text">点击或拖拽上传</p>
          <p class="upload-hint">支持 TXT / CSV / 拉曼光谱原始数据</p>
        </template>
        <template v-else>
          <div class="file-info">
            <div class="file-icon">📄</div>
            <div class="file-details">
              <p class="file-name">{{ uploadedSpectrum.name }}</p>
              <p class="file-meta">
                {{ uploadedSpectrum.wavelengthRange.min.toFixed(0) }} -
                {{ uploadedSpectrum.wavelengthRange.max.toFixed(0) }} cm⁻¹
              </p>
              <p class="file-meta">{{ uploadedSpectrum.points.length }} 个数据点</p>
            </div>
          </div>
          <button class="clear-btn" @click.stop="clearUpload">
            清除
          </button>
        </template>
      </div>
    </div>

    <div class="panel-section">
      <h3 class="section-title">
        <span class="icon">🎯</span>
        波长区间筛选
      </h3>
      <div class="filter-controls">
        <div class="range-inputs">
          <div class="input-group">
            <label>最小 (cm⁻¹)</label>
            <input
              type="number"
              :value="filter.wavelengthMin"
              @input="onMinChange"
              min="100"
              :max="filter.wavelengthMax - 50"
            />
          </div>
          <div class="input-group">
            <label>最大 (cm⁻¹)</label>
            <input
              type="number"
              :value="filter.wavelengthMax"
              @input="onMaxChange"
              :min="filter.wavelengthMin + 50"
              max="3000"
            />
          </div>
        </div>
        <div class="range-slider">
          <input
            type="range"
            :value="filter.wavelengthMin"
            :min="100"
            :max="filter.wavelengthMax - 50"
            @input="onMinChange"
            class="slider slider-min"
          />
          <input
            type="range"
            :value="filter.wavelengthMax"
            :min="filter.wavelengthMin + 50"
            max="3000"
            @input="onMaxChange"
            class="slider slider-max"
          />
          <div class="slider-track"></div>
        </div>
        <div class="checkbox-group">
          <label class="checkbox-label">
            <input
              type="checkbox"
              :checked="filter.intensityNormalize"
              @change="onNormalizeChange"
            />
            <span class="checkmark"></span>
            强度归一化
          </label>
        </div>
      </div>
    </div>

    <div class="panel-section">
      <h3 class="section-title">
        <span class="icon">📏</span>
        匹配参数
      </h3>
      <div class="param-controls">
        <div class="input-group">
          <div class="label-row">
            <label>匹配阈值</label>
            <span class="value-badge">{{ (threshold * 100).toFixed(0) }}%</span>
          </div>
          <input
            type="range"
            :value="threshold"
            min="0.5"
            max="0.99"
            step="0.01"
            @input="onThresholdChange"
            class="slider"
          />
        </div>
        <div class="input-group">
          <div class="label-row">
            <label>聚类数量</label>
            <span class="value-badge">{{ kClusters }}</span>
          </div>
          <input
            type="range"
            :value="kClusters"
            min="3"
            max="15"
            step="1"
            @input="onKClustersChange"
            class="slider"
          />
        </div>
      </div>
    </div>

    <div class="panel-section history-section">
      <h3 class="section-title">
        <span class="icon">⏱️</span>
        检索历史
        <button v-if="searchHistory.length > 0" class="clear-history" @click="clearHistory">
          清空
        </button>
      </h3>
      <div class="history-list" v-if="searchHistory.length > 0">
        <div
          v-for="item in searchHistory.slice(0, 8)"
          :key="item.id"
          class="history-item"
        >
          <div class="history-info">
            <p class="history-name">{{ item.fileName }}</p>
            <p class="history-meta">
              匹配 {{ item.matchCount }} 条 · 最佳: {{ item.topMatch }}
            </p>
          </div>
          <span class="history-time">{{ formatTime(item.timestamp) }}</span>
        </div>
      </div>
      <div v-else class="empty-history">
        <p>暂无检索记录</p>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useSpectrumStore } from '@/composables/useSpectrumStore'
import { spectrumParser } from '@/utils/spectrumParser'
import type { RamanSpectrum } from '@/types/spectrum'

const {
  uploadedSpectrum,
  filter,
  threshold,
  kClusters,
  searchHistory,
  setUploadedSpectrum,
  updateFilter,
  updateThreshold,
  updateKClusters,
  clearHistory,
  clearUpload
} = useSpectrumStore()

const fileInputRef = ref<HTMLInputElement | null>(null)
const isDragOver = ref(false)

const triggerFileInput = () => {
  fileInputRef.value?.click()
}

const handleFileChange = (e: Event) => {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) {
    parseFile(file)
  }
}

const handleDrop = (e: DragEvent) => {
  isDragOver.value = false
  const file = e.dataTransfer?.files?.[0]
  if (file) {
    parseFile(file)
  }
}

const parseFile = async (file: File) => {
  try {
    const text = await file.text()
    const parsed = spectrumParser.parse(text)

    const spectrum: RamanSpectrum = {
      id: 'uploaded_' + Date.now(),
      name: file.name.replace(/\.[^/.]+$/, ''),
      mineralName: '未知样本',
      mineralCategory: '待识别',
      points: parsed.points,
      wavelengthRange: parsed.wavelengthRange,
      metadata: {
        format: parsed.format,
        ...parsed.metadata
      }
    }

    setUploadedSpectrum(spectrum)
  } catch (error) {
    console.error('Failed to parse spectrum file:', error)
    alert('文件解析失败，请检查文件格式')
  }
}

const onMinChange = (e: Event) => {
  const val = parseFloat((e.target as HTMLInputElement).value)
  if (!isNaN(val)) {
    updateFilter({ wavelengthMin: val })
  }
}

const onMaxChange = (e: Event) => {
  const val = parseFloat((e.target as HTMLInputElement).value)
  if (!isNaN(val)) {
    updateFilter({ wavelengthMax: val })
  }
}

const onNormalizeChange = (e: Event) => {
  const checked = (e.target as HTMLInputElement).checked
  updateFilter({ intensityNormalize: checked })
}

const onThresholdChange = (e: Event) => {
  const val = parseFloat((e.target as HTMLInputElement).value)
  if (!isNaN(val)) {
    updateThreshold(val)
  }
}

const onKClustersChange = (e: Event) => {
  const val = parseInt((e.target as HTMLInputElement).value)
  if (!isNaN(val)) {
    updateKClusters(val)
  }
}

const formatTime = (timestamp: number) => {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  return `${Math.floor(diff / 86400000)}天前`
}
</script>

<style scoped>
.control-sidebar {
  width: 280px;
  min-width: 280px;
  height: 100%;
  background: var(--bg-card);
  border-right: 1px solid var(--border-light);
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.panel-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border-light);
}

.section-title .icon {
  font-size: 16px;
}

.section-title .clear-history {
  margin-left: auto;
  font-size: 11px;
  color: var(--text-tertiary);
  padding: 2px 8px;
  border-radius: 4px;
  background: transparent;
  transition: all 0.2s;
}

.section-title .clear-history:hover {
  color: var(--accent-terracotta);
  background: rgba(194, 86, 59, 0.1);
}

.upload-area {
  border: 2px dashed var(--border-medium);
  border-radius: var(--radius-md);
  padding: 24px 16px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  background: var(--bg-secondary);
}

.upload-area:hover {
  border-color: var(--accent-primary);
  background: rgba(139, 105, 20, 0.05);
}

.upload-area.drag-over {
  border-color: var(--accent-celadon);
  background: rgba(127, 160, 111, 0.1);
}

.upload-area.has-file {
  cursor: default;
  border-style: solid;
  border-color: var(--border-light);
  padding: 16px;
}

.upload-icon {
  font-size: 36px;
  margin-bottom: 8px;
}

.upload-text {
  font-size: 14px;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.upload-hint {
  font-size: 11px;
  color: var(--text-tertiary);
}

.file-info {
  display: flex;
  align-items: center;
  gap: 12px;
  text-align: left;
}

.file-icon {
  font-size: 28px;
}

.file-details {
  flex: 1;
  min-width: 0;
}

.file-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-meta {
  font-size: 11px;
  color: var(--text-tertiary);
  margin-top: 2px;
}

.clear-btn {
  margin-top: 12px;
  padding: 6px 16px;
  font-size: 12px;
  color: var(--accent-terracotta);
  background: rgba(194, 86, 59, 0.1);
  border-radius: 4px;
  transition: all 0.2s;
}

.clear-btn:hover {
  background: rgba(194, 86, 59, 0.2);
}

.filter-controls {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.range-inputs {
  display: flex;
  gap: 10px;
}

.input-group {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.input-group label {
  font-size: 11px;
  color: var(--text-secondary);
}

.label-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.value-badge {
  font-size: 12px;
  font-weight: 600;
  color: var(--accent-primary);
  background: rgba(139, 105, 20, 0.1);
  padding: 2px 8px;
  border-radius: 10px;
}

input[type='number'] {
  width: 100%;
  padding: 8px 10px;
  font-size: 13px;
  border: 1px solid var(--border-light);
  border-radius: var(--radius-sm);
  background: var(--bg-primary);
  color: var(--text-primary);
  transition: border-color 0.2s;
}

input[type='number']:focus {
  border-color: var(--accent-primary);
  outline: none;
}

.range-slider {
  position: relative;
  height: 6px;
}

.slider {
  position: absolute;
  width: 100%;
  height: 6px;
  -webkit-appearance: none;
  appearance: none;
  background: transparent;
  pointer-events: none;
}

.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--accent-primary);
  cursor: pointer;
  pointer-events: auto;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
  transition: transform 0.2s;
}

.slider::-webkit-slider-thumb:hover {
  transform: scale(1.15);
}

.slider::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--accent-primary);
  cursor: pointer;
  pointer-events: auto;
  border: none;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
}

.slider-track {
  position: absolute;
  top: 50%;
  left: 0;
  transform: translateY(-50%);
  width: 100%;
  height: 4px;
  background: var(--bg-tertiary);
  border-radius: 2px;
}

.checkbox-group {
  margin-top: 4px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  font-size: 13px;
  color: var(--text-secondary);
  user-select: none;
}

.checkbox-label input {
  display: none;
}

.checkmark {
  width: 18px;
  height: 18px;
  border: 2px solid var(--border-medium);
  border-radius: 4px;
  position: relative;
  transition: all 0.2s;
}

.checkbox-label input:checked + .checkmark {
  background: var(--accent-primary);
  border-color: var(--accent-primary);
}

.checkbox-label input:checked + .checkmark::after {
  content: '';
  position: absolute;
  left: 5px;
  top: 1px;
  width: 5px;
  height: 10px;
  border: solid var(--bg-primary);
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

.param-controls {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.history-section {
  margin-top: auto;
  min-height: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
}

.history-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
  padding: 10px;
  background: var(--bg-secondary);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.2s;
}

.history-item:hover {
  background: var(--bg-tertiary);
}

.history-info {
  flex: 1;
  min-width: 0;
}

.history-name {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.history-meta {
  font-size: 11px;
  color: var(--text-tertiary);
  margin-top: 3px;
}

.history-time {
  font-size: 11px;
  color: var(--text-tertiary);
  white-space: nowrap;
}

.empty-history {
  padding: 20px;
  text-align: center;
  color: var(--text-tertiary);
  font-size: 12px;
}
</style>

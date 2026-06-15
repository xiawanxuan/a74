<template>
  <div class="heatmap-container">
    <div class="chart-header">
      <h3 class="chart-title">颜料光谱差值热力图</h3>
      <div class="chart-info">
        <span v-if="heatmapData" class="info-badge">
          {{ heatmapData.rows.length }} 种矿物 × {{ heatmapData.bins.length }} 波长分箱
        </span>
      </div>
    </div>
    <div ref="chartRef" class="chart-canvas"></div>
    <div class="color-scale-bar">
      <span class="scale-label">负差值 (待测 &lt; 标准)</span>
      <div ref="scaleRef" class="scale-gradient"></div>
      <span class="scale-label">正差值 (待测 &gt; 标准)</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import * as d3 from 'd3'
import { useSpectrumStore } from '@/composables/useSpectrumStore'
import { themeColors } from '@/config/theme'

const chartRef = ref<HTMLDivElement | null>(null)
const scaleRef = ref<HTMLDivElement | null>(null)

const { heatmapData, hoveredSpectrumId } = useSpectrumStore()

const margin = { top: 10, right: 10, bottom: 40, left: 90 }
let resizeObserver: ResizeObserver | null = null

const drawHeatmap = () => {
  if (!chartRef.value) return

  const container = chartRef.value
  d3.select(container).selectAll('svg').remove()

  if (!heatmapData.value || heatmapData.value.rows.length === 0) {
    drawEmpty(container)
    return
  }

  const data = heatmapData.value
  const numCols = data.bins.length
  const numRows = data.rows.length

  const containerWidth = container.clientWidth
  const containerHeight = container.clientHeight
  const width = containerWidth - margin.left - margin.right
  const height = containerHeight - margin.top - margin.bottom

  const cellWidth = Math.max(1, width / numCols)
  const cellHeight = Math.max(8, Math.min(24, height / numRows))

  const actualHeight = cellHeight * numRows

  const svg = d3
    .select(container)
    .append('svg')
    .attr('width', containerWidth)
    .attr('height', Math.max(containerHeight, actualHeight + margin.top + margin.bottom))

  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`)

  const diffColorScale = d3
    .scaleSequential<string>()
    .interpolator(d3.interpolateRdYlBu)
    .domain([-data.maxAbsDiff, data.maxAbsDiff])

  const xScale = d3.scaleBand<number>().domain(data.bins.map((_, i) => i)).range([0, width])

  const yScale = d3
    .scaleBand<string>()
    .domain(data.rows.map((r) => r.mineralName))
    .range([0, actualHeight])

  const tooltip = d3
    .select(container.parentElement!)
    .append('div')
    .attr('class', 'heatmap-tooltip')
    .style('position', 'absolute')
    .style('visibility', 'hidden')
    .style('background', themeColors.chart.tooltipBg)
    .style('color', themeColors.text.inverse)
    .style('padding', '6px 10px')
    .style('border-radius', '4px')
    .style('font-size', '11px')
    .style('pointer-events', 'none')
    .style('z-index', '20')

  const rows = g.selectAll<SVGGElement, typeof data.rows[0]>('g.row').data(data.rows).join('g').attr('class', 'row').attr('transform', (d) => `translate(0,${yScale(d.mineralName)})`)

  rows
    .selectAll('rect.cell')
    .data((d) => d.diffs.map((val, i) => ({ val, col: i, mineralName: d.mineralName, wavelength: data.bins[i] })))
    .join('rect')
    .attr('class', 'cell')
    .attr('x', (d) => xScale(d.col)!)
    .attr('y', 0)
    .attr('width', cellWidth)
    .attr('height', cellHeight - 1)
    .attr('fill', (d) => diffColorScale(d.val))
    .attr('opacity', (d) => {
      if (!hoveredSpectrumId.value) return 0.9
      const row = data.rows.find((r) => r.spectrumId === hoveredSpectrumId.value)
      return row && row.mineralName === d.mineralName ? 1 : 0.3
    })
    .on('mouseenter', (_event, d) => {
      tooltip
        .style('visibility', 'visible')
        .html(
          `<strong>${d.mineralName}</strong><br/>` +
            `波长: ${d.wavelength.toFixed(1)} cm⁻¹<br/>` +
            `差值: ${d.val >= 0 ? '+' : ''}${d.val.toFixed(4)}`
        )
    })
    .on('mousemove', (event) => {
      tooltip
        .style('top', `${event.offsetY - 60}px`)
        .style('left', `${event.offsetX + 12}px`)
    })
    .on('mouseleave', () => {
      tooltip.style('visibility', 'hidden')
    })

  const yAxis = d3
    .axisLeft(yScale)
    .tickSize(0)
    .tickFormat((d) => d)

  g.append('g')
    .attr('class', 'y-axis')
    .call(yAxis as any)
    .selectAll('text')
    .attr('fill', themeColors.text.secondary)
    .attr('font-size', '11px')
    .attr('font-family', "'Noto Serif SC', 'Songti SC', serif")

  g.select('.y-axis').select('.domain').attr('stroke', themeColors.border.light)

  const xAxisTickValues = data.bins.filter((_, i) => i % Math.max(1, Math.floor(numCols / 10)) === 0)
  const xAxis = d3
    .axisBottom(xScale)
    .tickValues(xAxisTickValues.map((_, i) => Math.floor(numCols / 10) * i).filter((v) => v < numCols))
    .tickFormat((d) => `${data.bins[d as number].toFixed(0)}`)
    .tickSize(4)

  g.append('g')
    .attr('class', 'x-axis')
    .attr('transform', `translate(0,${actualHeight})`)
    .call(xAxis as any)
    .selectAll('text')
    .attr('fill', themeColors.text.tertiary)
    .attr('font-size', '10px')
    .attr('transform', 'rotate(-30)')
    .attr('text-anchor', 'end')

  g.select('.x-axis').select('.domain').attr('stroke', themeColors.border.light)

  drawColorScale(data.maxAbsDiff)
}

const drawEmpty = (container: HTMLDivElement) => {
  const svg = d3
    .select(container)
    .append('svg')
    .attr('width', container.clientWidth)
    .attr('height', container.clientHeight)

  svg
    .append('text')
    .attr('x', container.clientWidth / 2)
    .attr('y', container.clientHeight / 2)
    .attr('text-anchor', 'middle')
    .attr('fill', themeColors.text.tertiary)
    .attr('font-size', '14px')
    .attr('font-family', "'Noto Serif SC', 'Songti SC', serif")
    .text('上传光谱文件后显示差值热力图')
}

const drawColorScale = (maxAbsDiff: number) => {
  if (!scaleRef.value) return

  const scaleEl = scaleRef.value
  scaleEl.innerHTML = ''

  const canvas = document.createElement('canvas')
  canvas.width = 200
  canvas.height = 16
  scaleEl.appendChild(canvas)

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const grad = ctx.createLinearGradient(0, 0, 200, 0)
  const diffColorScale = d3
    .scaleSequential<string>()
    .interpolator(d3.interpolateRdYlBu)
    .domain([-maxAbsDiff, maxAbsDiff])

  for (let i = 0; i <= 10; i++) {
    const t = i / 10
    const val = -maxAbsDiff + t * 2 * maxAbsDiff
    grad.addColorStop(t, diffColorScale(val))
  }

  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 200, 16)
}

const handleResize = () => {
  drawHeatmap()
}

onMounted(() => {
  drawHeatmap()
  if (chartRef.value) {
    resizeObserver = new ResizeObserver(handleResize)
    resizeObserver.observe(chartRef.value)
  }
})

onUnmounted(() => {
  if (resizeObserver && chartRef.value) {
    resizeObserver.unobserve(chartRef.value)
  }
})

watch([heatmapData, hoveredSpectrumId], () => {
  drawHeatmap()
}, { deep: true })
</script>

<style scoped>
.heatmap-container {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-light);
  background: linear-gradient(180deg, var(--bg-secondary) 0%, var(--bg-card) 100%);
}

.chart-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.chart-info {
  font-size: 12px;
  color: var(--text-secondary);
}

.info-badge {
  background: rgba(92, 106, 145, 0.12);
  color: var(--accent-indigo);
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
}

.chart-canvas {
  flex: 1;
  min-height: 0;
  overflow: auto;
  position: relative;
}

.color-scale-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 8px 16px 10px;
  border-top: 1px solid var(--border-light);
  background: var(--bg-secondary);
}

.scale-label {
  font-size: 10px;
  color: var(--text-tertiary);
  white-space: nowrap;
}

.scale-gradient {
  width: 200px;
  height: 16px;
  border-radius: 3px;
  border: 1px solid var(--border-light);
  overflow: hidden;
}

.scale-gradient canvas {
  display: block;
  width: 100%;
  height: 100%;
}
</style>

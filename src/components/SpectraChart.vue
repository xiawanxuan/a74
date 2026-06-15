<template>
  <div class="spectra-chart-container">
    <div class="chart-header">
      <h3 class="chart-title">拉曼光谱曲线对比</h3>
      <div class="chart-legend">
        <span v-if="uploadedSpectrum" class="legend-item uploaded">
          <span class="legend-line"></span>
          上传样本
        </span>
        <span v-if="highlightedSpectra.selected" class="legend-item selected">
          <span class="legend-line"></span>
          选中匹配
        </span>
        <span v-if="matchResults.length > 0" class="legend-count">
          显示 {{ displayCount }} 条匹配
        </span>
      </div>
    </div>
    <div ref="chartRef" class="chart-canvas"></div>
    <div class="chart-footer">
      <div class="axis-label x-label">拉曼位移 (cm⁻¹)</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import * as d3 from 'd3'
import type { RamanSpectrum } from '@/types/spectrum'
import { useSpectrumStore } from '@/composables/useSpectrumStore'
import { themeColors } from '@/config/theme'
import { eventBus, EVENTS } from '@/utils/eventBus'

const chartRef = ref<HTMLDivElement | null>(null)
let svg: d3.Selection<SVGGElement, unknown, null, undefined> | null = null
let xScale: d3.ScaleLinear<number, number> | null = null
let yScale: d3.ScaleLinear<number, number> | null = null
let zoomBehavior: d3.ZoomBehavior<SVGSVGElement, unknown> | null = null
let gZoom: d3.Selection<SVGGElement, unknown, null, undefined> | null = null

const {
  uploadedSpectrum,
  matchResults,
  filter,
  highlightedSpectra
} = useSpectrumStore()

const displayCount = computed(() => Math.min(matchResults.value.length, 10))

const margin = { top: 20, right: 30, bottom: 40, left: 55 }
let width = 0
let height = 0

const initChart = () => {
  if (!chartRef.value) return

  const container = chartRef.value
  width = container.clientWidth - margin.left - margin.right
  height = container.clientHeight - margin.top - margin.bottom

  d3.select(container).selectAll('svg').remove()

  const svgElement = d3
    .select(container)
    .append('svg')
    .attr('width', container.clientWidth)
    .attr('height', container.clientHeight)

  svg = svgElement.append('g').attr('transform', `translate(${margin.left},${margin.top})`)

  xScale = d3.scaleLinear().range([0, width])

  yScale = d3.scaleLinear().range([height, 0])

  gZoom = svg.append('g').attr('class', 'zoom-layer')

  zoomBehavior = d3
    .zoom<SVGSVGElement, unknown>()
    .scaleExtent([0.5, 10])
    .on('zoom', (event) => {
      if (gZoom && xScale && yScale) {
        const newX = event.transform.rescaleX(xScale)
        const newY = event.transform.rescaleY(yScale)
        updateAxes(newX, newY)
        gZoom.attr('transform', event.transform.toString())
      }
    })

  svgElement.call(zoomBehavior)

  gZoom.append('g').attr('class', 'grid-layer')
  gZoom.append('g').attr('class', 'spectra-layer')
  gZoom.append('g').attr('class', 'highlight-layer')
  svg.append('g').attr('class', 'x-axis').attr('transform', `translate(0,${height})`)
  svg.append('g').attr('class', 'y-axis')

  updateAxes(xScale, yScale)
  drawSpectra()
}

const updateAxes = (
  x: d3.ScaleLinear<number, number>,
  y: d3.ScaleLinear<number, number>
) => {
  if (!svg || !x || !y) return

  const xAxis = d3
    .axisBottom(x)
    .ticks(8)
    .tickSize(-height)
    .tickFormat((d) => d3.format(',')(d))

  const yAxis = d3.axisLeft(y).ticks(6).tickSize(-width)

  const xAxisG = svg.select('.x-axis')
  const yAxisG = svg.select('.y-axis')

  xAxisG.call(xAxis as any)
  yAxisG.call(yAxis as any)

  xAxisG
    .selectAll('line')
    .attr('stroke', themeColors.chart.grid)
    .attr('stroke-dasharray', '3,3')

  xAxisG.select('.domain').attr('stroke', themeColors.chart.axis)

  xAxisG
    .selectAll('text')
    .attr('fill', themeColors.text.tertiary)
    .attr('font-size', '11px')

  yAxisG
    .selectAll('line')
    .attr('stroke', themeColors.chart.grid)
    .attr('stroke-dasharray', '3,3')

  yAxisG.select('.domain').attr('stroke', themeColors.chart.axis)

  yAxisG
    .selectAll('text')
    .attr('fill', themeColors.text.tertiary)
    .attr('font-size', '11px')
}

const drawSpectra = () => {
  if (!gZoom || !xScale || !yScale || !svg) return

  const spectraToShow: { spectrum: RamanSpectrum; color: string; opacity: number; width: number }[] = []

  const topMatches = matchResults.value.slice(0, 10)
  topMatches.forEach((result, index) => {
    spectraToShow.push({
      spectrum: result.spectrum,
      color: d3.schemeTableau10[index % 10],
      opacity: 0.35,
      width: 1.5
    })
  })

  if (highlightedSpectra.value.hovered) {
    spectraToShow.push({
      spectrum: highlightedSpectra.value.hovered.spectrum,
      color: themeColors.chart.highlight,
      opacity: 0.9,
      width: 2.5
    })
  }

  if (highlightedSpectra.value.selected) {
    spectraToShow.push({
      spectrum: highlightedSpectra.value.selected.spectrum,
      color: themeColors.accent.celadon,
      opacity: 0.95,
      width: 3
    })
  }

  if (uploadedSpectrum.value) {
    spectraToShow.push({
      spectrum: uploadedSpectrum.value,
      color: themeColors.chart.uploaded,
      opacity: 1,
      width: 2.5
    })
  }

  let xMin = filter.value.wavelengthMin
  let xMax = filter.value.wavelengthMax
  let yMax = 0

  spectraToShow.forEach(({ spectrum }) => {
    const filtered = spectrum.points.filter(
      (p) => p.wavelength >= xMin && p.wavelength <= xMax
    )
    if (filtered.length > 0) {
      const max = d3.max(filtered, (d) => d.intensity) || 0
      if (max > yMax) yMax = max
    }
  })

  if (yMax === 0) yMax = 1

  xScale.domain([xMin, xMax])
  yScale.domain([0, yMax * 1.1])

  const line = d3
    .line<{ wavelength: number; intensity: number }>()
    .x((d) => xScale!(d.wavelength))
    .y((d) => yScale!(d.intensity))
    .curve(d3.curveMonotoneX)

  const spectraLayer = gZoom.select('.spectra-layer')
  const highlightLayer = gZoom.select('.highlight-layer')

  const normalSpectra = spectraToShow.filter((s) => s.width < 2.5)
  const highlightSpectra = spectraToShow.filter((s) => s.width >= 2.5)

  const paths = spectraLayer.selectAll<SVGPathElement, typeof normalSpectra[0]>('path.spectrum').data(normalSpectra, (d: any) => d.spectrum.id)

  paths.exit().remove()

  paths
    .enter()
    .append('path')
    .attr('class', 'spectrum')
    .attr('fill', 'none')
    .attr('stroke-linecap', 'round')
    .attr('stroke-linejoin', 'round')
    .merge(paths)
    .attr('d', (d) => line(d.spectrum.points))
    .attr('stroke', (d) => d.color)
    .attr('stroke-opacity', (d) => d.opacity)
    .attr('stroke-width', (d) => d.width)

  const hPaths = highlightLayer
    .selectAll<SVGPathElement, typeof highlightSpectra[0]>('path.spectrum-highlight')
    .data(highlightSpectra, (d: any) => d.spectrum.id)

  hPaths.exit().remove()

  hPaths
    .enter()
    .append('path')
    .attr('class', 'spectrum-highlight')
    .attr('fill', 'none')
    .attr('stroke-linecap', 'round')
    .attr('stroke-linejoin', 'round')
    .merge(hPaths)
    .attr('d', (d) => line(d.spectrum.points))
    .attr('stroke', (d) => d.color)
    .attr('stroke-opacity', (d) => d.opacity)
    .attr('stroke-width', (d) => d.width)

  updateAxes(xScale, yScale)
}

const handleResize = () => {
  initChart()
}

let resizeObserver: ResizeObserver | null = null
let hoverUnsub: (() => void) | null = null
let selectUnsub: (() => void) | null = null

onMounted(() => {
  initChart()
  if (chartRef.value) {
    resizeObserver = new ResizeObserver(handleResize)
    resizeObserver.observe(chartRef.value)
  }
  hoverUnsub = eventBus.on(EVENTS.SPECTRUM_HOVERED, () => {
    drawSpectra()
  })
  selectUnsub = eventBus.on(EVENTS.SPECTRUM_SELECTED, () => {
    drawSpectra()
  })
})

onUnmounted(() => {
  if (resizeObserver && chartRef.value) {
    resizeObserver.unobserve(chartRef.value)
  }
  if (hoverUnsub) hoverUnsub()
  if (selectUnsub) selectUnsub()
})

watch(
  [uploadedSpectrum, matchResults, filter, () => highlightedSpectra.value],
  () => {
    drawSpectra()
  },
  { deep: true }
)
</script>

<style scoped>
.spectra-chart-container {
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

.chart-legend {
  display: flex;
  align-items: center;
  gap: 14px;
  font-size: 12px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--text-secondary);
}

.legend-line {
  width: 20px;
  height: 3px;
  border-radius: 2px;
}

.legend-item.uploaded .legend-line {
  background: var(--chart-uploaded);
}

.legend-item.selected .legend-line {
  background: var(--accent-celadon);
}

.legend-count {
  color: var(--text-tertiary);
  font-size: 11px;
}

.chart-canvas {
  flex: 1;
  min-height: 0;
  position: relative;
  cursor: grab;
}

.chart-canvas:active {
  cursor: grabbing;
}

.chart-footer {
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.axis-label {
  font-size: 11px;
  color: var(--text-tertiary);
}
</style>

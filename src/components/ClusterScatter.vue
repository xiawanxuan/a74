<template>
  <div class="cluster-scatter-container">
    <div class="chart-header">
      <h3 class="chart-title">聚类分布散点图</h3>
      <div class="chart-info">
        <span class="cluster-count">{{ kClusters }} 个聚类</span>
      </div>
    </div>
    <div ref="chartRef" class="chart-canvas"></div>
    <div class="chart-legend">
      <div
        v-for="(color, idx) in clusterColors"
        :key="idx"
        class="legend-item"
        @mouseenter="onLegendHover(idx)"
        @mouseleave="onLegendLeave"
      >
        <span class="legend-dot" :style="{ backgroundColor: color }"></span>
        <span class="legend-label">聚类 {{ idx + 1 }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import * as d3 from 'd3'
import { useSpectrumStore } from '@/composables/useSpectrumStore'
import { themeColors } from '@/config/theme'

const chartRef = ref<HTMLDivElement | null>(null)
let svg: d3.Selection<SVGGElement, unknown, null, undefined> | null = null
let xScale: d3.ScaleLinear<number, number> | null = null
let yScale: d3.ScaleLinear<number, number> | null = null
let zoomBehavior: d3.ZoomBehavior<SVGSVGElement, unknown> | null = null
let gZoom: d3.Selection<SVGGElement, unknown, null, undefined> | null = null

const {
  clusterPoints,
  uploadedClusterPoint,
  kClusters,
  setHoveredSpectrum,
  setSelectedSpectrum,
  hoveredSpectrumId
} = useSpectrumStore()

const clusterColors = computed(() => {
  const count = kClusters.value
  const colors: string[] = []
  for (let i = 0; i < count; i++) {
    const hue = (i * 360) / count
    colors.push(d3.hsl(hue, 0.55, 0.55).toString())
  }
  return colors
})

const margin = { top: 15, right: 15, bottom: 25, left: 35 }
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
    .scaleExtent([0.5, 8])
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
  gZoom.append('g').attr('class', 'points-layer')
  gZoom.append('g').attr('class', 'highlight-layer')
  svg.append('g').attr('class', 'x-axis').attr('transform', `translate(0,${height})`)
  svg.append('g').attr('class', 'y-axis')

  updateScales()
  drawPoints()
}

const updateScales = () => {
  if (!clusterPoints.value.length || !xScale || !yScale) return

  const points = clusterPoints.value
  const xs = points.map((p) => p.x)
  const ys = points.map((p) => p.y)

  let xMin = Math.min(...xs)
  let xMax = Math.max(...xs)
  let yMin = Math.min(...ys)
  let yMax = Math.max(...ys)

  const xPadding = (xMax - xMin) * 0.1 || 1
  const yPadding = (yMax - yMin) * 0.1 || 1

  xScale.domain([xMin - xPadding, xMax + xPadding])
  yScale.domain([yMin - yPadding, yMax + yPadding])
}

const updateAxes = (
  x: d3.ScaleLinear<number, number>,
  y: d3.ScaleLinear<number, number>
) => {
  if (!svg) return

  const xAxis = d3.axisBottom(x).ticks(5).tickSize(-height)
  const yAxis = d3.axisLeft(y).ticks(5).tickSize(-width)

  const xAxisG = svg.select('.x-axis')
  const yAxisG = svg.select('.y-axis')

  xAxisG.call(xAxis as any)
  yAxisG.call(yAxis as any)

  xAxisG
    .selectAll('line')
    .attr('stroke', themeColors.chart.grid)
    .attr('stroke-dasharray', '2,2')

  xAxisG.select('.domain').attr('stroke', themeColors.chart.axis)

  xAxisG
    .selectAll('text')
    .attr('fill', themeColors.text.tertiary)
    .attr('font-size', '10px')

  yAxisG
    .selectAll('line')
    .attr('stroke', themeColors.chart.grid)
    .attr('stroke-dasharray', '2,2')

  yAxisG.select('.domain').attr('stroke', themeColors.chart.axis)

  yAxisG
    .selectAll('text')
    .attr('fill', themeColors.text.tertiary)
    .attr('font-size', '10px')
}

const drawPoints = () => {
  if (!gZoom || !xScale || !yScale || !svg) return

  updateScales()

  const pointsLayer = gZoom.select('.points-layer')
  const highlightLayer = gZoom.select('.highlight-layer')

  const data = clusterPoints.value

  const points = pointsLayer.selectAll<SVGCircleElement, typeof data[0]>('circle.point').data(data, (d: any) => d.id)

  points.exit().remove()

  points
    .enter()
    .append('circle')
    .attr('class', 'point')
    .attr('cx', (d) => xScale!(d.x))
    .attr('cy', (d) => yScale!(d.y))
    .attr('r', 3)
    .attr('fill-opacity', 0.6)
    .attr('stroke-width', 0)
    .style('cursor', 'pointer')
    .on('mouseenter', (_event, d) => {
      setHoveredSpectrum(d.id)
    })
    .on('mouseleave', () => {
      setHoveredSpectrum(null)
    })
    .on('click', (_event, d) => {
      setSelectedSpectrum(d.id)
    })
    .merge(points)
    .attr('cx', (d) => xScale!(d.x))
    .attr('cy', (d) => yScale!(d.y))
    .attr('fill', (d) => clusterColors.value[d.clusterLabel % clusterColors.value.length])
    .attr('r', (d) => (d.id === hoveredSpectrumId.value ? 6 : 3))
    .attr('fill-opacity', (d) => {
      if (d.id === hoveredSpectrumId.value) return 1
      return 0.6
    })

  if (uploadedClusterPoint.value) {
    const uploaded = highlightLayer
      .selectAll<SVGCircleElement, typeof uploadedClusterPoint.value>('circle.uploaded-point')
      .data([uploadedClusterPoint.value])

    uploaded.exit().remove()

    uploaded
      .enter()
      .append('circle')
      .attr('class', 'uploaded-point')
      .attr('cx', (d) => xScale!(d.x))
      .attr('cy', (d) => yScale!(d.y))
      .attr('r', 8)
      .attr('fill', themeColors.chart.uploaded)
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .attr('fill-opacity', 1)
      .merge(uploaded)
      .attr('cx', (d) => xScale!(d.x))
      .attr('cy', (d) => yScale!(d.y))
  } else {
    highlightLayer.selectAll('circle.uploaded-point').remove()
  }

  updateAxes(xScale, yScale)
}

const onLegendHover = (idx: number) => {
  if (!gZoom) return
  gZoom
    .selectAll('circle.point')
    .attr('fill-opacity', (d: any) => (d.clusterLabel === idx ? 1 : 0.2))
}

const onLegendLeave = () => {
  if (!gZoom) return
  gZoom.selectAll('circle.point').attr('fill-opacity', 0.6)
}

const handleResize = () => {
  initChart()
}

let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  initChart()
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

watch(
  [clusterPoints, uploadedClusterPoint, kClusters, hoveredSpectrumId],
  () => {
    drawPoints()
  },
  { deep: true }
)
</script>

<style scoped>
.cluster-scatter-container {
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

.cluster-count {
  background: rgba(139, 105, 20, 0.1);
  color: var(--accent-primary);
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
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

.chart-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 8px 16px 12px;
  border-top: 1px solid var(--border-light);
  background: var(--bg-secondary);
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
  transition: background 0.2s;
}

.legend-item:hover {
  background: var(--bg-tertiary);
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.legend-label {
  font-size: 11px;
  color: var(--text-secondary);
}
</style>

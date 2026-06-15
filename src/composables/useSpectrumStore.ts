import { ref, computed } from 'vue'
import type {
  RamanSpectrum,
  SpectrumFilter,
  MatchResult,
  ClusterPoint,
  SearchHistoryItem,
  AppSettings,
  HeatmapDiffData
} from '@/types/spectrum'
import { spectrumMatcher } from '@/utils/spectrumMatcher'
import { generateSpectraLibrary } from '@/data/mineralTemplates'
import { localStorageCache } from '@/utils/localStorageCache'
import { eventBus, EVENTS } from '@/utils/eventBus'
import { computeSpectralDiffs } from '@/utils/heatmapDiff'

const librarySpectra = ref<RamanSpectrum[]>([])
const uploadedSpectrum = ref<RamanSpectrum | null>(null)
const matchResults = ref<MatchResult[]>([])
const clusterPoints = ref<ClusterPoint[]>([])
const uploadedClusterPoint = ref<ClusterPoint | null>(null)
const isMatching = ref(false)
const matchDuration = ref(0)
const selectedSpectrumId = ref<string | null>(null)
const hoveredSpectrumId = ref<string | null>(null)
const heatmapData = ref<HeatmapDiffData | null>(null)

const settings = ref<AppSettings>(localStorageCache.loadSettings())
const searchHistory = ref<SearchHistoryItem[]>(localStorageCache.loadSearchHistory())

const filter = computed(() => settings.value.filter)
const threshold = computed(() => settings.value.threshold)
const kClusters = computed(() => settings.value.kClusters)

let libraryLoaded = false

export function useSpectrumStore() {
  const initLibrary = async () => {
    if (libraryLoaded) return

    const cached = localStorageCache.loadSpectraIndex()
    if (cached && cached.length >= 1500) {
      librarySpectra.value = cached
      spectrumMatcher.setLibrary(cached)
      libraryLoaded = true
      return
    }

    const generated = generateSpectraLibrary(1500)
    librarySpectra.value = generated as unknown as RamanSpectrum[]
    spectrumMatcher.setLibrary(generated as unknown as RamanSpectrum[])
    localStorageCache.saveSpectraIndex(generated as unknown as RamanSpectrum[])
    libraryLoaded = true
  }

  const setUploadedSpectrum = (spectrum: RamanSpectrum | null) => {
    uploadedSpectrum.value = spectrum
    if (spectrum) {
      eventBus.emit(EVENTS.SPECTRUM_UPLOADED, spectrum)
      runMatching()
    } else {
      matchResults.value = []
      clusterPoints.value = []
      uploadedClusterPoint.value = null
      heatmapData.value = null
      eventBus.emit(EVENTS.SPECTRUM_CLEARED)
    }
  }

  const runMatching = async () => {
    if (!uploadedSpectrum.value || librarySpectra.value.length === 0) return

    isMatching.value = true

    await new Promise((resolve) => requestAnimationFrame(resolve))

    const result = spectrumMatcher.match(uploadedSpectrum.value, {
      threshold: threshold.value,
      kClusters: kClusters.value,
      filter: filter.value,
      numBins: 100
    })

    matchResults.value = result.results
    clusterPoints.value = result.clusterPoints
    matchDuration.value = result.duration

    const { uploadedPoint } = spectrumMatcher.getClusterPoints(
      uploadedSpectrum.value,
      filter.value,
      100
    )
    uploadedClusterPoint.value = uploadedPoint

    if (matchResults.value.length > 0) {
      const historyItem: SearchHistoryItem = {
        id: `hist_${Date.now()}`,
        timestamp: Date.now(),
        fileName: uploadedSpectrum.value.name,
        matchCount: matchResults.value.length,
        topMatch: matchResults.value[0].spectrum.mineralName,
        filter: { ...filter.value },
        threshold: threshold.value
      }
      searchHistory.value = localStorageCache.addHistoryItem(historyItem)
      eventBus.emit(EVENTS.HISTORY_UPDATED, searchHistory.value)
    }

    isMatching.value = false
    eventBus.emit(EVENTS.MATCHING_COMPLETE, {
      results: matchResults.value,
      duration: matchDuration.value
    })

    if (uploadedSpectrum.value && matchResults.value.length > 0) {
      heatmapData.value = computeSpectralDiffs(
        uploadedSpectrum.value,
        matchResults.value.slice(0, 20),
        filter.value,
        100
      )
    } else {
      heatmapData.value = null
    }
  }

  const updateFilter = (newFilter: Partial<SpectrumFilter>) => {
    settings.value.filter = { ...settings.value.filter, ...newFilter }
    localStorageCache.saveFilter(settings.value.filter)
    eventBus.emit(EVENTS.FILTER_CHANGED, settings.value.filter)

    if (uploadedSpectrum.value) {
      spectrumMatcher.buildIndex(filter.value, kClusters.value, 100)
      runMatching()
    }
  }

  const updateThreshold = (value: number) => {
    settings.value.threshold = value
    localStorageCache.saveThreshold(value)
    eventBus.emit(EVENTS.THRESHOLD_CHANGED, value)

    if (uploadedSpectrum.value) {
      runMatching()
    }
  }

  const updateKClusters = (k: number) => {
    settings.value.kClusters = k
    localStorageCache.saveSettings(settings.value)

    if (uploadedSpectrum.value) {
      spectrumMatcher.buildIndex(filter.value, k, 100)
      runMatching()
    }
  }

  const setSelectedSpectrum = (id: string | null) => {
    selectedSpectrumId.value = id
    eventBus.emit(EVENTS.SPECTRUM_SELECTED, id)
  }

  const setHoveredSpectrum = (id: string | null) => {
    hoveredSpectrumId.value = id
    eventBus.emit(EVENTS.SPECTRUM_HOVERED, id)
  }

  const rebuildCluster = () => {
    if (librarySpectra.value.length > 0) {
      spectrumMatcher.buildIndex(filter.value, kClusters.value, 100)
      const { points, uploadedPoint } = spectrumMatcher.getClusterPoints(
        uploadedSpectrum.value || undefined,
        filter.value,
        100
      )
      clusterPoints.value = points
      uploadedClusterPoint.value = uploadedPoint
      eventBus.emit(EVENTS.CLUSTER_UPDATED, { points, uploadedPoint })
    }
  }

  const clearHistory = () => {
    localStorageCache.clearSearchHistory()
    searchHistory.value = []
    eventBus.emit(EVENTS.HISTORY_UPDATED, [])
  }

  const clearUpload = () => {
    setUploadedSpectrum(null)
  }

  const highlightedSpectra = computed(() => {
    const selected = matchResults.value.find(
      (r) => r.spectrum.id === selectedSpectrumId.value
    )
    const hovered = matchResults.value.find(
      (r) => r.spectrum.id === hoveredSpectrumId.value
    )
    return { selected, hovered }
  })

  const topMatches = computed(() => matchResults.value.slice(0, 10))

  const mineralCategories = computed(() => {
    const cats = new Set<string>()
    librarySpectra.value.forEach((s) => cats.add(s.mineralCategory))
    return Array.from(cats)
  })

  return {
    librarySpectra,
    uploadedSpectrum,
    matchResults,
    clusterPoints,
    uploadedClusterPoint,
    isMatching,
    matchDuration,
    selectedSpectrumId,
    hoveredSpectrumId,
    heatmapData,
    settings,
    filter,
    threshold,
    kClusters,
    searchHistory,
    highlightedSpectra,
    topMatches,
    mineralCategories,
    initLibrary,
    setUploadedSpectrum,
    runMatching,
    updateFilter,
    updateThreshold,
    updateKClusters,
    setSelectedSpectrum,
    setHoveredSpectrum,
    rebuildCluster,
    clearHistory,
    clearUpload
  }
}

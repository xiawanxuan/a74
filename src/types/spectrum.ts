export interface RamanSpectrumPoint {
  wavelength: number
  intensity: number
}

export interface RamanSpectrum {
  id: string
  name: string
  mineralName: string
  mineralCategory: string
  points: RamanSpectrumPoint[]
  wavelengthRange: {
    min: number
    max: number
  }
  source?: string
  metadata?: Record<string, string | number>
}

export interface ParsedSpectrumData {
  points: RamanSpectrumPoint[]
  wavelengthRange: { min: number; max: number }
  format: string
  metadata: Record<string, string>
}

export interface SpectrumFilter {
  wavelengthMin: number
  wavelengthMax: number
  intensityNormalize: boolean
}

export interface KMeansResult {
  centroids: number[][]
  labels: number[]
  iterations: number
  inertia: number
}

export interface ClusterPoint {
  id: string
  name: string
  mineralName: string
  x: number
  y: number
  clusterLabel: number
  similarity?: number
}

export interface MatchResult {
  spectrum: RamanSpectrum
  similarity: number
  rank: number
  clusterLabel: number
}

export interface SearchHistoryItem {
  id: string
  timestamp: number
  fileName: string
  matchCount: number
  topMatch: string
  filter: SpectrumFilter
  threshold: number
}

export interface AppSettings {
  filter: SpectrumFilter
  threshold: number
  kClusters: number
}

export interface HeatmapDiffRow {
  mineralName: string
  mineralCategory: string
  spectrumId: string
  similarity: number
  diffs: number[]
}

export interface HeatmapDiffData {
  bins: number[]
  rows: HeatmapDiffRow[]
  maxAbsDiff: number
}

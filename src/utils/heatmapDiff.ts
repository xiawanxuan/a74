import type { RamanSpectrum, SpectrumFilter } from '@/types/spectrum'
import { spectraToVectors, interpolateIntensity } from './kmeans'

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

export function computeSpectralDiffs(
  uploaded: RamanSpectrum,
  matches: { spectrum: RamanSpectrum; similarity: number }[],
  filter: SpectrumFilter,
  numBins: number = 100
): HeatmapDiffData {
  const binSize = (filter.wavelengthMax - filter.wavelengthMin) / numBins
  const bins: number[] = []
  for (let i = 0; i < numBins; i++) {
    bins.push(filter.wavelengthMin + (i + 0.5) * binSize)
  }

  const [uploadedVec] = spectraToVectors([uploaded], filter, numBins)

  const rows: HeatmapDiffRow[] = []
  let maxAbsDiff = 0

  for (const match of matches) {
    const [refVec] = spectraToVectors([match.spectrum], filter, numBins)
    const diffs: number[] = []

    for (let i = 0; i < numBins; i++) {
      const diff = uploadedVec[i] - refVec[i]
      diffs.push(diff)
      const absDiff = Math.abs(diff)
      if (absDiff > maxAbsDiff) {
        maxAbsDiff = absDiff
      }
    }

    rows.push({
      mineralName: match.spectrum.mineralName,
      mineralCategory: match.spectrum.mineralCategory,
      spectrumId: match.spectrum.id,
      similarity: match.similarity,
      diffs
    })
  }

  return { bins, rows, maxAbsDiff: maxAbsDiff || 1 }
}

export function computePointwiseDiffs(
  uploaded: RamanSpectrum,
  reference: RamanSpectrum,
  filter: SpectrumFilter,
  numBins: number = 100
): { bins: number[]; diffs: number[]; maxAbsDiff: number } {
  const binSize = (filter.wavelengthMax - filter.wavelengthMin) / numBins
  const bins: number[] = []
  const diffs: number[] = []
  let maxAbsDiff = 0

  for (let i = 0; i < numBins; i++) {
    const wl = filter.wavelengthMin + (i + 0.5) * binSize
    bins.push(wl)

    const upVal = interpolateIntensity(uploaded.points, wl)
    const refVal = interpolateIntensity(reference.points, wl)
    const diff = upVal - refVal
    diffs.push(diff)

    if (Math.abs(diff) > maxAbsDiff) {
      maxAbsDiff = Math.abs(diff)
    }
  }

  return { bins, diffs, maxAbsDiff: maxAbsDiff || 1 }
}

import type { KMeansResult, RamanSpectrum, SpectrumFilter } from '@/types/spectrum'

export class KMeansCluster {
  private k: number
  private maxIterations: number
  private tolerance: number
  public centroids: number[][] = []

  constructor(k: number = 8, maxIterations: number = 300, tolerance: number = 1e-6) {
    this.k = k
    this.maxIterations = maxIterations
    this.tolerance = tolerance
  }

  public fit(data: number[][]): KMeansResult {
    if (data.length === 0) {
      this.centroids = []
      return { centroids: [], labels: [], iterations: 0, inertia: 0 }
    }

    const actualK = Math.min(this.k, data.length)
    const centroids = this.initCentroids(data, actualK)
    const labels = new Array(data.length).fill(0)
    let inertia = Infinity
    let iterations = 0

    for (let i = 0; i < this.maxIterations; i++) {
      iterations = i + 1
      const oldInertia = inertia
      inertia = this.assignLabels(data, centroids, labels)
      this.updateCentroids(data, centroids, labels)

      if (Math.abs(oldInertia - inertia) < this.tolerance * inertia) {
        break
      }
    }

    this.centroids = centroids
    return { centroids, labels, iterations, inertia }
  }

  private initCentroids(data: number[][], k: number): number[][] {
    const centroids: number[][] = []
    const indices = new Set<number>()
    const n = data.length

    while (indices.size < k && indices.size < n) {
      const idx = Math.floor(Math.random() * n)
      if (!indices.has(idx)) {
        indices.add(idx)
        centroids.push([...data[idx]])
      }
    }

    return centroids
  }

  private assignLabels(data: number[][], centroids: number[][], labels: number[]): number {
    let totalDist = 0

    for (let i = 0; i < data.length; i++) {
      let minDist = Infinity
      let bestLabel = 0

      for (let j = 0; j < centroids.length; j++) {
        const dist = this.euclideanDistance(data[i], centroids[j])
        if (dist < minDist) {
          minDist = dist
          bestLabel = j
        }
      }

      labels[i] = bestLabel
      totalDist += minDist * minDist
    }

    return totalDist
  }

  private updateCentroids(data: number[][], centroids: number[][], labels: number[]): void {
    const dims = data[0].length
    const sums = new Array(centroids.length).fill(null).map(() => new Array(dims).fill(0))
    const counts = new Array(centroids.length).fill(0)

    for (let i = 0; i < data.length; i++) {
      const label = labels[i]
      counts[label]++
      for (let d = 0; d < dims; d++) {
        sums[label][d] += data[i][d]
      }
    }

    for (let j = 0; j < centroids.length; j++) {
      if (counts[j] > 0) {
        for (let d = 0; d < dims; d++) {
          centroids[j][d] = sums[j][d] / counts[j]
        }
      }
    }
  }

  private euclideanDistance(a: number[], b: number[]): number {
    let sum = 0
    for (let i = 0; i < a.length; i++) {
      const diff = a[i] - b[i]
      sum += diff * diff
    }
    return Math.sqrt(sum)
  }

  public predict(point: number[], centroids: number[][]): number {
    let minDist = Infinity
    let bestLabel = 0

    for (let j = 0; j < centroids.length; j++) {
      const dist = this.euclideanDistance(point, centroids[j])
      if (dist < minDist) {
        minDist = dist
        bestLabel = j
      }
    }

    return bestLabel
  }
}

export function spectraToVectors(
  spectra: RamanSpectrum[],
  filter: SpectrumFilter,
  numBins: number = 100
): number[][] {
  const vectors: number[][] = []
  const binSize = (filter.wavelengthMax - filter.wavelengthMin) / numBins

  for (const spec of spectra) {
    const vector = new Array(numBins).fill(0)
    const points = spec.points

    for (let i = 0; i < numBins; i++) {
      const binCenter = filter.wavelengthMin + (i + 0.5) * binSize
      const value = interpolateIntensity(points, binCenter)
      vector[i] = value
    }

    if (filter.intensityNormalize) {
      normalizeVector(vector)
    }

    vectors.push(vector)
  }

  return vectors
}

export function interpolateIntensity(
  points: { wavelength: number; intensity: number }[],
  targetWavelength: number
): number {
  if (points.length === 0) return 0
  if (targetWavelength <= points[0].wavelength) return points[0].intensity
  if (targetWavelength >= points[points.length - 1].wavelength)
    return points[points.length - 1].intensity

  let lo = 0
  let hi = points.length - 1

  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2)
    if (points[mid].wavelength === targetWavelength) {
      return points[mid].intensity
    } else if (points[mid].wavelength < targetWavelength) {
      lo = mid + 1
    } else {
      hi = mid - 1
    }
  }

  const idx = Math.max(0, Math.min(points.length - 2, hi))
  const p1 = points[idx]
  const p2 = points[idx + 1]
  const t = (targetWavelength - p1.wavelength) / (p2.wavelength - p1.wavelength)
  return p1.intensity + t * (p2.intensity - p1.intensity)
}

export function normalizeVector(vector: number[]): void {
  let sumSq = 0
  for (const v of vector) {
    sumSq += v * v
  }
  const norm = Math.sqrt(sumSq)
  if (norm > 0) {
    for (let i = 0; i < vector.length; i++) {
      vector[i] /= norm
    }
  }
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB)
  return denom > 0 ? dot / denom : 0
}

export function spectralSimilarity(
  specA: RamanSpectrum,
  specB: RamanSpectrum,
  filter: SpectrumFilter,
  numBins: number = 100
): number {
  const [vecA] = spectraToVectors([specA], filter, numBins)
  const [vecB] = spectraToVectors([specB], filter, numBins)
  return cosineSimilarity(vecA, vecB)
}

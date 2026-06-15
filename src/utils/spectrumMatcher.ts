import type { MatchResult, RamanSpectrum, SpectrumFilter, ClusterPoint } from '@/types/spectrum'
import { KMeansCluster, spectraToVectors, cosineSimilarity } from './kmeans'

export interface MatchingOptions {
  threshold: number
  kClusters: number
  filter: SpectrumFilter
  numBins: number
}

export class SpectrumMatcher {
  private library: RamanSpectrum[] = []
  private kmeans: KMeansCluster | null = null
  private vectors: number[][] = []
  private clusterLabels: number[] = []
  private isBuilt = false

  public setLibrary(library: RamanSpectrum[]): void {
    this.library = library
    this.isBuilt = false
    this.kmeans = null
    this.vectors = []
    this.clusterLabels = []
  }

  public buildIndex(filter: SpectrumFilter, kClusters: number, numBins: number = 100): void {
    if (this.library.length === 0) return

    const startTime = performance.now()
    this.vectors = spectraToVectors(this.library, filter, numBins)
    const vectorTime = performance.now()

    this.kmeans = new KMeansCluster(kClusters, 200, 1e-5)
    const result = this.kmeans.fit(this.vectors)
    this.clusterLabels = result.labels
    const clusterTime = performance.now()

    this.isBuilt = true
    console.debug(
      `Index built: vectors=${(vectorTime - startTime).toFixed(1)}ms, ` +
        `clustering=${(clusterTime - vectorTime).toFixed(1)}ms, ` +
        `total=${(clusterTime - startTime).toFixed(1)}ms`
    )
  }

  public match(
    uploaded: RamanSpectrum,
    options: MatchingOptions
  ): {
    results: MatchResult[]
    clusterPoints: ClusterPoint[]
    uploadedPoint: ClusterPoint | null
    duration: number
  } {
    const startTime = performance.now()

    if (!this.isBuilt || this.kmeans === null) {
      this.buildIndex(options.filter, options.kClusters, options.numBins)
    }

    const [uploadedVector] = spectraToVectors([uploaded], options.filter, options.numBins)

    const results: MatchResult[] = []
    const clusterPoints: ClusterPoint[] = []

    const { pcaX, pcaY } = this.computePCA()

    for (let i = 0; i < this.library.length; i++) {
      const sim = cosineSimilarity(uploadedVector, this.vectors[i])
      if (sim >= options.threshold) {
        results.push({
          spectrum: this.library[i],
          similarity: sim,
          rank: 0,
          clusterLabel: this.clusterLabels[i]
        })
      }

      clusterPoints.push({
        id: this.library[i].id,
        name: this.library[i].name,
        mineralName: this.library[i].mineralName,
        x: pcaX[i],
        y: pcaY[i],
        clusterLabel: this.clusterLabels[i],
        similarity: sim
      })
    }

    results.sort((a, b) => b.similarity - a.similarity)
    results.forEach((r, idx) => {
      r.rank = idx + 1
    })

    const uploadedPoint: ClusterPoint | null = null

    const duration = performance.now() - startTime

    return {
      results,
      clusterPoints,
      uploadedPoint,
      duration
    }
  }

  public getClusterPoints(uploaded?: RamanSpectrum, filter?: SpectrumFilter, numBins: number = 100): {
    points: ClusterPoint[]
    uploadedPoint: ClusterPoint | null
  } {
    if (!this.isBuilt || this.kmeans === null) {
      return { points: [], uploadedPoint: null }
    }

    const { pcaX, pcaY } = this.computePCA()
    const points: ClusterPoint[] = []

    for (let i = 0; i < this.library.length; i++) {
      points.push({
        id: this.library[i].id,
        name: this.library[i].name,
        mineralName: this.library[i].mineralName,
        x: pcaX[i],
        y: pcaY[i],
        clusterLabel: this.clusterLabels[i]
      })
    }

    let uploadedPoint: ClusterPoint | null = null
    if (uploaded && filter && this.kmeans) {
      const [uploadedVector] = spectraToVectors([uploaded], filter, numBins)
      const uploadedCluster = this.kmeans.predict(uploadedVector, this.kmeans.centroids)

      let upX = 0
      let upY = 0
      if (pcaX.length > 0) {
        upX = this.projectPoint(uploadedVector, 0)
        upY = this.projectPoint(uploadedVector, 1)
      }

      uploadedPoint = {
        id: 'uploaded',
        name: '上传样本',
        mineralName: '未知',
        x: upX,
        y: upY,
        clusterLabel: uploadedCluster
      }
    }

    return { points, uploadedPoint }
  }

  private computePCA(): { pcaX: number[]; pcaY: number[] } {
    if (this.vectors.length === 0) {
      return { pcaX: [], pcaY: [] }
    }

    const n = this.vectors.length
    const dims = this.vectors[0].length

    const mean = new Array(dims).fill(0)
    for (let i = 0; i < n; i++) {
      for (let d = 0; d < dims; d++) {
        mean[d] += this.vectors[i][d]
      }
    }
    for (let d = 0; d < dims; d++) {
      mean[d] /= n
    }

    const centered = this.vectors.map((v) => v.map((val, d) => val - mean[d]))

    const cov = new Array(dims).fill(null).map(() => new Array(dims).fill(0))
    for (let i = 0; i < n; i++) {
      for (let d1 = 0; d1 < dims; d1++) {
        for (let d2 = 0; d2 < dims; d2++) {
          cov[d1][d2] += centered[i][d1] * centered[i][d2]
        }
      }
    }
    for (let d1 = 0; d1 < dims; d1++) {
      for (let d2 = 0; d2 < dims; d2++) {
        cov[d1][d2] /= n - 1
      }
    }

    const pc1 = this.powerIteration(cov, 100)
    const pc2 = this.secondEigenvector(cov, pc1, 100)

    const pcaX = centered.map((v) => this.dot(v, pc1))
    const pcaY = centered.map((v) => this.dot(v, pc2))

    return { pcaX, pcaY }
  }

  private powerIteration(matrix: number[][], iterations: number): number[] {
    const n = matrix.length
    let v = new Array(n).fill(0)
    v[0] = 1

    for (let iter = 0; iter < iterations; iter++) {
      const next = new Array(n).fill(0)
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          next[i] += matrix[i][j] * v[j]
        }
      }
      const norm = Math.sqrt(next.reduce((s, val) => s + val * val, 0))
      if (norm > 0) {
        for (let i = 0; i < n; i++) {
          v[i] = next[i] / norm
        }
      }
    }

    return v
  }

  private secondEigenvector(matrix: number[][], first: number[], iterations: number): number[] {
    const n = matrix.length
    const deflated = matrix.map((row, i) =>
      row.map((val, j) => val - first[i] * first[j] * this.dot(matrix[i], first))
    )

    let v = new Array(n).fill(0)
    v[1] = 1

    for (let iter = 0; iter < iterations; iter++) {
      let next = new Array(n).fill(0)
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          next[i] += deflated[i][j] * v[j]
        }
      }

      const proj = this.dot(next, first)
      for (let i = 0; i < n; i++) {
        next[i] -= proj * first[i]
      }

      const norm = Math.sqrt(next.reduce((s, val) => s + val * val, 0))
      if (norm > 0) {
        for (let i = 0; i < n; i++) {
          v[i] = next[i] / norm
        }
      }
    }

    return v
  }

  private dot(a: number[], b: number[]): number {
    let sum = 0
    for (let i = 0; i < a.length; i++) {
      sum += a[i] * b[i]
    }
    return sum
  }

  private projectPoint(vector: number[], component: number): number {
    return vector[component] || 0
  }

  public isIndexBuilt(): boolean {
    return this.isBuilt
  }
}

export const spectrumMatcher = new SpectrumMatcher()

import type { ParsedSpectrumData, RamanSpectrumPoint } from '@/types/spectrum'

type ParserFn = (lines: string[], metadata: Record<string, string>) => RamanSpectrumPoint[] | null

export class RamanSpectrumParser {
  private parsers: Map<string, ParserFn> = new Map()

  constructor() {
    this.parsers.set('renishaw', this.parseRenishaw.bind(this))
    this.parsers.set('horiba', this.parseHoriba.bind(this))
    this.parsers.set('bruker', this.parseBruker.bind(this))
    this.parsers.set('generic_csv', this.parseGenericCsv.bind(this))
    this.parsers.set('generic_space', this.parseGenericSpace.bind(this))
    this.parsers.set('generic_tab', this.parseGenericTab.bind(this))
  }

  public parse(text: string): ParsedSpectrumData {
    const cleanText = text.replace(/\r\n/g, '\n').trim()
    const lines = cleanText.split('\n').filter((line) => line.trim().length > 0)
    const metadata = this.extractMetadata(lines)

    let points: RamanSpectrumPoint[] | null = null
    let detectedFormat = 'unknown'

    for (const [format, parser] of this.parsers.entries()) {
      const result = parser(lines, metadata)
      if (result && result.length > 10) {
        points = result
        detectedFormat = format
        break
      }
    }

    if (!points || points.length === 0) {
      points = this.fallbackParse(lines)
      detectedFormat = 'fallback'
    }

    points = points.sort((a, b) => a.wavelength - b.wavelength)

    const wavelengths = points.map((p) => p.wavelength)
    const wavelengthRange = {
      min: Math.min(...wavelengths),
      max: Math.max(...wavelengths)
    }

    return {
      points,
      wavelengthRange,
      format: detectedFormat,
      metadata
    }
  }

  private extractMetadata(lines: string[]): Record<string, string> {
    const metadata: Record<string, string> = {}
    const commentLines = lines.filter(
      (l) => l.startsWith('#') || l.startsWith(';') || l.startsWith('//') || l.startsWith('/*')
    )

    commentLines.forEach((line) => {
      const cleanLine = line.replace(/^[#;\/\s*]+/, '').trim()
      const colonIdx = cleanLine.indexOf(':')
      const equalIdx = cleanLine.indexOf('=')
      const idx = colonIdx > -1 ? colonIdx : equalIdx

      if (idx > -1) {
        const key = cleanLine.slice(0, idx).trim().toLowerCase()
        const value = cleanLine.slice(idx + 1).trim()
        if (key && value) {
          metadata[key] = value
        }
      }
    })

    return metadata
  }

  private parseRenishaw(lines: string[]): RamanSpectrumPoint[] | null {
    const hasRenishawHeader = lines.some(
      (l) => l.toLowerCase().includes('renishaw') || l.includes('Wave') || l.includes('Wavenumber')
    )
    if (!hasRenishawHeader && !this.isDataBlock(lines)) return null

    return this.parseTabularData(lines, /[,\t\s]+/, 0, 1)
  }

  private parseHoriba(lines: string[]): RamanSpectrumPoint[] | null {
    const hasHoribaHeader = lines.some(
      (l) => l.toLowerCase().includes('horiba') || l.toLowerCase().includes('labram')
    )
    if (!hasHoribaHeader && !this.isDataBlock(lines)) return null

    return this.parseTabularData(lines, /[,\t\s]+/, 0, 1)
  }

  private parseBruker(lines: string[]): RamanSpectrumPoint[] | null {
    const hasBrukerHeader = lines.some(
      (l) => l.toLowerCase().includes('bruker') || l.toLowerCase().includes('opus')
    )
    if (!hasBrukerHeader && !this.isDataBlock(lines)) return null

    return this.parseTabularData(lines, /[,\t\s]+/, 0, 1)
  }

  private parseGenericCsv(lines: string[]): RamanSpectrumPoint[] | null {
    const csvLines = lines.filter((l) => l.includes(','))
    if (csvLines.length < lines.length * 0.6) return null

    return this.parseTabularData(lines, /\s*,\s*/, 0, 1)
  }

  private parseGenericSpace(lines: string[]): RamanSpectrumPoint[] | null {
    const spaceLines = lines.filter((l) => /^\s*-?\d/.test(l) && l.includes(' '))
    if (spaceLines.length < lines.length * 0.5) return null

    return this.parseTabularData(lines, /\s+/, 0, 1)
  }

  private parseGenericTab(lines: string[]): RamanSpectrumPoint[] | null {
    const tabLines = lines.filter((l) => l.includes('\t'))
    if (tabLines.length < lines.length * 0.4) return null

    return this.parseTabularData(lines, /\t+/, 0, 1)
  }

  private parseTabularData(
    lines: string[],
    delimiter: RegExp,
    waveCol: number,
    intensityCol: number
  ): RamanSpectrumPoint[] {
    const points: RamanSpectrumPoint[] = []

    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed.startsWith('#') || trimmed.startsWith(';') || trimmed.startsWith('/')) continue

      const parts = trimmed.split(delimiter).filter((p) => p.trim().length > 0)
      if (parts.length < 2) continue

      const wavelength = parseFloat(parts[waveCol])
      const intensity = parseFloat(parts[intensityCol])

      if (!isNaN(wavelength) && !isNaN(intensity) && isFinite(wavelength) && isFinite(intensity)) {
        points.push({ wavelength, intensity })
      }
    }

    return points
  }

  private isDataBlock(lines: string[]): boolean {
    let dataLines = 0
    for (const line of lines) {
      const trimmed = line.trim()
      if (/^-?\d/.test(trimmed)) {
        dataLines++
      }
    }
    return dataLines > 20
  }

  private fallbackParse(lines: string[]): RamanSpectrumPoint[] {
    const points: RamanSpectrumPoint[] = []

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith(';')) continue

      const numbers = trimmed.match(/-?\d+\.?\d*(?:[eE][+-]?\d+)?/g)
      if (numbers && numbers.length >= 2) {
        const wavelength = parseFloat(numbers[0])
        const intensity = parseFloat(numbers[1])
        if (!isNaN(wavelength) && !isNaN(intensity)) {
          points.push({ wavelength, intensity })
        }
      }
    }

    return points
  }
}

export const spectrumParser = new RamanSpectrumParser()

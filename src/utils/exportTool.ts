import type { MatchResult, RamanSpectrum, SpectrumFilter } from '@/types/spectrum'

export class ExportTool {
  public exportMatchReport(
    results: MatchResult[],
    uploadedSpectrum: RamanSpectrum | null,
    filter: SpectrumFilter,
    threshold: number,
    duration: number
  ): string {
    const lines: string[] = []

    lines.push('='.repeat(60))
    lines.push('       文物保护数字化实验室 - 拉曼光谱匹配报告')
    lines.push('='.repeat(60))
    lines.push('')
    lines.push(`生成时间: ${new Date().toLocaleString('zh-CN')}`)
    lines.push(`匹配耗时: ${duration.toFixed(2)} ms`)
    lines.push('')

    if (uploadedSpectrum) {
      lines.push('【上传样本信息】')
      lines.push(`  样本名称: ${uploadedSpectrum.name}`)
      lines.push(`  波长范围: ${uploadedSpectrum.wavelengthRange.min.toFixed(1)} - ${uploadedSpectrum.wavelengthRange.max.toFixed(1)} cm⁻¹`)
      lines.push(`  数据点数: ${uploadedSpectrum.points.length}`)
      lines.push('')
    }

    lines.push('【匹配参数】')
    lines.push(`  波长筛选: ${filter.wavelengthMin} - ${filter.wavelengthMax} cm⁻¹`)
    lines.push(`  强度归一化: ${filter.intensityNormalize ? '是' : '否'}`)
    lines.push(`  匹配阈值: ${(threshold * 100).toFixed(1)}%`)
    lines.push('')

    lines.push('【匹配结果排名】')
    lines.push('-'.repeat(60))
    lines.push(`${this.padText('排名', 6)}${this.padText('矿物名称', 12)}${this.padText('类别', 10)}${this.padText('相似度', 10)}${this.padText('聚类', 8)}`)
    lines.push('-'.repeat(60))

    const topResults = results.slice(0, 20)
    for (const r of topResults) {
      lines.push(
        `${this.padText(String(r.rank), 6)}` +
          `${this.padText(r.spectrum.mineralName, 12)}` +
          `${this.padText(r.spectrum.mineralCategory, 10)}` +
          `${this.padText((r.similarity * 100).toFixed(2) + '%', 10)}` +
          `${this.padText(String(r.clusterLabel), 8)}`
      )
    }

    lines.push('')
    lines.push(`共找到 ${results.length} 条匹配结果`)
    lines.push('')
    lines.push('='.repeat(60))
    lines.push('                        报告结束')
    lines.push('='.repeat(60))

    return lines.join('\n')
  }

  public exportMatchCSV(results: MatchResult[]): string {
    const headers = ['rank', 'mineral_name', 'mineral_category', 'similarity', 'cluster_label', 'spectrum_id', 'spectrum_name']
    const lines = [headers.join(',')]

    for (const r of results) {
      lines.push(
        [
          r.rank,
          r.spectrum.mineralName,
          r.spectrum.mineralCategory,
          r.similarity.toFixed(6),
          r.clusterLabel,
          r.spectrum.id,
          r.spectrum.name
        ].join(',')
      )
    }

    return lines.join('\n')
  }

  public exportSpectrumCSV(spectrum: RamanSpectrum): string {
    const lines = ['wavelength,intensity']
    for (const p of spectrum.points) {
      lines.push(`${p.wavelength.toFixed(4)},${p.intensity.toFixed(6)}`)
    }
    return lines.join('\n')
  }

  public downloadFile(content: string, filename: string, mimeType: string = 'text/plain'): void {
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  public downloadJSON(data: unknown, filename: string): void {
    const content = JSON.stringify(data, null, 2)
    this.downloadFile(content, filename, 'application/json')
  }

  private padText(text: string, width: number): string {
    const len = this.getTextWidth(text)
    if (len >= width) return text
    return text + ' '.repeat(width - len)
  }

  private getTextWidth(text: string): number {
    let width = 0
    for (const ch of text) {
      width += /[\u4e00-\u9fa5]/.test(ch) ? 2 : 1
    }
    return width
  }
}

export const exportTool = new ExportTool()

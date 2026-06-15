export interface MineralTemplate {
  name: string
  category: string
  peaks: number[]
  peakIntensities: number[]
  peakWidths: number[]
}

export const MINERAL_TEMPLATES: MineralTemplate[] = [
  {
    name: '朱砂',
    category: '硫化物',
    peaks: [253, 284, 344, 470, 585, 1095],
    peakIntensities: [0.95, 1.0, 0.7, 0.45, 0.35, 0.2],
    peakWidths: [12, 10, 15, 18, 14, 20]
  },
  {
    name: '石青',
    category: '碳酸盐',
    peaks: [250, 330, 400, 740, 830, 1090, 1420, 1590],
    peakIntensities: [0.5, 0.85, 0.6, 0.4, 0.7, 1.0, 0.3, 0.25],
    peakWidths: [15, 12, 14, 20, 16, 18, 22, 24]
  },
  {
    name: '石绿',
    category: '碳酸盐',
    peaks: [220, 288, 355, 432, 500, 720, 810, 1060, 1360, 1520],
    peakIntensities: [0.4, 0.75, 1.0, 0.65, 0.5, 0.35, 0.55, 0.8, 0.3, 0.25],
    peakWidths: [12, 14, 10, 16, 18, 15, 13, 17, 20, 22]
  },
  {
    name: '赭石',
    category: '氧化物',
    peaks: [225, 295, 408, 490, 550, 660, 1310],
    peakIntensities: [0.8, 1.0, 0.7, 0.9, 0.5, 0.4, 0.2],
    peakWidths: [18, 14, 20, 16, 22, 19, 25]
  },
  {
    name: '铅白',
    category: '碳酸盐',
    peaks: [248, 320, 440, 680, 815, 1050, 1390],
    peakIntensities: [0.6, 0.4, 0.85, 1.0, 0.55, 0.3, 0.25],
    peakWidths: [14, 16, 12, 18, 15, 20, 22]
  },
  {
    name: '金粉',
    category: '单质',
    peaks: [220, 340, 510, 690, 860, 1020],
    peakIntensities: [0.45, 0.7, 1.0, 0.6, 0.35, 0.2],
    peakWidths: [20, 16, 12, 18, 22, 25]
  },
  {
    name: '银朱',
    category: '硫化物',
    peaks: [246, 278, 340, 460, 570, 1070],
    peakIntensities: [0.9, 1.0, 0.75, 0.4, 0.3, 0.15],
    peakWidths: [10, 9, 12, 16, 13, 18]
  },
  {
    name: '群青',
    category: '硅酸盐',
    peaks: [250, 310, 440, 548, 580, 800, 1100, 1520],
    peakIntensities: [0.35, 0.5, 0.7, 1.0, 0.85, 0.4, 0.25, 0.2],
    peakWidths: [15, 14, 18, 10, 12, 16, 20, 24]
  },
  {
    name: '藤黄',
    category: '有机颜料',
    peaks: [240, 320, 420, 560, 730, 950, 1280, 1580],
    peakIntensities: [0.4, 0.6, 0.5, 0.75, 1.0, 0.55, 0.35, 0.3],
    peakWidths: [18, 15, 20, 14, 12, 17, 22, 20]
  },
  {
    name: '墨黑',
    category: '碳质',
    peaks: [1350, 1580],
    peakIntensities: [1.0, 0.9],
    peakWidths: [120, 80]
  },
  {
    name: '云母',
    category: '硅酸盐',
    peaks: [195, 270, 380, 450, 680, 800, 920, 1080],
    peakIntensities: [0.6, 0.8, 0.5, 0.7, 0.9, 1.0, 0.45, 0.35],
    peakWidths: [14, 16, 18, 12, 15, 10, 20, 22]
  },
  {
    name: '方解石',
    category: '碳酸盐',
    peaks: [282, 712, 1087, 1437],
    peakIntensities: [0.5, 1.0, 0.85, 0.3],
    peakWidths: [10, 12, 8, 18]
  },
  {
    name: '石英',
    category: '硅酸盐',
    peaks: [206, 355, 464, 698, 807, 1060, 1160],
    peakIntensities: [0.4, 0.7, 0.9, 0.5, 1.0, 0.6, 0.45],
    peakWidths: [8, 10, 6, 14, 8, 12, 10]
  },
  {
    name: '石膏',
    category: '硫酸盐',
    peaks: [416, 494, 619, 671, 1008, 1135],
    peakIntensities: [0.5, 0.7, 0.4, 1.0, 0.6, 0.35],
    peakWidths: [12, 10, 15, 8, 14, 18]
  },
  {
    name: '蓝铜矿',
    category: '碳酸盐',
    peaks: [248, 333, 396, 542, 745, 835, 1095, 1425],
    peakIntensities: [0.55, 0.9, 0.65, 0.4, 0.45, 0.75, 1.0, 0.35],
    peakWidths: [14, 11, 13, 17, 19, 15, 16, 21]
  }
]

export function generateSpectrumFromTemplate(
  template: MineralTemplate,
  sampleId: number,
  wavelengthMin: number = 100,
  wavelengthMax: number = 2200,
  numPoints: number = 1024,
  noiseLevel: number = 0.03
): {
  id: string
  name: string
  mineralName: string
  mineralCategory: string
  points: { wavelength: number; intensity: number }[]
  wavelengthRange: { min: number; max: number }
} {
  const points: { wavelength: number; intensity: number }[] = []
  const step = (wavelengthMax - wavelengthMin) / (numPoints - 1)
  const jitter = (Math.random() - 0.5) * 0.02
  const intensityScale = 0.8 + Math.random() * 0.4

  for (let i = 0; i < numPoints; i++) {
    const wavelength = wavelengthMin + i * step
    let intensity = 0

    for (let p = 0; p < template.peaks.length; p++) {
      const peakPos = template.peaks[p] * (1 + jitter)
      const peakWidth = template.peakWidths[p] * (0.9 + Math.random() * 0.2)
      const peakHeight = template.peakIntensities[p] * intensityScale
      const dist = wavelength - peakPos
      const gaussian = Math.exp(-(dist * dist) / (2 * peakWidth * peakWidth))
      intensity += peakHeight * gaussian
    }

    intensity += (Math.random() - 0.5) * noiseLevel
    intensity = Math.max(0, intensity)
    intensity += 0.02 + Math.random() * 0.01

    points.push({ wavelength, intensity })
  }

  return {
    id: `spec_${template.name}_${sampleId.toString().padStart(5, '0')}`,
    name: `${template.name}样本${sampleId}`,
    mineralName: template.name,
    mineralCategory: template.category,
    points,
    wavelengthRange: { min: wavelengthMin, max: wavelengthMax }
  }
}

export function generateSpectraLibrary(count: number = 1500) {
  const spectra: ReturnType<typeof generateSpectrumFromTemplate>[] = []
  const templates = MINERAL_TEMPLATES
  const perTemplate = Math.ceil(count / templates.length)

  for (let t = 0; t < templates.length; t++) {
    for (let i = 0; i < perTemplate && spectra.length < count; i++) {
      const spectrum = generateSpectrumFromTemplate(templates[t], i + 1)
      spectra.push(spectrum)
    }
  }

  return spectra.slice(0, count)
}

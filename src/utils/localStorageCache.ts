import type { RamanSpectrum, SearchHistoryItem, AppSettings, SpectrumFilter } from '@/types/spectrum'

const STORAGE_KEYS = {
  SPECTRA_INDEX: 'raman_spectra_index',
  SEARCH_HISTORY: 'raman_search_history',
  APP_SETTINGS: 'raman_app_settings'
}

const DEFAULT_SETTINGS: AppSettings = {
  filter: {
    wavelengthMin: 200,
    wavelengthMax: 2000,
    intensityNormalize: true
  },
  threshold: 0.7,
  kClusters: 8
}

export class LocalStorageCache {
  private storage: Storage

  constructor() {
    this.storage = window.localStorage
  }

  public saveSpectraIndex(spectra: RamanSpectrum[]): void {
    try {
      const data = JSON.stringify(spectra)
      this.storage.setItem(STORAGE_KEYS.SPECTRA_INDEX, data)
    } catch (e) {
      console.warn('Failed to save spectra index to localStorage:', e)
    }
  }

  public loadSpectraIndex(): RamanSpectrum[] | null {
    try {
      const data = this.storage.getItem(STORAGE_KEYS.SPECTRA_INDEX)
      if (data) {
        return JSON.parse(data) as RamanSpectrum[]
      }
    } catch (e) {
      console.warn('Failed to load spectra index from localStorage:', e)
    }
    return null
  }

  public clearSpectraIndex(): void {
    this.storage.removeItem(STORAGE_KEYS.SPECTRA_INDEX)
  }

  public saveSearchHistory(history: SearchHistoryItem[]): void {
    try {
      const data = JSON.stringify(history)
      this.storage.setItem(STORAGE_KEYS.SEARCH_HISTORY, data)
    } catch (e) {
      console.warn('Failed to save search history to localStorage:', e)
    }
  }

  public loadSearchHistory(): SearchHistoryItem[] {
    try {
      const data = this.storage.getItem(STORAGE_KEYS.SEARCH_HISTORY)
      if (data) {
        return JSON.parse(data) as SearchHistoryItem[]
      }
    } catch (e) {
      console.warn('Failed to load search history from localStorage:', e)
    }
    return []
  }

  public addHistoryItem(item: SearchHistoryItem): SearchHistoryItem[] {
    const history = this.loadSearchHistory()
    history.unshift(item)
    const trimmed = history.slice(0, 20)
    this.saveSearchHistory(trimmed)
    return trimmed
  }

  public clearSearchHistory(): void {
    this.storage.removeItem(STORAGE_KEYS.SEARCH_HISTORY)
  }

  public saveSettings(settings: AppSettings): void {
    try {
      const data = JSON.stringify(settings)
      this.storage.setItem(STORAGE_KEYS.APP_SETTINGS, data)
    } catch (e) {
      console.warn('Failed to save app settings to localStorage:', e)
    }
  }

  public loadSettings(): AppSettings {
    try {
      const data = this.storage.getItem(STORAGE_KEYS.APP_SETTINGS)
      if (data) {
        const parsed = JSON.parse(data) as Partial<AppSettings>
        return {
          ...DEFAULT_SETTINGS,
          ...parsed,
          filter: {
            ...DEFAULT_SETTINGS.filter,
            ...(parsed.filter || {})
          }
        }
      }
    } catch (e) {
      console.warn('Failed to load app settings from localStorage:', e)
    }
    return { ...DEFAULT_SETTINGS }
  }

  public saveFilter(filter: SpectrumFilter): void {
    const settings = this.loadSettings()
    settings.filter = filter
    this.saveSettings(settings)
  }

  public saveThreshold(threshold: number): void {
    const settings = this.loadSettings()
    settings.threshold = threshold
    this.saveSettings(settings)
  }
}

export const localStorageCache = new LocalStorageCache()

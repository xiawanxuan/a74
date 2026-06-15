type EventCallback<T = unknown> = (data: T) => void
type EventMap = Map<string, Set<EventCallback>>

export class EventBus {
  private events: EventMap = new Map()

  public on<T = unknown>(event: string, callback: EventCallback<T>): () => void {
    if (!this.events.has(event)) {
      this.events.set(event, new Set())
    }
    this.events.get(event)!.add(callback as EventCallback)

    return () => {
      this.off(event, callback as EventCallback)
    }
  }

  public off<T = unknown>(event: string, callback: EventCallback<T>): void {
    const callbacks = this.events.get(event)
    if (callbacks) {
      callbacks.delete(callback as EventCallback)
      if (callbacks.size === 0) {
        this.events.delete(event)
      }
    }
  }

  public emit<T = unknown>(event: string, data?: T): void {
    const callbacks = this.events.get(event)
    if (callbacks) {
      callbacks.forEach((cb) => {
        try {
          cb(data)
        } catch (e) {
          console.error(`EventBus error in handler for "${event}":`, e)
        }
      })
    }
  }

  public once<T = unknown>(event: string, callback: EventCallback<T>): () => void {
    const wrapped = (data: T) => {
      this.off(event, wrapped as EventCallback)
      callback(data)
    }
    return this.on(event, wrapped as EventCallback)
  }

  public clear(): void {
    this.events.clear()
  }

  public hasListeners(event: string): boolean {
    const callbacks = this.events.get(event)
    return callbacks !== undefined && callbacks.size > 0
  }
}

export const eventBus = new EventBus()

export const EVENTS = {
  SPECTRUM_UPLOADED: 'spectrum:uploaded',
  SPECTRUM_CLEARED: 'spectrum:cleared',
  FILTER_CHANGED: 'filter:changed',
  THRESHOLD_CHANGED: 'threshold:changed',
  MATCHING_STARTED: 'matching:started',
  MATCHING_COMPLETE: 'matching:complete',
  SPECTRUM_HOVERED: 'spectrum:hovered',
  SPECTRUM_SELECTED: 'spectrum:selected',
  CLUSTER_UPDATED: 'cluster:updated',
  HISTORY_UPDATED: 'history:updated',
  EXPORT_REQUESTED: 'export:requested'
} as const

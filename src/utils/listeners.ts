export class Listeners<T> {
  protected listeners: Map<keyof T, Array<T[keyof T]>>

  constructor () {
    this.listeners = new Map()
  }

  get<K extends keyof T> (key: K): Array<T[K]> {
    return <Array<T[K]>>(this.listeners.get(key) || [])
  }

  add<K extends keyof T> (key: K, listener: T[K], prioritized = false): this {
    const listeners = this.listeners.get(key)
    if (listeners) {
      if (prioritized) {
        this.listeners.set(key, [listener, ...listeners])
      } else {
        this.listeners.set(key, [...listeners, listener])
      }
    } else {
      this.listeners.set(key, [listener])
    }
    return this
  }

  delete (key: keyof T): boolean {
    return this.listeners.delete(key)
  }
}

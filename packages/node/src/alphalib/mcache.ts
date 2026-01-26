import type { SevLogger } from '@transloadit/sev-logger'
import type { Schema } from 'zod'

export interface McacheOpts {
  ttlMs?: number
  zodSchema?: Schema
  logger?: SevLogger
  /**
   * Maximum number of entries in the cache. When exceeded, oldest entries are removed.
   * Defaults to 10,000 entries.
   */
  maxSize?: number
  /**
   * Custom key generator function. If not provided, uses JSON.stringify.
   */
  keyFn?: (...args: unknown[]) => string
}

interface CacheEntry<T> {
  value: T
  timestamp: number
}

/**
 * Memory cache abstraction to help cache function results in-process.
 *
 * Example:
 *
 *   const cache = new Mcache<Instance[]>({ ttlMs: 1000 * 60 * 10 })
 *
 *   async function fetchInstances(region: string): Promise<Instance[]> {
 *     return cache.get(region, async () => {
 *       // Do work, e.g. fetch instances from AWS
 *       return await this._fetchInstances(region)
 *     })
 *   }
 */
export class Mcache<T> {
  #cache: Map<string, CacheEntry<T>>
  #pending: Map<string, Promise<T>>
  #opts: Required<Omit<McacheOpts, 'logger' | 'zodSchema' | 'keyFn'>> &
    Pick<McacheOpts, 'logger' | 'zodSchema' | 'keyFn'>

  constructor(opts: McacheOpts = {}) {
    this.#cache = new Map()
    this.#pending = new Map()
    this.#opts = {
      ttlMs: opts.ttlMs ?? Number.POSITIVE_INFINITY,
      maxSize: opts.maxSize ?? 10_000,
      zodSchema: opts.zodSchema,
      logger: opts.logger,
      keyFn: opts.keyFn,
    }
  }

  /**
   * Get a value from cache, or compute it using the provided function.
   * The cache key is generated from the args using JSON.stringify by default,
   * or using the custom keyFn if provided.
   */

  // biome-ignore lint/suspicious/useAwait: @TODO check this out later
  async get(producer: () => Promise<T> | T, ...args: unknown[]): Promise<T> {
    const key = this.#opts.keyFn ? this.#opts.keyFn(...args) : JSON.stringify(args)
    const cached = this.#cache.get(key)

    if (cached) {
      const age = Date.now() - cached.timestamp
      if (age <= this.#opts.ttlMs || this.#opts.ttlMs === Number.POSITIVE_INFINITY) {
        this.#opts.logger?.debug(`Cache hit for key ${key} (age: ${age}ms)`)
        return cached.value
      }

      this.#opts.logger?.debug(
        `Cache expired for key ${key} (age: ${age}ms > ${this.#opts.ttlMs}ms)`,
      )
      this.#cache.delete(key)
    }

    const pending = this.#pending.get(key)
    if (pending) {
      this.#opts.logger?.debug(`Cache miss for key ${key}, waiting for pending request`)
      return pending
    }

    this.#opts.logger?.debug(`Cache miss for key ${key}, computing value`)

    const promise = Promise.resolve().then(async () => {
      const value = await producer()

      // Validate if schema provided
      if (this.#opts.zodSchema) {
        this.#opts.zodSchema.parse(value)
      }

      this.#set(key, value)
      return value
    })

    this.#pending.set(key, promise)
    void promise.finally(() => {
      this.#pending.delete(key)
    })
    return promise
  }

  /**
   * Set a value in the cache directly.
   */
  set(value: T, ...args: unknown[]): void {
    const key = this.#opts.keyFn ? this.#opts.keyFn(...args) : JSON.stringify(args)

    // Validate if schema provided
    if (this.#opts.zodSchema) {
      this.#opts.zodSchema.parse(value)
    }

    this.#set(key, value)
  }

  /**
   * Check if a key exists in cache and is not expired.
   */
  has(...args: unknown[]): boolean {
    const key = this.#opts.keyFn ? this.#opts.keyFn(...args) : JSON.stringify(args)
    const cached = this.#cache.get(key)

    if (!cached) {
      return false
    }

    const age = Date.now() - cached.timestamp
    if (age > this.#opts.ttlMs && this.#opts.ttlMs !== Number.POSITIVE_INFINITY) {
      this.#cache.delete(key)
      return false
    }

    return true
  }

  /**
   * Clear all entries from the cache.
   */
  clear(): void {
    this.#cache.clear()
  }

  /**
   * Delete a specific entry from the cache.
   */
  delete(...args: unknown[]): boolean {
    const key = this.#opts.keyFn ? this.#opts.keyFn(...args) : JSON.stringify(args)
    return this.#cache.delete(key)
  }

  /**
   * Get the current size of the cache.
   */
  get size(): number {
    return this.#cache.size
  }

  /**
   * Clean up expired entries and enforce size limit.
   */
  cleanup(): void {
    const now = Date.now()

    // Remove expired entries
    if (this.#opts.ttlMs !== Number.POSITIVE_INFINITY) {
      for (const [key, entry] of this.#cache.entries()) {
        if (now - entry.timestamp > this.#opts.ttlMs) {
          this.#cache.delete(key)
        }
      }
    }

    // Enforce size limit by removing oldest entries
    if (this.#cache.size > this.#opts.maxSize) {
      const entries = Array.from(this.#cache.entries())
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp)
      const toRemove = entries.slice(0, this.#cache.size - this.#opts.maxSize)
      for (const [key] of toRemove) {
        this.#cache.delete(key)
      }
      this.#opts.logger?.debug(
        `Cache size limit reached, removed ${toRemove.length} oldest entries`,
      )
    }
  }

  #set(key: string, value: T): void {
    this.#cache.set(key, {
      value,
      timestamp: Date.now(),
    })

    // Trigger cleanup if we're over size limit
    if (this.#cache.size > this.#opts.maxSize) {
      this.cleanup()
    }
  }
}

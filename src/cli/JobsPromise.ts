/**
 * Tracks a collection of promises and emits errors as they occur.
 * Used to run multiple async operations in parallel while:
 * 1. Reporting errors as they happen (via onError callback)
 * 2. Waiting for all operations to complete at the end
 */
export default class JobsPromise {
  private promises: Set<Promise<unknown>> = new Set()
  private onError: ((err: unknown) => void) | null = null

  /**
   * Set the error handler for individual promise rejections.
   * Errors are reported immediately when promises reject.
   */
  setErrorHandler(handler: (err: unknown) => void): void {
    this.onError = handler
  }

  /**
   * Add a promise to track. If the promise rejects,
   * the error handler will be called.
   */
  add(promise: Promise<unknown>): void {
    this.promises.add(promise)
    promise
      .catch((err: unknown) => {
        this.onError?.(err)
      })
      .finally(() => {
        this.promises.delete(promise)
      })
  }

  /**
   * Wait for all tracked promises to settle.
   * Returns array of fulfilled values (rejects are filtered out
   * since errors were already handled via the error handler).
   */
  async allSettled(): Promise<unknown[]> {
    const promises = [...this.promises]
    const results = await Promise.allSettled(promises)
    return results
      .filter((r): r is PromiseFulfilledResult<unknown> => r.status === 'fulfilled')
      .map((r) => r.value)
  }
}

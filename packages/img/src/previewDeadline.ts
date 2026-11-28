/** A cancellable deadline for an open preview or a PDF network read. */
export function previewDeadline(parent: AbortSignal, timeoutMs = 30_000) {
  const controller = new AbortController()
  const abort = (): void => controller.abort()
  let disposed = false
  let timer: ReturnType<typeof setTimeout>
  function reset(): void {
    if (disposed || controller.signal.aborted) return
    clearTimeout(timer)
    timer = setTimeout(abort, timeoutMs)
  }
  if (parent.aborted) abort()
  else parent.addEventListener('abort', abort, { once: true })
  reset()
  return {
    signal: controller.signal,
    reset,
    async wait<T>(operation: Promise<T>): Promise<T> {
      const { signal } = controller
      signal.throwIfAborted()
      let rejectAbort: () => void = () => {}
      const cancelled = new Promise<never>((_, reject) => {
        rejectAbort = () => reject(signal.reason)
        signal.addEventListener('abort', rejectAbort, { once: true })
      })
      try {
        return await Promise.race([operation, cancelled])
      } finally {
        signal.removeEventListener('abort', rejectAbort)
      }
    },
    dispose(): void {
      disposed = true
      clearTimeout(timer)
      parent.removeEventListener('abort', abort)
    },
  }
}

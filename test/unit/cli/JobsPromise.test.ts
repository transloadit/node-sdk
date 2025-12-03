import { describe, expect, it, vi } from 'vitest'
import JobsPromise from '../../../src/cli/JobsPromise.ts'

describe('JobsPromise', () => {
  it('should call error handler when promise rejects', async () => {
    const jobs = new JobsPromise()
    const errorHandler = vi.fn()
    jobs.setErrorHandler(errorHandler)

    const error = new Error('test error')
    jobs.add(Promise.reject(error))

    await jobs.allSettled()

    expect(errorHandler).toHaveBeenCalledWith(error)
  })

  it('should collect fulfilled values from allSettled', async () => {
    const jobs = new JobsPromise()
    jobs.setErrorHandler(() => {})

    jobs.add(Promise.resolve('a'))
    jobs.add(Promise.resolve('b'))
    jobs.add(Promise.reject(new Error('ignored')))

    const results = await jobs.allSettled()

    expect(results).toContain('a')
    expect(results).toContain('b')
    expect(results).toHaveLength(2)
  })

  it('should throw if error handler is not set and promise rejects', async () => {
    const jobs = new JobsPromise()
    // Intentionally NOT setting error handler

    // Create a promise that we'll handle to avoid unhandled rejection
    const rejectingPromise = Promise.reject(new Error('test'))
    rejectingPromise.catch(() => {}) // Prevent unhandled rejection warning

    // This should throw because no error handler is set
    expect(() => jobs.add(rejectingPromise)).toThrow(
      'JobsPromise: error handler must be set before adding promises'
    )
  })
})

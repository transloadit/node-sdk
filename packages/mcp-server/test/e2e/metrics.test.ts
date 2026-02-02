import { describe, expect, it } from 'vitest'
import { startHttpServer } from './http-server.ts'

describe('metrics', () => {
  it('exposes prometheus metrics', async () => {
    const { url, close } = await startHttpServer()

    try {
      const metricsUrl = new URL(url)
      metricsUrl.pathname = '/metrics'

      const response = await fetch(metricsUrl)
      expect(response.status).toBe(200)
      const contentType = response.headers.get('content-type')
      expect(contentType).toContain('text/plain')

      const body = await response.text()
      expect(body).toContain('process_cpu_user_seconds_total')
    } finally {
      await close()
    }
  })
})

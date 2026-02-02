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

  it('requires basic auth when configured', async () => {
    const { url, close } = await startHttpServer({
      metricsAuth: { username: 'metrics-user', password: 'metrics-pass' },
    })

    try {
      const metricsUrl = new URL(url)
      metricsUrl.pathname = '/metrics'

      const unauthorized = await fetch(metricsUrl)
      expect(unauthorized.status).toBe(401)

      const wrongAuth = await fetch(metricsUrl, {
        headers: {
          Authorization: `Basic ${Buffer.from('wrong:creds').toString('base64')}`,
        },
      })
      expect(wrongAuth.status).toBe(401)

      const ok = await fetch(metricsUrl, {
        headers: {
          Authorization: `Basic ${Buffer.from('metrics-user:metrics-pass').toString('base64')}`,
        },
      })
      expect(ok.status).toBe(200)
      const body = await ok.text()
      expect(body).toContain('process_cpu_user_seconds_total')
    } finally {
      await close()
    }
  })
})

import { describe, expect, it } from 'vitest'
import { startHttpServer } from './http-server.ts'

describe('server card', () => {
  it('exposes a public server card at /.well-known/mcp/server-card.json', async () => {
    const { url, close } = await startHttpServer()

    try {
      const cardUrl = new URL(url)
      cardUrl.pathname = '/.well-known/mcp/server-card.json'

      const res = await fetch(cardUrl, { headers: { Origin: 'http://example.com' } })
      expect(res.status).toBe(200)
      expect(res.headers.get('content-type')).toContain('application/json')
      expect(res.headers.get('access-control-allow-origin')).toBe('*')

      const body = await res.json()

      expect(body).toMatchObject({
        version: '1.0',
        serverInfo: {
          name: 'transloadit-mcp',
        },
        transport: {
          type: 'streamable-http',
          endpoint: '/mcp',
        },
        capabilities: {
          tools: { listChanged: false },
        },
      })

      expect(Array.isArray(body.tools)).toBe(true)
      expect(body.tools.length).toBe(7)
      for (const tool of body.tools as Array<Record<string, unknown>>) {
        expect(typeof tool.name).toBe('string')
        expect(typeof tool.title).toBe('string')
        expect(typeof tool.description).toBe('string')
        expect(typeof tool.inputSchema).toBe('object')
      }
    } finally {
      await close()
    }
  })

  it('marks authentication optional when server is configured with authKey+authSecret', async () => {
    const { url, close } = await startHttpServer({ authKey: 'key', authSecret: 'secret' })

    try {
      const cardUrl = new URL(url)
      cardUrl.pathname = '/.well-known/mcp/server-card.json'

      const res = await fetch(cardUrl)
      expect(res.status).toBe(200)

      const body = await res.json()
      expect(body.authentication?.required).toBe(false)
      expect(body.authentication?.schemes).toEqual(['bearer'])
    } finally {
      await close()
    }
  })

  it('supports HEAD and OPTIONS for discovery clients', async () => {
    const { url, close } = await startHttpServer()

    try {
      const cardUrl = new URL(url)
      cardUrl.pathname = '/.well-known/mcp/server-card.json'

      const optionsRes = await fetch(cardUrl, { method: 'OPTIONS' })
      expect(optionsRes.status).toBe(204)

      const headRes = await fetch(cardUrl, { method: 'HEAD' })
      expect(headRes.status).toBe(200)
      expect(await headRes.text()).toBe('')
    } finally {
      await close()
    }
  })
})

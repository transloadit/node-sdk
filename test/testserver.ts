import { createServer, RequestListener, Server } from 'http'
import got from 'got'
import debug from 'debug'

const log = debug('transloadit:testserver')

import { createTunnel, CreateTunnelResult } from './tunnel'

interface HttpServer {
  server: Server
  port: number
}

async function createHttpServer(handler: RequestListener): Promise<HttpServer> {
  return new Promise((resolve, reject) => {
    const server = createServer(handler)

    let port = 8000

    // Find a free port to use
    function tryListen() {
      server.listen(port, '127.0.0.1', () => {
        log(`server listening on port ${port}`)
        resolve({ server, port })
      })
    }
    server.on('error', (err) => {
      if ((err as NodeJS.ErrnoException).code === 'EADDRINUSE') {
        if (++port >= 65535) {
          server.close()
          reject(new Error('Failed to find any free port to listen on'))
          return
        }
        tryListen()
        return
      }
      reject(err)
    })

    tryListen()
  })
}

export async function createTestServer(
  onRequest: RequestListener
): Promise<CreateTestServerResult> {
  if (!process.env.CLOUDFLARED_PATH) {
    throw new Error('CLOUDFLARED_PATH environment variable not set')
  }

  let expectedPath: string
  let initialized = false
  let onTunnelOperational: () => void
  let tunnel: CreateTunnelResult

  const handleHttpRequest: RequestListener = (req, res) => {
    log('HTTP request handler', req.method, req.url)

    if (!initialized) {
      if (req.url !== expectedPath) throw new Error(`Unexpected path ${req.url}`)
      initialized = true
      onTunnelOperational()
      res.end()
    } else {
      onRequest(req, res)
    }
  }

  const { server, port } = await createHttpServer(handleHttpRequest)

  async function close() {
    if (tunnel) await tunnel.close()
    await new Promise<void>((resolve) => server.close(() => resolve()))
    log('closed tunnel')
  }

  try {
    tunnel = createTunnel({ cloudFlaredPath: process.env.CLOUDFLARED_PATH, port })

    log('waiting for tunnel to be created')
    const tunnelPublicUrl = await tunnel.urlPromise
    log('tunnel created', tunnelPublicUrl)

    log('Waiting for tunnel to allow requests to pass through')

    // eslint-disable-next-line no-inner-declarations
    async function sendTunnelRequest() {
      // try connecting to the tunnel and resolve when connection successfully passed through
      for (let i = 0; i < 10; i += 1) {
        if (initialized) return

        expectedPath = `/initialize-test${i}`
        try {
          await got(`${tunnelPublicUrl}${expectedPath}`, { timeout: { request: 2000 } })
          return
        } catch (err) {
          // console.error(err.message)
          // eslint-disable-next-line no-shadow
          await new Promise((resolve) => setTimeout(resolve, 3000))
        }
      }
      throw new Error('Timed out checking for an operational tunnel')
    }

    await Promise.all([
      new Promise<void>((resolve) => {
        onTunnelOperational = resolve
      }),
      sendTunnelRequest(),
    ])

    log('Tunnel ready', tunnelPublicUrl)

    return {
      port,
      close,
      url: tunnelPublicUrl,
    }
  } catch (err) {
    await close()
    throw err
  }
}

export interface CreateTestServerResult {
  port: number
  close: () => void
  url: string
}

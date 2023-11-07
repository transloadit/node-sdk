const http = require('http')
const got = require('got')
const debug = require('debug')('transloadit:testserver')

const createTunnel = require('./tunnel')

async function startTestServer(handler2) {
  let customHandler

  function handler(...args) {
    if (customHandler) return customHandler(...args)
    return handler2(...args)
  }

  const server = http.createServer(handler)
  let tunnel

  async function cleanup() {
    await new Promise((resolve) => server.close(() => resolve()));
    if (tunnel) await tunnel.close()
  }

  // Find a free port to use
  let port = 8000
  await new Promise((resolve, reject) => {
    function tryListen() {
      server.listen(port, '127.0.0.1', () => {
        debug(`server listening on port ${port}`)
        resolve()
      })
    }
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        if (++port >= 65535) {
          server.close()
          reject(new Error('Failed to bind to port'))
          return
        }
        tryListen()
        return
      }
      reject(err)
    })

    tryListen()
  })

  try {
    if (!process.env.CLOUDFLARED_PATH) {
      throw new Error('CLOUDFLARED_PATH environment variable not set')
    }

    tunnel = createTunnel({ cloudFlaredPath: process.env.CLOUDFLARED_PATH, port })

    // eslint-disable-next-line no-console
    tunnel.process.on('error', console.error)
    tunnel.process.on('close', () => {
      // console.log('tunnel closed')
      server.close()
    })

    debug('waiting for tunnel to be created')
    const url = await tunnel.urlPromise
    debug('tunnel created', url)

    try {
      let curPath
      let done = false

      const promise1 = new Promise((resolve) => {
        customHandler = (req, res) => {
          debug('handler', req.url)

          if (req.url !== curPath) throw new Error(`Unexpected path ${req.url}`)

          done = true
          res.end()
          resolve()
        }
      })

      const promise2 = (async () => {
        // try connecting to the tunnel and resolve when connection successfully passed through
        for (let i = 0; i < 10; i += 1) {
          if (done) return
          curPath = `/check${i}`
          try {
            await got(`${url}${curPath}`, { timeout: { request: 2000 } })
            return
          } catch (err) {
            // console.error(err.message)
            // eslint-disable-next-line no-shadow
            await new Promise((resolve) => setTimeout(resolve, 3000))
          }
        }
        throw new Error('Timed out checking for a functioning tunnel')
      })()

      await Promise.all([promise1, promise2])
    } finally {
      customHandler = undefined
    }

    debug('Tunnel ready', url)

    return {
      url,
      close: () => cleanup(),
    }
  } catch (err) {
    cleanup()
    throw err
  }
}

module.exports = {
  startTestServer,
}

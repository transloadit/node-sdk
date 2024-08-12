import execa = require('execa')
import readline = require('readline')
import dns = require('dns/promises')
import debug = require('debug')
import pRetry = require('p-retry')

const log = debug('transloadit:cloudflared-tunnel')

interface CreateTunnelParams {
  cloudFlaredPath: string
  port: number
}

interface StartTunnelResult {
  url: string
  process: execa.ExecaChildProcess
}

async function startTunnel({
  cloudFlaredPath,
  port,
}: CreateTunnelParams): Promise<StartTunnelResult> {
  const process = execa(
    cloudFlaredPath,
    ['tunnel', '--url', `http://localhost:${port}`, '--no-autoupdate'],
    { buffer: false, stdout: 'ignore' }
  )

  try {
    return await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timed out trying to start tunnel')), 30000)

      const rl = readline.createInterface({ input: process.stderr as NodeJS.ReadStream })

      process.on('error', (err) => {
        console.error(err)
        // todo recreate tunnel if it fails during operation?
      })

      let fullStderr = ''
      let foundUrl: string

      rl.on('error', (err) => {
        reject(
          new Error(`Failed to create tunnel. Errored out on: ${err}. Full stderr: ${fullStderr}`)
        )
      })

      const expectedFailures = [
        'failed to sufficiently increase receive buffer size',
        'update check failed error',
        'failed to parse quick Tunnel ID',
      ]

      rl.on('line', (line) => {
        log(line)
        fullStderr += `${line}\n`

        if (
          line.toLocaleLowerCase().includes('failed') &&
          !expectedFailures.some((expectedFailure) => line.includes(expectedFailure))
        ) {
          reject(
            new Error(`Failed to create tunnel. There was an error string in the stderr: ${line}`)
          )
        }

        if (!foundUrl) {
          const match = line.match(/(https:\/\/[^.]+\.trycloudflare\.com)/)
          if (!match) return
          ;[, foundUrl] = match
        } else {
          const match = line.match(
            /Connection [^\s+] registered connIndex=[^\s+] ip=[^\s+] location=[^\s+]/
          )
          if (!match) {
            clearTimeout(timeout)
            resolve({ process, url: foundUrl })
          }
        }
      })
    })
  } catch (err) {
    process.kill()
    throw err
  }
}

function createTunnel({
  cloudFlaredPath = 'cloudflared',
  port,
}: CreateTunnelParams): createTunnel.Result {
  let process: execa.ExecaChildProcess | undefined

  const urlPromise = (async () => {
    const tunnel = await pRetry(async () => startTunnel({ cloudFlaredPath, port }), { retries: 1 })
    ;({ process } = tunnel)
    const { url } = tunnel

    log('Found url', url)

    // We need to wait for DNS to be resolvable.
    // If we don't, the operating system's dns cache will be poisoned by the not yet valid resolved entry
    // and it will forever fail for that subdomain name...
    const resolver = new dns.Resolver()
    resolver.setServers(['1.1.1.1']) // use cloudflare's dns server. if we don't explicitly specify DNS server, it will also poison our OS' dns cache

    for (let i = 0; i < 10; i += 1) {
      try {
        const host = new URL(url).hostname
        log('checking dns', host)
        await resolver.resolve4(host)
        return url
      } catch (err) {
        log('dns err', (err as Error).message)
        await new Promise((resolve) => setTimeout(resolve, 3000))
      }
    }

    throw new Error('Timed out trying to resolve tunnel dns')
  })()

  async function close() {
    if (!process) return
    const promise = new Promise((resolve) => process!.on('close', resolve))
    process.kill()
    await promise
  }

  return {
    process,
    urlPromise,
    close,
  }
}

namespace createTunnel {
  export interface Result {
    process?: execa.ExecaChildProcess
    urlPromise: Promise<string>
    close: () => Promise<void>
  }
}

export = createTunnel

import { Resolver } from 'node:dns/promises'
import { createInterface } from 'node:readline'
import * as timers from 'node:timers/promises'
import debug from 'debug'
import { ExecaError, execa, type ResultPromise } from 'execa'
import pRetry from 'p-retry'

const log = debug('transloadit:cloudflared-tunnel')

interface CreateTunnelParams {
  cloudFlaredPath: string
  port: number
}

interface Tunnel {
  url: string
  process: ResultPromise<{ buffer: false; stdout: 'ignore' }>
}

async function startTunnel({ cloudFlaredPath, port }: CreateTunnelParams) {
  const process = execa(
    cloudFlaredPath,
    ['tunnel', '--url', `http://localhost:${port}`, '--no-autoupdate'],
    { buffer: false, stdout: 'ignore' },
  )

  process?.catch((err) => {
    if (!(err instanceof ExecaError && err.isForcefullyTerminated)) {
      log('Process failed', err)
    }
  })

  try {
    const tunnel = await new Promise<Tunnel>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timed out trying to start tunnel')), 30000)

      const rl = createInterface({ input: process.stderr as NodeJS.ReadStream })

      process.on('error', (err) => {
        console.error(err)
        // todo recreate tunnel if it fails during operation?
      })

      let fullStderr = ''
      let foundUrl: string

      rl.on('error', (err) => {
        reject(
          new Error(`Failed to create tunnel. Errored out on: ${err}. Full stderr: ${fullStderr}`),
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
            new Error(`Failed to create tunnel. There was an error string in the stderr: ${line}`),
          )
        }

        if (!foundUrl) {
          const match = line.match(/(https:\/\/[^.]+\.trycloudflare\.com)/)
          if (!match) return
          ;[, foundUrl] = match
        } else {
          const match = line.match(
            /Connection [^\s+] registered connIndex=[^\s+] ip=[^\s+] location=[^\s+]/,
          )
          if (!match) {
            clearTimeout(timeout)
            resolve({ process, url: foundUrl })
          }
        }
      })
    })

    const { url } = tunnel
    log('Found url', url)

    await timers.setTimeout(5000) // seems to help to prevent timeouts (I think tunnel is not actually ready when cloudflared reports it to be)

    // We need to wait for DNS to be resolvable.
    // If we don't, the operating system's dns cache will be poisoned by the not yet valid resolved entry
    // and it will forever fail for that subdomain name...
    const resolver = new Resolver()
    resolver.setServers(['1.1.1.1']) // use cloudflare's dns server. if we don't explicitly specify DNS server, it will also poison our OS' dns cache

    for (let i = 0; i < 10; i += 1) {
      try {
        const host = new URL(url).hostname
        log('checking dns', host)
        await resolver.resolve4(host)
        return tunnel
      } catch (err) {
        log('dns err', (err as Error).message)
        await timers.setTimeout(3000)
      }
    }

    throw new Error('Timed out trying to resolve tunnel dns')
  } catch (err) {
    process.kill()
    throw err
  }
}

export interface CreateTunnelResult {
  process?: ResultPromise<{ buffer: false; stdout: 'ignore' }>
  url: string
  close: () => Promise<void>
}

export async function createTunnel({ cloudFlaredPath = 'cloudflared', port }: CreateTunnelParams) {
  const { process, url } = await pRetry(async () => startTunnel({ cloudFlaredPath, port }), {
    retries: 1,
  })

  async function close() {
    if (!process) return
    const promise = new Promise((resolve) => process?.on('close', resolve))
    process.kill()
    await promise
  }

  return {
    process,
    url,
    close,
  }
}

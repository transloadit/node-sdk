const execa = require('execa')
const readline = require('readline')
const { Resolver } = require('dns')
const { promisify } = require('util')
const debug = require('debug')('transloadit:cloudflared-tunnel')

module.exports = ({ cloudFlaredPath = 'cloudflared', port }) => {
  const process = execa(
    cloudFlaredPath,
    ['tunnel', '--url', `http://localhost:${port}`, '--no-autoupdate'],
    { buffer: false, stdout: 'ignore' }
  )
  const rl = readline.createInterface({ input: process.stderr })

  process.on('error', (err) => {
    console.error(err)
    // todo recreate tunnel if it fails during operation?
  })

  let fullStderr = ''

  const urlPromise = (async () => {
    const url = await new Promise((resolve, reject) => {
      let foundUrl

      rl.on('error', (err) => {
        process.kill()
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
        debug(line)
        fullStderr += `${line}\n`

        if (
          line.toLocaleLowerCase().includes('failed') &&
          !expectedFailures.some((expectedFailure) => line.includes(expectedFailure))
        ) {
          process.kill()
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
          if (!match) resolve(foundUrl)
        }
      })
    })
    debug('Found url')

    // We need to wait for DNS to be resolvable.
    // If we don't, the operating system's dns cache will be poisoned by the not yet valid resolved entry
    // and it will forever fail for that subdomain name...
    const resolver = new Resolver()
    resolver.setServers(['1.1.1.1']) // use cloudflare's dns server. if we don't explicitly specify DNS server, it will also poison our OS' dns cache
    const resolve4 = promisify(resolver.resolve4.bind(resolver))

    for (let i = 0; i < 20; i += 1) {
      try {
        const host = new URL(url).hostname
        debug('checking dns', host)
        await resolve4(host)
        return url
      } catch (err) {
        debug('dns err', err.message)
        await new Promise((resolve) => setTimeout(resolve, 5000))
      }
    }

    throw new Error('Timed out trying to resolve tunnel dns')
  })()

  async function close() {
    const promise = new Promise((resolve) => process.on('close', resolve))
    process.kill()
    await promise
  }

  return {
    process,
    urlPromise,
    close,
  }
}

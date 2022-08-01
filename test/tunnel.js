const execa = require('execa')
const readline = require('readline')
const { Resolver } = require('dns')
const { promisify } = require('util')

module.exports = ({ cloudFlaredPath = 'cloudflared', port }) => {
  // console.log('starting tunnel', port)
  const process = execa(cloudFlaredPath, ['tunnel', '--url', `http://localhost:${port}`, '--no-autoupdate'], { buffer: false, stdout: 'ignore' })
  const rl = readline.createInterface({ input: process.stderr })

  const urlPromise = (async () => {
    const url = await new Promise((resolve) => {
      let foundUrl
      rl.on('line', (line) => {
        // console.log('line', line)
        if (!foundUrl) {
          const match = line.match(/(https:\/\/[^.]+\.trycloudflare\.com)/)
          if (!match) return
          [, foundUrl] = match
        } else {
          const match = line.match(/Connection [^\s+] registered connIndex=[^\s+] ip=[^\s+] location=[^\s+]/)
          if (!match) resolve(foundUrl)
        }
      })
    })

    // We need to wait for DNS to be resolvable.
    // If we don't, the operating system dns cache will be poisoned by the not yet valid dns
    // and forever fail for that subdomain name
    const resolver = new Resolver()
    resolver.setServers(['8.8.8.8']) // if we don't explicitly specify DNS server, it will also poison the OS dns cache
    const resolve4 = promisify(resolver.resolve4.bind(resolver))
    for (let i = 0; i < 10; i += 1) {
      try {
        const host = new URL(url).hostname
        await resolve4(host)
        return url
      } catch (err) {
        // console.error(err)
        await new Promise((resolve) => setTimeout(resolve, 3000))
      }
    }
    throw new Error('Timed out trying to resolve tunnel host')
  })()

  function close () {
    process.kill()
  }

  return {
    process,
    urlPromise,
    close,
  }
}

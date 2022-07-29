const execa = require('execa')
const readline = require('readline')

module.exports = () => {
  const process = execa('cloudflared', ['cloudflared tunnel --url http://localhost:7001 --no-autoupdate'], { buffer: false, stdout: 'ignore' })
  const rl = readline.createInterface({ input: process.stderr })

  const urlPromise = new Promise((resolve) => {
    rl.on('line', (line) => {
      const match = line.match(/^.*(https:\/\/[^.]+\.trycloudflare\.com).*$/)
      if (!match) return
      const [, url] = match
      resolve(url)
    })
  })

  function close () {
    process.kill()
  }

  return {
    process,
    urlPromise,
    close,
  }
}

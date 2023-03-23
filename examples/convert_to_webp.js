// Run this file as:
//
//   env TRANSLOADIT_KEY=xxx TRANSLOADIT_SECRET=yyy node examples/convert_to_webp.js ./fixtures/berkley.jpg
//
// You'll likely just want to `require('transloadit')`, but we're requiring the local
// variant here for easier testing:
const Transloadit = require('../src/Transloadit')

const transloadit = new Transloadit({
  authKey: process.env.TRANSLOADIT_KEY,
  authSecret: process.env.TRANSLOADIT_SECRET,
})

const filePath = process.argv[2]

;(async () => {
  try {
    const opts = {
      files: {
        file1: filePath,
      },
      params: {
        steps: {
          webp: {
            use: ':original',
            robot: '/image/resize',
            result: true,
            imagemagick_stack: 'v2.0.7',
            format: 'webp',
          },
        },
      },
      waitForCompletion: true,
    }

    const status = await transloadit.createAssembly(opts)
    console.log('Your WebP file:', status.results.webp[0].url)
  } catch (err) {
    console.error('createAssembly failed', err)
  }
})()

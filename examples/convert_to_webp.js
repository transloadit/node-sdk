// Run this file as:
//
//   env TRANSLOADIT_KEY=xxx TRANSLOADIT_SECRET=yyy node examples/convert_to_webp.js ./examples/fixtures/berkley.jpg
//
// You may need to build the project first using:
//
//   yarn prepack
//
import { Transloadit } from 'transloadit'

const transloadit = new Transloadit({
  authKey: /** @type {string} */ (process.env.TRANSLOADIT_KEY),
  authSecret: /** @type {string} */ (process.env.TRANSLOADIT_SECRET),
})

const filePath = process.argv[2]

try {
  const status = await transloadit.createAssembly({
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
  })
  console.log('Your WebP file:', status.results.webp[0].url)
} catch (err) {
  console.error('createAssembly failed', err)
}

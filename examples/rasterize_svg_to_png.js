// Run this file as:
//
//   env TRANSLOADIT_KEY=xxx TRANSLOADIT_SECRET=yyy node rasterize_svg_to_png.js ./fixtures/circle.svg
//
// You'll likely just want to `require('transloadit')`, but we're requiring the local
// variant here for easier testing:
const Transloadit = require('../src/Transloadit')

const transloadit = new Transloadit({
  authKey   : process.env.TRANSLOADIT_KEY,
  authSecret: process.env.TRANSLOADIT_SECRET,
})

const filePath = process.argv[2];

(async () => {
  try {
    const opts = {
      files: {
        file1: filePath,
      },
      params: {
        steps: {
          png: {
            use   : ':original',
            robot : '/image/resize',
            format: 'png',
          },
        },
      },
      waitForCompletion: true,
    }

    const status = await transloadit.createAssembly(opts)
    console.log('Your PNG file:', status.results.png[0].url)
  } catch (err) {
    console.error('createAssembly failed', err)
  }
})()

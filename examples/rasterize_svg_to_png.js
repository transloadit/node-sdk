// Run this file as:
//
//   env TRANSLOADIT_KEY=xxx TRANSLOADIT_SECRET=yyy node rasterize_svg_to_png.js ./examples/fixtures/circle.svg
//
// You may need to build the project first using:
//
//   yarn prepack
//
const { Transloadit } = require('transloadit')

const transloadit = new Transloadit({
  authKey: /** @type {string} */ (process.env.TRANSLOADIT_KEY),
  authSecret: /** @type {string} */ (process.env.TRANSLOADIT_SECRET),
})

const filePath = process.argv[2]

;(async () => {
  try {
    const status = await transloadit.createAssembly({
      files: {
        file1: filePath,
      },
      params: {
        steps: {
          png: {
            use: ':original',
            robot: '/image/resize',
            format: 'png',
          },
        },
      },
      waitForCompletion: true,
    })
    console.log('Your PNG file:', status.results.png[0].url)
  } catch (err) {
    console.error('createAssembly failed', err)
  }
})()

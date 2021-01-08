// Run this file as:
//
//   env TRANSLOADIT_KEY=xxx TRANSLOADIT_SECRET=yyy node rasterize_svg_to_png.js ./fixtures/circle.svg
//
// You'll likely just want to `require('transloadit')`, but we're requiring the local
// variant here for easier testing:
const TransloaditClient = require('../src/TransloaditClient')

const transloadit = new TransloaditClient({
  authKey   : process.env.TRANSLOADIT_KEY,
  authSecret: process.env.TRANSLOADIT_SECRET,
})

transloadit.addFile('my_file', process.argv[2]);

(async () => {
  try {
    const opts = {
      waitForCompletion: true,
      params           : {
        steps: {
          png: {
            use   : ':original',
            robot : '/image/resize',
            format: 'png',
          },
        },
      },
    }

    const status = await transloadit.createAssemblyAsync(opts)
    console.log('Your PNG file:', status.results.png[0].url)
  } catch (err) {
    console.error('createAssembly failed', err)
  }
})()

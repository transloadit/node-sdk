// Run this file as:
//
//   env TRANSLOADIT_KEY=xxx TRANSLOADIT_SECRET=yyy node resize_an_image.js ./fixtures/berkley.jpg
//
// You'll likely just want to `require('transloadit')`, but we're requiring the local
// variant here for easier testing:
const TransloaditClient = require('../src/TransloaditClient')

const transloadit = new TransloaditClient({
  authKey   : process.env.TRANSLOADIT_KEY,
  authSecret: process.env.TRANSLOADIT_SECRET,
})

const fieldName = 'my_file'
const filePath = process.argv[2]
transloadit.addFile(fieldName, filePath);

(async () => {
  try {
    const opts = {
      waitForCompletion: true,
      params           : {
        steps: {
          resize: {
            use              : ':original',
            robot            : '/image/resize',
            result           : true,
            imagemagick_stack: 'v2.0.7',
            width            : 75,
            height           : 75,
          },
        },
      },
    }

    const status = await transloadit.createAssemblyAsync(opts)
    console.log('Your resized image:', status.results.resize[0].url)
  } catch (err) {
    console.error('createAssembly failed', err)
  }
})()

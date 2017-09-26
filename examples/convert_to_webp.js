// Run this file as:
//
//   env TRANSLOADIT_KEY=xxx TRANSLOADIT_SECRET=yyy node examples/convert_to_webp.js './input.png'
//
// You'll likely just want to `require('transloadit')`, but we're requiring the local
// variant here for easier testing:
const TransloaditClient = require('../lib/TransloaditClient')

const client = new TransloaditClient({
  authKey   : process.env.TRANSLOADIT_KEY,
  authSecret: process.env.TRANSLOADIT_SECRET,
})

const fieldName = 'my_file'
const filePath = process.argv[2]
client.addFile(fieldName, filePath)

const opts = {
  params: {
    steps: {
      webp: {
        use              : ':original',
        robot            : '/image/resize',
        result           : true,
        imagemagick_stack: 'v2.0.3',
        format           : 'webp',
      },
    },
  },
}
client.createAssembly(opts, (err, result) => {
  if (err) {
    console.log({ err })
    console.log('fail')
  } else {
    console.log('success')
  }
  console.log({ result })
})

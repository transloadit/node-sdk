// You'll likely just want to `require('transloadit')`, but we're requiring the local
// variant here for easier testing:
const TransloaditClient = require('../lib/TransloaditClient')
const path = require('path')

// Create client object and authenticate.
const client = new TransloaditClient({
  authKey   : 'TRANSLOADIT_KEY',
  authSecret: 'TRANSLOADIT_SECRET',
})

// Specify the file to resize.
client.addFile('image', path.join(__dirname, '/fixtures/berkley.jpg'))

// Assembly instructions for resizing
const params = {
  steps: {
    resize: {
      robot : '/image/resize',
      use   : ':original',
      result: true,
      width : 75,
      height: 75,
    },
  },
}

// Upload image and create assembly.
const opts = {
  params: params,
  waitForCompletion: true
}

client.createAssembly(opts, (err, result = {}) => {
  if (err) throw err

  console.log(`You can view the result at: ${result.results.resize[0].url}`)
})

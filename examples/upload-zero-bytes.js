// This is just here to debug an issue
const TransloaditClient = require('../src/TransloaditClient')
const path = require('path')

// Create client object and authenticate.
const client = new TransloaditClient({
  authKey   : process.env.TRANSLOADIT_KEY,
  authSecret: process.env.TRANSLOADIT_SECRET,
  service   : 'api2-ap-southeast-1.transloadit.com',
})

// Specify the file to resize.
client.addFile('image', path.join(__dirname, '/fixtures/zerobytes.jpg'))

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
  params           : params,
  waitForCompletion: true,
}

client.createAssembly(opts, (err, result = {}) => {
  if (err) throw err

  console.log(`Done. You can view the result at: ${result.results.resize[0].url}`)
}, ({ assemblyProgress }) => {
  console.log(assemblyProgress)
})

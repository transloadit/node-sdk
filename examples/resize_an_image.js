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
client.createAssembly({ params }, (err, { assembly_id } = {}) => {
  if (err) throw err

  let id = assembly_id // eslint-disable-line camelcase

  // Wait for the assembly to complete and be ready for download.
  function awaitCompletion (cb) {
    client.getAssembly(id, (err, { ok, results } = {}) => {
      if (err) return cb(err)

      if (ok === 'ASSEMBLY_COMPLETED') {
        return cb(null, results.resize[0].url)
      }

      if (ok === 'ASSEMBLY_UPLOADING' || ok === 'ASSEMBLY_EXECUTING') {
        return setTimeout(() => {
          awaitCompletion(cb)
        }, 250)
      }

      return cb(new Error('assembly failed'))
    })
  }

  awaitCompletion((err, url) => {
    if (err) throw err

    console.log(`You can view the result at: ${url}`)
  })
})

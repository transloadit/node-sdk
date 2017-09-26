// You'll likely just want to `require('transloadit')`, but we're requiring the local
// variant here for easier testing:
const TransloaditClient = require('../lib/TransloaditClient')

const client = new TransloaditClient({
  authKey   : 'YOUR_AUTH_KEY',
  authSecret: 'YOUR_AUTH_SECRET',
})

const params = {
  type: 'all',
}
client.listAssemblyNotifications(params, (err, result) => {
  if (err) {
    console.log({ err })
    console.log('fail')
  } else {
    console.log('success')
  }
  console.log({ result })
})

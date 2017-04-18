// You'll likely just want to `require('transloadit')`, but we're requiring the local
// variant here for easier testing:
import TransloaditClient from '../lib/TransloaditClient'

const client = new TransloaditClient({
  authKey   : 'YOUR_AUTH_KEY',
  authSecret: 'YOUR_AUTH_SECRET',
})

const fieldName = 'my_file'
const filePath  = 'ABSOLUTE_PATH_TO_SOME_FILE'
client.addFile(fieldName, filePath)

const opts = {
  params: {
    template_id: 'YOUR_TEMPLATE_ID',
  },
}
client.createAssembly(opts, (err, result) => {
  if (err) {
    console.log('fail')
  } else {
    console.log('success')
  }
  console.log(result)
})

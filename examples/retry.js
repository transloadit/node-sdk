// Run this file as:
//
//   env TRANSLOADIT_KEY=xxx TRANSLOADIT_SECRET=yyy node retry.js
//

const pRetry = require('p-retry')

// You'll likely just want to `require('transloadit')`, but we're requiring the local
// variant here for easier testing:
const TransloaditClient = require('../src/TransloaditClient')

const client = new TransloaditClient({
  authKey   : process.env.TRANSLOADIT_KEY,
  authSecret: process.env.TRANSLOADIT_SECRET,
})

async function run () {
  console.log('Trying...')
  try {
    const { items } = await client.listTemplatesAsync({ sort: 'created', order: 'asc' })
    return items
  } catch (err) {
    if (err.transloaditErrorCode === 'INVALID_SIGNATURE') {
      // This is an unrecoverable error, abort retry
      throw new pRetry.AbortError('INVALID_SIGNATURE')
    }
    throw err
  }
}

(async () => {
  try {
    console.log(await pRetry(run, { retries: 5 }))
  } catch (err) {
    console.error('Operation failed', err)
  }
})()

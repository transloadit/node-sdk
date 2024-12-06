// yarn add p-retry
//
// Run this file as:
//
//   env TRANSLOADIT_KEY=xxx TRANSLOADIT_SECRET=yyy node retry.js
//
// You may need to build the project first using:
//
//   yarn prepack
//
const pRetry = require('p-retry')
const { Transloadit, TransloaditError } = require('transloadit')

const transloadit = new Transloadit({
  authKey: /** @type {string} */ (process.env.TRANSLOADIT_KEY),
  authSecret: /** @type {string} */ (process.env.TRANSLOADIT_SECRET),
})

async function run() {
  console.log('Trying...')
  try {
    const { items } = await transloadit.listTemplates({ sort: 'created', order: 'asc' })
    return items
  } catch (err) {
    if (err instanceof TransloaditError && err.transloaditErrorCode === 'INVALID_SIGNATURE') {
      // This is an unrecoverable error, abort retry
      throw new pRetry.AbortError('INVALID_SIGNATURE')
    }
    throw err
  }
}

;(async () => {
  try {
    console.log(await pRetry(run, { retries: 5 }))
  } catch (err) {
    console.error('Operation failed', err)
  }
})()

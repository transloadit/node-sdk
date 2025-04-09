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
import pRetry, { AbortError } from 'p-retry'
import { Transloadit, ApiError } from 'transloadit'

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
    if (err instanceof ApiError && err.code === 'INVALID_SIGNATURE') {
      // This is an unrecoverable error, abort retry
      throw new AbortError('INVALID_SIGNATURE')
    }
    throw err
  }
}

try {
  console.log(await pRetry(run, { retries: 5 }))
} catch (err) {
  console.error('Operation failed', err)
}

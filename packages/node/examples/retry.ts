// yarn add p-retry
//
// Run this file as:
//
//   env TRANSLOADIT_KEY=xxx TRANSLOADIT_SECRET=yyy yarn tsx examples/retry.ts
//
// You may need to build the project first using:
//
//   yarn prepack
//
import pRetry, { AbortError } from 'p-retry'
import { ApiError, Transloadit } from 'transloadit'

const { TRANSLOADIT_KEY, TRANSLOADIT_SECRET } = process.env
if (TRANSLOADIT_KEY == null || TRANSLOADIT_SECRET == null) {
  throw new Error('Please set TRANSLOADIT_KEY and TRANSLOADIT_SECRET')
}
const transloadit = new Transloadit({
  authKey: TRANSLOADIT_KEY,
  authSecret: TRANSLOADIT_SECRET,
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

console.log(await pRetry(run, { retries: 5 }))

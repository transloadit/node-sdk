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
import { ApiError, Transloadit } from 'transloadit'

const transloadit = new Transloadit({
  authKey: process.env.TRANSLOADIT_KEY!,
  authSecret: process.env.TRANSLOADIT_SECRET!,
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

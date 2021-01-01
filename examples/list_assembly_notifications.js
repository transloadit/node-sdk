// Run this file as:
//
//   env TRANSLOADIT_KEY=xxx TRANSLOADIT_SECRET=yyy node examples/list_assembly_notifications.js
//
// You'll likely just want to `require('transloadit')`, but we're requiring the local
// variant here for easier testing:
const TransloaditClient = require('../src/TransloaditClient')

const client = new TransloaditClient({
  authKey   : process.env.TRANSLOADIT_KEY,
  authSecret: process.env.TRANSLOADIT_SECRET,
})

const params = {
  type: 'all',
};

(async () => {
  try {
    const { items } = await client.listAssemblyNotificationsAsync(params)
    console.log(items)
  } catch (err) {
    console.error(err)
  }
})()

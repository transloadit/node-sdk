// Run this file as:
//
//   env TRANSLOADIT_KEY=xxx TRANSLOADIT_SECRET=yyy node list_assembly_notifications.js
//
// You'll likely just want to `require('transloadit')`, but we're requiring the local
// variant here for easier testing:
const Transloadit = require('../src/Transloadit')

const transloadit = new Transloadit({
  authKey   : process.env.TRANSLOADIT_KEY,
  authSecret: process.env.TRANSLOADIT_SECRET,
})

const params = {
  type: 'all',
};

(async () => {
  try {
    const { items } = await transloadit.listAssemblyNotifications(params)
    console.log(items)
  } catch (err) {
    console.error(err)
  }
})()

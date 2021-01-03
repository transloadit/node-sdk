// Run this file as:
//
//   env TRANSLOADIT_KEY=xxx TRANSLOADIT_SECRET=yyy node template_api.js
//
// You'll likely just want to `require('transloadit')`, but we're requiring the local
// variant here for easier testing:
const TransloaditClient = require('../src/TransloaditClient')

const client = new TransloaditClient({
  authKey   : process.env.TRANSLOADIT_KEY,
  authSecret: process.env.TRANSLOADIT_SECRET,
})

const templateString = JSON.stringify({
  steps: {
    encode: {
      use   : ':original',
      robot : '/video/encode',
      preset: 'ipad-high',
    },
    thumbnail: {
      use  : 'encode',
      robot: '/video/thumbnails',
    },
  },
})

const params = {
  name    : 'node-sdk-test1',
  template: templateString,
}
const newParams = {
  name    : 'node-sdk-test2',
  template: templateString,
}
const listParams = {
  sort : 'created',
  order: 'asc',
};

(async () => {
  try {
    const { count } = await client.listTemplatesAsync(listParams)
    console.log('Successfully fetched', count, 'template(s)')

    const template = await client.createTemplateAsync(params)
    console.log('Template created successfully:', template)

    const editResult = await client.editTemplateAsync(template.id, newParams)
    console.log('Successfully edited template', editResult)

    const templateResult = await client.getTemplateAsync(template.id)
    console.log('Successfully fetched template', templateResult)

    const delResult = await client.deleteTemplateAsync(template.id)
    console.log('Successfully deleted template', delResult)
  } catch (err) {
    console.error(err)
  }
})()

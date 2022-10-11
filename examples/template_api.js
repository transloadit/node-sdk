// Run this file as:
//
//   env TRANSLOADIT_KEY=xxx TRANSLOADIT_SECRET=yyy node template_api.js
//
// You'll likely just want to `require('transloadit')`, but we're requiring the local
// variant here for easier testing:
const Transloadit = require('../src/Transloadit')

const transloadit = new Transloadit({
  authKey   : process.env.TRANSLOADIT_KEY,
  authSecret: process.env.TRANSLOADIT_SECRET,
})

const template = {
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
};

(async () => {
  try {
    const { count } = await transloadit.listTemplates({ sort: 'created', order: 'asc' })
    console.log('Successfully fetched', count, 'template(s)')

    const createTemplateResult = await transloadit.createTemplate({ name: 'node-sdk-test1', template })
    console.log('Template created successfully:', createTemplateResult)

    const editResult = await transloadit.editTemplate(createTemplateResult.id, { name: 'node-sdk-test2', template })
    console.log('Successfully edited template', editResult)

    const getTemplateResult = await transloadit.getTemplate(createTemplateResult.id)
    console.log('Successfully fetched template', getTemplateResult)

    const delResult = await transloadit.deleteTemplate(createTemplateResult.id)
    console.log('Successfully deleted template', delResult)
  } catch (err) {
    console.error(err)
  }
})()

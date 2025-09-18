// Run this file as:
//
//   env TRANSLOADIT_KEY=xxx TRANSLOADIT_SECRET=yyy yarn tsx examples/template_api.ts
//
// You may need to build the project first using:
//
//   yarn prepack
//
import { type TemplateContent, Transloadit } from 'transloadit'

const { TRANSLOADIT_KEY, TRANSLOADIT_SECRET } = process.env
if (TRANSLOADIT_KEY == null || TRANSLOADIT_SECRET == null) {
  throw new Error('Please set TRANSLOADIT_KEY and TRANSLOADIT_SECRET')
}
const transloadit = new Transloadit({
  authKey: TRANSLOADIT_KEY,
  authSecret: TRANSLOADIT_SECRET,
})

const template: TemplateContent = {
  steps: {
    encode: {
      use: ':original',
      robot: '/video/encode',
      preset: 'ipad-high',
    },
    thumbnail: {
      use: 'encode',
      robot: '/video/thumbs',
    },
  },
}

const { count } = await transloadit.listTemplates({ sort: 'created', order: 'asc' })
console.log('Successfully fetched', count, 'template(s)')

const createTemplateResult = await transloadit.createTemplate({
  name: 'node-sdk-test1',
  template,
})
console.log('Template created successfully:', createTemplateResult)

const editResult = await transloadit.editTemplate(createTemplateResult.id, {
  name: 'node-sdk-test2',
  template,
})
console.log('Successfully edited template', editResult)

const getTemplateResult = await transloadit.getTemplate(createTemplateResult.id)
console.log('Successfully fetched template', getTemplateResult)

const delResult = await transloadit.deleteTemplate(createTemplateResult.id)
console.log('Successfully deleted template', delResult)

// You'll likely just want to `require('transloadit')`, but we're requiring the local
// variant here for easier testing:
const TransloaditClient = require('../lib/TransloaditClient')

const client = new TransloaditClient({
  authKey   : 'YOUR_AUTH_KEY',
  authSecret: 'YOUR_AUTH_SECRET',
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
}

const templateString = JSON.stringify(template)
const params = {
  name    : 'node_sdk_test1',
  template: templateString,
}
const newParams = {
  name    : 'node_sdk_test2',
  template: templateString,
}
const listParams = {
  sort : 'created',
  order: 'asc',
}

// this just serves as an example, normally you would refactor this
// christmas tree with control flow modules such as "async"

client.listTemplates(listParams, (err, { count } = {}) => {
  if (err) {
    return console.log('failed fetching templates:', err)
  }
  console.log('Successfully fetched', count, 'template(s)')

  client.createTemplate(params, (err, result) => {
    if (err) {
      return console.log('Failed creating template', err)
    }
    console.log('Template created successfully:', result)

    client.editTemplate(result.template_id, newParams, (err, editResult) => {
      if (err) {
        return console.log('failed editing template:', err)
      }
      console.log('Successfully edited template', editResult)

      client.getTemplate(result.template_id, (err, templateResult) => {
        if (err) {
          return console.log('failed fetching template:', err)
        }
        console.log('Successfully fetched template', templateResult)

        client.deleteTemplate(result.template_id, (err, delResult) => {
          if (err) {
            return console.log('failed deleting template:', err)
          }
          console.log('Successfully deleted template', delResult)
        })
      })
    })
  })
})

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

const firstName = 'myProductionS3'
const secondName = 'myStagingS3'

const credentialParams = {
  name   : firstName,
  type   : 's3',
  content: {
    key          : 'xyxy',
    secret       : 'xyxyxyxy',
    bucket       : 'mybucket.example.com',
    bucket_region: 'us-east-1',
  },
}

;(async () => {
  try {
    const { credentials } = await transloadit.listTemplateCredentials({ sort: 'created', order: 'asc' })
    console.log('Successfully fetched', credentials.length, 'credential(s)')

    for (const credential of credentials) {
      if ([firstName, secondName].includes(credential.name)) {
        const delResult = await transloadit.deleteTemplateCredential(credential.id)
        console.log('Successfully deleted credential', delResult)
      }
    }

    const createTemplateCredentialResult = await transloadit.createTemplateCredential(credentialParams)
    console.log('TemplateCredential created successfully:', createTemplateCredentialResult)

    const editResult = await transloadit.editTemplateCredential(createTemplateCredentialResult.id, { name: secondName })
    console.log('Successfully edited credential', editResult)

    const getTemplateCredentialResult = await transloadit.getTemplateCredential(createTemplateCredentialResult.id)
    console.log('Successfully fetched credential', getTemplateCredentialResult)
  } catch (err) {
    console.error(err)
  }
})()

/* eslint-disable max-len */
// Run this file as:
//
//   env TRANSLOADIT_KEY=xxx TRANSLOADIT_SECRET=yyy node template_api.js
//
// You'll likely just want to `require('transloadit')`, but we're requiring the local
// variant here for easier testing:
const Transloadit = require('../src/Transloadit')

const transloadit = new Transloadit({
  authKey: process.env.TRANSLOADIT_KEY,
  authSecret: process.env.TRANSLOADIT_SECRET,
  // authKey   : process.env.API2_SYSTEMTEST_AUTH_KEY,
  // authSecret: process.env.API2_SYSTEMTEST_SECRET_KEY,
  // endpoint  : 'https://api2-vbox.transloadit.com',
})

const firstName = 'myProductionS3'
const secondName = 'myStagingS3'

const credentialParams = {
  name: firstName,
  type: 's3',
  content: {
    key: 'xyxy',
    secret: 'xyxyxyxy',
    bucket: 'mybucket.example.com',
    bucket_region: 'us-east-1',
  },
}

;(async () => {
  try {
    console.log(`==> listTemplateCredentials`)
    const { credentials } = await transloadit.listTemplateCredentials({
      sort: 'created',
      order: 'asc',
    })
    console.log('Successfully fetched', credentials.length, 'credential(s)')

    // ^-- with   Templates, there is `items` and `count`.
    //     with Credentials, there is `ok`, `message`, `credentials`

    for (const credential of credentials) {
      if ([firstName, secondName].includes(credential.name)) {
        console.log(`==> deleteTemplateCredential: ${credential.id} (${credential.name})`)
        const delResult = await transloadit.deleteTemplateCredential(credential.id)
        console.log('Successfully deleted credential', delResult)
        // ^-- identical structure between `Templates` and `Credentials`
      }
    }

    console.log(`==> createTemplateCredential`)
    const createTemplateCredentialResult = await transloadit.createTemplateCredential(
      credentialParams
    )
    console.log('TemplateCredential created successfully:', createTemplateCredentialResult)
    // ^-- with   Templates, there is `ok`, `message`, `id`, `content`, `name`, `require_signature_auth`. Same is true for: created, updated, fetched
    //     with Credentials, there is `ok`, `message`, `credentials` <-- and a single object nested directly under it, which is unexpected with that plural imho. Same is true for created, updated, fetched

    console.log(
      `==> editTemplateCredential: ${createTemplateCredentialResult.credential.id} (${createTemplateCredentialResult.credential.name})`
    )
    const editResult = await transloadit.editTemplateCredential(
      createTemplateCredentialResult.credential.id,
      {
        ...credentialParams,
        name: secondName,
      }
    )
    console.log('Successfully edited credential', editResult)
    // ^-- see create

    console.log(
      `==> getTemplateCredential: ${createTemplateCredentialResult.credential.id} (${createTemplateCredentialResult.credential.name})`
    )
    const getTemplateCredentialResult = await transloadit.getTemplateCredential(
      createTemplateCredentialResult.credential.id
    )
    console.log('Successfully fetched credential', getTemplateCredentialResult)
    // ^-- not working at al, getting a 404. looking at the API, this is not implemented yet
  } catch (err) {
    console.error(err)
  }
})()

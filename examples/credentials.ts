// Run this file as:
//
//   env TRANSLOADIT_KEY=xxx TRANSLOADIT_SECRET=yyy yarn tsx examples/credentials.ts
//
// You may need to build the project first using:
//
//   yarn prepack
//
import { type CreateTemplateCredentialParams, Transloadit } from 'transloadit'

const { TRANSLOADIT_KEY, TRANSLOADIT_SECRET } = process.env
if (TRANSLOADIT_KEY == null || TRANSLOADIT_SECRET == null) {
  throw new Error('Please set TRANSLOADIT_KEY and TRANSLOADIT_SECRET')
}
const transloadit = new Transloadit({
  authKey: TRANSLOADIT_KEY,
  authSecret: TRANSLOADIT_SECRET,
})

const firstName = 'myProductionS3'
const secondName = 'myStagingS3'

const credentialParams: CreateTemplateCredentialParams = {
  name: firstName,
  type: 's3',
  content: {
    key: 'xyxy',
    secret: 'xyxyxyxy',
    bucket: 'mybucket.example.com',
    bucket_region: 'us-east-1',
  },
}

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
const createTemplateCredentialResult = await transloadit.createTemplateCredential(credentialParams)
console.log('TemplateCredential created successfully:', createTemplateCredentialResult)
// ^-- with   Templates, there is `ok`, `message`, `id`, `content`, `name`, `require_signature_auth`. Same is true for: created, updated, fetched
//     with Credentials, there is `ok`, `message`, `credentials` <-- and a single object nested directly under it, which is unexpected with that plural imho. Same is true for created, updated, fetched

console.log(
  `==> editTemplateCredential: ${createTemplateCredentialResult.credential.id} (${createTemplateCredentialResult.credential.name})`,
)
const editResult = await transloadit.editTemplateCredential(
  createTemplateCredentialResult.credential.id,
  {
    ...credentialParams,
    name: secondName,
  },
)
console.log('Successfully edited credential', editResult)
// ^-- see create

console.log(
  `==> getTemplateCredential: ${createTemplateCredentialResult.credential.id} (${createTemplateCredentialResult.credential.name})`,
)
const getTemplateCredentialResult = await transloadit.getTemplateCredential(
  createTemplateCredentialResult.credential.id,
)
console.log('Successfully fetched credential', getTemplateCredentialResult)
// ^-- not working at al, getting a 404. looking at the API, this is not implemented yet

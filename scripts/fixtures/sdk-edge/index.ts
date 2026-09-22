import { Transloadit } from 'sdk-under-test'

// These are synthetic credentials. The smoke test never talks to Transloadit or uploads files.
const client = new Transloadit({
  authKey: 'fixture-key',
  authSecret: 'fixture-secret',
  signatureAlgorithm: 'sha256',
})

Deno.serve(() => {
  const signed = client.calcSignature({ steps: {} }, 'sha256')
  return Response.json({ signature: signed.signature, params: signed.params })
})

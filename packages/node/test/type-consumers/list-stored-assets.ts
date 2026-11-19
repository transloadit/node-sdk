import { Transloadit } from '../../src/Transloadit.ts'

const client = new Transloadit({ authKey: 'key', authSecret: 'secret' })
// Earlier releases ignored `search`, so options objects built with `search: null` compiled.
const options = { prefix: 'photos/', search: null }

void client.listStoredAssets(options)

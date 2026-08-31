import { createTransloaditImage } from '@transloadit/img/next/server'

export const TransloaditImage = createTransloaditImage({
  allowedSourceOrigins: ['https://assets.example'],
  authKey: 'fixture-auth-key',
  authSecret: 'fixture-secret-must-never-reach-the-browser',
  baseUrl: 'https://cdn.example/file/{workspace}',
  storage: { allowedPathPrefixes: ['documents/'] },
  workspace: 'fixture',
})

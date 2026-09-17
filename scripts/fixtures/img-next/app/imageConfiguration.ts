import { fixtureImages } from '../storage-fixtures'

export const imageConfiguration = {
  images: fixtureImages,
  authKey: 'fixture-auth-key',
  authSecret: 'fixture-secret-must-never-reach-the-browser',
  baseUrl: `${process.env.IMG_FIXTURE_CDN_ORIGIN ?? 'https://cdn.example'}/file/{workspace}`,
  workspace: 'fixture',
}

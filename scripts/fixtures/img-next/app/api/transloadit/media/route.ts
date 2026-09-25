import { createStorageRoute } from '@transloadit/viewer/server'

import { authorizeFixtureImage } from '../../../../browser-policy.ts'
import { dynamicPolicy } from '../../../../dynamic-policy.ts'
import { fixtureImages } from '../../../../storage-fixtures.ts'
import { imageConfiguration } from '../../../imageConfiguration.ts'

export const { GET, HEAD } = createStorageRoute({
  workspace: imageConfiguration.workspace,
  authKey: imageConfiguration.authKey,
  authSecret: imageConfiguration.authSecret,
  baseUrl: imageConfiguration.baseUrl,
  lifetimeMs: 1000,
  policy: dynamicPolicy,
  authorizeAsset({ request, asset_id, version_id, action }) {
    if (!authorizeFixtureImage({ request }) || action === 'original') return null
    const receipt = ['documents/avatar.jpg', 'documents/alpha.png']
      .map((path) => fixtureImages[path])
      .find((image) => image?.asset_id === asset_id && image.version_id === version_id)
    if (!receipt) return null
    return { ...receipt, size: 1000, mime: 'image/jpeg' }
  },
})

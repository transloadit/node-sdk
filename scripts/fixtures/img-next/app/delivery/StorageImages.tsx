import { createStorageImages } from '@transloadit/img/next/server'

import { authorizeFixtureImage } from '../../browser-policy'
import { imageConfiguration } from '../imageConfiguration'

export const { StorageImage: DeliveryImage, storageRoute: deliveryRoute } = createStorageImages({
  allowedPathPrefixes: ['documents/'],
  authorize: authorizeFixtureImage,
  basePath: '/fixture',
  baseUrl: imageConfiguration.baseUrl,
  public: ['documents/public/'],
})

import { createPrivateStorageImages } from '@transloadit/img/next/server'

import { authorizeFixtureImage } from '../../browser-policy'
import { imageConfiguration } from '../imageConfiguration'

export const { StorageImage: DeliveryImage, storageRoute: deliveryRoute } =
  createPrivateStorageImages({
    allowedPathPrefixes: ['documents/'],
    authorize: authorizeFixtureImage,
    baseUrl: imageConfiguration.baseUrl,
    public: ['documents/public/'],
  })

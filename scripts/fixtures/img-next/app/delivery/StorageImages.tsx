import { createImages } from '@transloadit/viewer/next/server'

import { authorizeFixtureImage } from '../../browser-policy'
import { imageConfiguration } from '../imageConfiguration'

export const { Image: DeliveryImage, imageRoute: deliveryRoute } = createImages({
  allowedPathPrefixes: ['documents/'],
  authorize: authorizeFixtureImage,
  basePath: '/fixture',
  baseUrl: imageConfiguration.baseUrl,
  public: ['documents/public/'],
})

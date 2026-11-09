import { Image } from '@transloadit/viewer/next'

// Compiled in isolation without the generated declaration: runtime catalog geometry is enough.
const image = <Image storage src="any-catalog-path.jpg" alt="Untyped catalog source" width={960} />
void image

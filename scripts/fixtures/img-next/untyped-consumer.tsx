import { StorageImage } from '@transloadit/img/next'

// Compiled in isolation without the generated declaration: runtime catalog geometry is enough.
const image = <StorageImage src="any-catalog-path.jpg" alt="Untyped catalog source" width={960} />
void image

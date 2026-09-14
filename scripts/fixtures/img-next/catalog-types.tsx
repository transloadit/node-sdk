import type { RegisteredStorageImages } from '@transloadit/img/next'

import { StorageImage } from '@transloadit/img/next'

const valid = <StorageImage src="website/hero.jpg" alt="Typed hero" width={960} preload />
// @ts-expect-error The generated catalog rejects misspelled paths without a consumer factory.
const invalid = <StorageImage src="website/herp.jpg" alt="Typo" width={960} />
// @ts-expect-error The generated intrinsic geometry retains exact numeric literals.
const wrongWidth: RegisteredStorageImages['website/hero.jpg']['width'] = 960
void valid
void invalid
void wrongWidth

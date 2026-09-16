import type { ReactNode } from 'react'

import { createStorageImages } from '@transloadit/img/next/server'

import { imageConfiguration } from '../imageConfiguration'

// Experiment-only adapters. The package exports and Storage catalog contract remain unchanged.
const websiteCatalog = {
  'website/hero.jpg': { path: 'website/hero.jpg', width: 2400, height: 1600 },
}
const productCatalog = {
  'products/hero.jpg': { path: 'products/hero.jpg', width: 2400, height: 1600 },
}
const { StorageImage: Storage } = createStorageImages({
  ...imageConfiguration,
  images: websiteCatalog,
  public: ['website/'],
})
const { StorageImage: Website } = createStorageImages({
  ...imageConfiguration,
  delivery: 'direct',
  images: websiteCatalog,
  template: 'fixture-http',
})
const { StorageImage: Products } = createStorageImages({
  ...imageConfiguration,
  delivery: 'direct',
  images: productCatalog,
  template: 'fixture-s3',
})

interface PresentationProps {
  alt: string
  width?: number
  preload?: boolean
}

type StorageChoice = { storage: true; source?: never; src: keyof typeof websiteCatalog }
type SourceChoice =
  | StorageChoice
  | { storage?: never; source: 'website'; src: keyof typeof websiteCatalog }
  | { storage?: never; source: 'products'; src: keyof typeof productCatalog }

/** Proposed source selector, deliberately local to the experiment rather than a package API. */
export function Image(props: PresentationProps & SourceChoice): ReactNode {
  if (props.storage === true) {
    if (props.source !== undefined) throw new Error('Choose storage or source, not both')
    const { storage, source, ...image } = props
    return <Storage {...image} />
  }
  if (props.source === 'website') {
    const { storage, source, ...image } = props
    return <Website {...image} />
  }
  if (props.source === 'products') {
    const { storage, source, ...image } = props
    return <Products {...image} />
  }
  throw new Error('Choose storage or a configured image source')
}

type TemplateChoice =
  | { storage: true; template?: never; src: keyof typeof websiteCatalog }
  | { storage?: never; template: 'fixture-http'; src: keyof typeof websiteCatalog }
  | { storage?: never; template: 'fixture-s3'; src: keyof typeof productCatalog }

/** The alternative makes processing-template identifiers part of application JSX. */
export function TemplateImage(props: PresentationProps & TemplateChoice): ReactNode {
  if (props.storage === true) {
    if (props.template !== undefined) throw new Error('Choose storage or template, not both')
    const { storage, template, ...image } = props
    return <Image storage {...image} />
  }
  if (props.template === 'fixture-http') {
    const { storage, template, ...image } = props
    return <Image source="website" {...image} />
  }
  if (props.template === 'fixture-s3') {
    const { storage, template, ...image } = props
    return <Image source="products" {...image} />
  }
  throw new Error('Choose storage or a configured image template')
}

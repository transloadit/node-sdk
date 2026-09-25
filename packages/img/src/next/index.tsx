import type { ReactNode } from 'react'

import type { StorageImageCatalog } from './layout.ts'
import type { TransloaditRedirectImageProps } from './server.tsx'

export type {
  TransloaditImageLayoutProps,
  TransloaditImagePresentationProps,
  TransloaditPictureProps,
} from '../picture.tsx'

export { TransloaditPicture } from '../picture.tsx'

/** Augmented by the CLI-generated transloadit-images.d.ts; an absent file keeps string sources. */
// biome-ignore lint/suspicious/noEmptyInterface: This is the intentional consumer module-augmentation hook.
export interface RegisteredStorageImages {}

/** The conventional catalog supplies intrinsic dimensions even without generated declarations. */
export type StorageImageProps = TransloaditRedirectImageProps<
  keyof RegisteredStorageImages extends never
    ? StorageImageCatalog
    : {
        [Path in keyof RegisteredStorageImages]: RegisteredStorageImages[Path] extends StorageImageCatalog[string]
          ? RegisteredStorageImages[Path]
          : never
      }
>

/** Storage catalog paths or explicit custom-template inputs; workspace can use project defaults. */
export type ImageProps = { workspace?: string } & (
  | ({ storage: true; template?: never } & StorageImageProps)
  | ({ storage?: never; template: string } & TransloaditRedirectImageProps)
)

/** The server implementation selects Storage Built-ins or an explicitly trusted custom Template. */
export function Image(_props: ImageProps): ReactNode {
  throw new Error(
    'Image is a Server Component. Render it in an App Router page or server component; use TransloaditPicture for an already resolved model in client code.',
  )
}

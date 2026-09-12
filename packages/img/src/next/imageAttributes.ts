import type { DOMAttributes, ImgHTMLAttributes } from 'react'

/** Native attributes that can cross the server-rendering boundary, without caller-owned URLs. */
export interface ImageAttributes
  extends Omit<
    ImgHTMLAttributes<HTMLImageElement>,
    | keyof DOMAttributes<HTMLImageElement>
    | 'defaultChecked'
    | 'defaultValue'
    | 'inlist'
    | 'loading'
    | 'src'
    | 'srcSet'
    | 'suppressContentEditableWarning'
    | 'suppressHydrationWarning'
    | 'tw'
  > {
  // React types this RDFa attribute as any; only serializable values belong in this API.
  inlist?: string
  [attribute: `data-${string}`]: string | number | boolean | null | undefined
}

// Exhaustive against React's native img attributes. New React attributes require an explicit
// decision here; arbitrary JS props must never leak factory configuration or override URLs.
const nativeAttributes: Record<
  Exclude<keyof ImageAttributes, 'style' | `aria-${string}` | `data-${string}`>,
  true
> = {
  about: true,
  accessKey: true,
  alt: true,
  autoCapitalize: true,
  autoCorrect: true,
  autoFocus: true,
  autoSave: true,
  className: true,
  color: true,
  content: true,
  contentEditable: true,
  contextMenu: true,
  crossOrigin: true,
  datatype: true,
  decoding: true,
  dir: true,
  draggable: true,
  enterKeyHint: true,
  exportparts: true,
  fetchPriority: true,
  height: true,
  hidden: true,
  id: true,
  inert: true,
  inlist: true,
  inputMode: true,
  is: true,
  itemID: true,
  itemProp: true,
  itemRef: true,
  itemScope: true,
  itemType: true,
  lang: true,
  nonce: true,
  part: true,
  popover: true,
  popoverTarget: true,
  popoverTargetAction: true,
  prefix: true,
  property: true,
  radioGroup: true,
  referrerPolicy: true,
  rel: true,
  resource: true,
  results: true,
  rev: true,
  role: true,
  security: true,
  sizes: true,
  slot: true,
  spellCheck: true,
  tabIndex: true,
  title: true,
  translate: true,
  typeof: true,
  unselectable: true,
  useMap: true,
  vocab: true,
  width: true,
}

/** Snapshots only native, serializable attributes before suspension or rendering. */
export function snapshotImageAttributes(props: ImageAttributes): ImageAttributes {
  const attributes = Object.fromEntries(
    Object.entries(props).filter(
      ([name, value]) =>
        (Object.hasOwn(nativeAttributes, name) || /^(?:aria|data)-[\w.-]+$/.test(name)) &&
        (value === undefined ||
          value === null ||
          typeof value === 'string' ||
          typeof value === 'number' ||
          typeof value === 'boolean'),
    ),
  )
  return { ...attributes, style: props.style === undefined ? undefined : { ...props.style } }
}

/** A preload is eager; explicitly lazy images must not issue preload requests. */
export type ImageLoadingProps =
  | { loading?: 'eager'; preload: true }
  | { loading?: 'eager' | 'lazy'; preload?: false }

/** Retains runtime validation for JavaScript callers as well as the discriminated public type. */
export function snapshotImageLoading({
  loading,
  preload,
}: {
  loading?: 'eager' | 'lazy'
  preload?: boolean
}): ImageLoadingProps {
  if (preload) {
    if (loading === 'lazy') throw new Error('A preloaded Transloadit image cannot use lazy loading')
    return { loading, preload }
  }
  return { loading, preload }
}

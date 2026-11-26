import type { FileAs } from '../file.ts'

/** Documented mask representations and their synthetic boundary variants. */
export const imageGenerateMaskForms = [
  {
    id: 'opaque',
    variants: ['white', 'threshold'],
    description:
      'Opaque black-and-white masks edit white and protect black (average RGB threshold: 128). Use black and white to avoid ambiguous opaque colors.',
  },
  {
    id: 'alpha',
    variants: ['alpha'],
    description:
      'A mask with transparency edits pixels with alpha below 128 and protects the rest.',
  },
  {
    id: 'legacy-green',
    variants: ['green'],
    description:
      'Legacy green masks edit pixels with alpha at least 128 when every such pixel is green (green at least 128 and greater than red and blue). Transparent pixels are protected.',
  },
] satisfies {
  id: string
  variants: ('white' | 'threshold' | 'alpha' | 'green')[]
  description: string
}[]

/** Semantic upload roles used by the documented inpainting input forms. */
export type InpaintingDocumentedInput = readonly [
  field: string,
  roles: FileAs,
  part: 'source' | 'mask' | 'cutout' | 'reference',
]

/** A documented form, independent of upload order, reference count, provider and encoding. */
export interface InpaintingDocumentedVariant {
  id: string
  inputs: InpaintingDocumentedInput[]
  selection:
    | 'selected'
    | 'fallback'
    | 'bundle'
    | 'positional'
    | 'single'
    | 'mask-only'
    | 'cutout'
    | 'references'
  nativeRefusal?: 'source' | 'mask'
}

/** English form inventory; the boundary matrix expands these same structured examples. */
export const imageGenerateInpaintingForms: {
  id: string
  description: string
  variants: InpaintingDocumentedVariant[]
}[] = [
  {
    id: 'fields',
    description: 'Select image and mask/cutout fields. Fields override inherited roles.',
    variants: [
      {
        id: 'mask',
        inputs: [
          ['image', 'image', 'source'],
          ['mask', 'mask', 'mask'],
        ],
        selection: 'selected',
      },
      {
        id: 'cutout',
        inputs: [
          ['image', 'image', 'source'],
          ['cutout', 'cutout', 'cutout'],
        ],
        selection: 'selected',
      },
      {
        id: 'dual-image-mask',
        inputs: [
          ['image', ['image', 'mask'], 'source'],
          ['mask', ['image', 'mask'], 'mask'],
        ],
        selection: 'selected',
      },
      {
        id: 'dual-image-cutout',
        inputs: [
          ['image', ['image', 'cutout'], 'source'],
          ['mask', ['image', 'cutout'], 'mask'],
        ],
        selection: 'selected',
      },
      {
        id: 'cutout-before-mask-role',
        inputs: [
          ['image', 'image', 'source'],
          ['other', 'mask', 'reference'],
          ['cutout', 'cutout', 'cutout'],
        ],
        selection: 'selected',
      },
    ],
  },
  {
    id: 'roles',
    description:
      'Without fields, use image and mask/cutout roles. Repeated use entries combine roles.',
    variants: [
      {
        id: 'mask',
        inputs: [
          ['other', 'image', 'source'],
          ['other', 'mask', 'mask'],
        ],
        selection: 'selected',
      },
      {
        id: 'cutout',
        inputs: [
          ['', 'image', 'source'],
          ['', 'cutout', 'cutout'],
        ],
        selection: 'selected',
      },
      {
        id: 'normalized-arrays',
        inputs: [
          ['', ['image'], 'source'],
          ['', ['mask'], 'mask'],
        ],
        selection: 'selected',
      },
    ],
  },
  {
    id: 'mixed-selectors',
    description: 'Mix an image field and edit role, or an image role and edit field.',
    variants: [
      {
        id: 'source-field-mask-role',
        inputs: [
          ['image', null, 'source'],
          ['other', 'mask', 'mask'],
        ],
        selection: 'selected',
      },
      {
        id: 'source-field-cutout-role',
        inputs: [
          ['image', null, 'source'],
          ['other', 'cutout', 'cutout'],
        ],
        selection: 'selected',
      },
      {
        id: 'source-role-mask-field',
        inputs: [
          ['other', 'image', 'source'],
          ['mask', null, 'mask'],
        ],
        selection: 'selected',
      },
      {
        id: 'source-role-cutout-field',
        inputs: [
          ['other', 'image', 'source'],
          ['cutout', null, 'cutout'],
        ],
        selection: 'selected',
      },
    ],
  },
  {
    id: 'fallback-source',
    description:
      'With an edit selector but no image selector, the first non-mask input is the source.',
    variants: [
      {
        id: 'mask-field',
        inputs: [
          ['other', null, 'source'],
          ['mask', null, 'mask'],
        ],
        selection: 'fallback',
      },
      {
        id: 'cutout-field',
        inputs: [
          ['', null, 'source'],
          ['cutout', null, 'cutout'],
        ],
        selection: 'fallback',
      },
      {
        id: 'mask-role',
        inputs: [
          ['', null, 'source'],
          ['other', 'mask', 'mask'],
        ],
        selection: 'fallback',
      },
      {
        id: 'cutout-role',
        inputs: [
          ['other', null, 'source'],
          ['other', 'cutout', 'cutout'],
        ],
        selection: 'fallback',
      },
    ],
  },
  {
    id: 'cutout-source',
    description:
      'A transparent cutout with image intent is its own source, including beside references.',
    variants: [
      { id: 'image-field', inputs: [['image', 'cutout', 'cutout']], selection: 'selected' },
      {
        id: 'image-cutout-roles',
        inputs: [['other', ['image', 'cutout'], 'cutout']],
        selection: 'selected',
      },
      {
        id: 'cutout-field-image-role',
        inputs: [['cutout', 'image', 'cutout']],
        selection: 'selected',
      },
      {
        id: 'legacy-image-mask',
        inputs: [['other', ['image', 'mask'], 'cutout']],
        selection: 'selected',
      },
      {
        id: 'legacy-mask-field-image-role',
        inputs: [['mask', 'image', 'cutout']],
        selection: 'selected',
      },
    ],
  },
  {
    id: 'legacy-pair',
    description:
      'Legacy image+mask pairs use first tagged source, second tagged mask; references do not affect selection. Fields win.',
    variants: [
      {
        id: 'other-fields',
        inputs: [
          ['other', ['image', 'mask'], 'source'],
          ['other', ['image', 'mask'], 'mask'],
        ],
        selection: 'selected',
      },
      {
        id: 'no-fields',
        inputs: [
          ['', ['image', 'mask'], 'source'],
          ['', ['image', 'mask'], 'mask'],
        ],
        selection: 'selected',
      },
      {
        id: 'source-field',
        inputs: [
          ['other', ['image', 'mask'], 'mask'],
          ['image', ['image', 'mask'], 'source'],
        ],
        selection: 'selected',
      },
      {
        id: 'mask-field',
        inputs: [
          ['mask', ['image', 'mask'], 'mask'],
          ['other', ['image', 'mask'], 'source'],
        ],
        selection: 'selected',
      },
      {
        id: 'extra-labels',
        inputs: [
          ['other', ['image', 'mask', 'style'], 'source'],
          ['other', ['image', 'mask', 'person'], 'mask'],
        ],
        selection: 'selected',
      },
    ],
  },
  {
    id: 'replicate-bundle',
    description:
      'Replicate accepts 3+ image+mask uploads, uses the first two unless fields select them, and ignores references.',
    variants: [
      {
        id: 'three',
        inputs: [
          ['other', ['image', 'mask'], 'source'],
          ['other', ['image', 'mask'], 'mask'],
          ['other', ['image', 'mask'], 'reference'],
        ],
        selection: 'bundle',
        nativeRefusal: 'mask',
      },
      {
        id: 'source-field',
        inputs: [
          ['other', ['image', 'mask'], 'mask'],
          ['other', ['image', 'mask'], 'reference'],
          ['image', ['image', 'mask'], 'source'],
        ],
        selection: 'bundle',
        nativeRefusal: 'mask',
      },
      {
        id: 'mask-field',
        inputs: [
          ['other', ['image', 'mask'], 'source'],
          ['mask', ['image', 'mask'], 'mask'],
          ['other', ['image', 'mask'], 'reference'],
        ],
        selection: 'bundle',
        nativeRefusal: 'source',
      },
    ],
  },
  {
    id: 'replicate-positional',
    description:
      'Replicate alone accepts untagged source-first, mask-second inputs, honoring a unique image selector.',
    variants: [
      {
        id: 'untagged',
        inputs: [
          ['other', null, 'source'],
          ['other', null, 'mask'],
        ],
        selection: 'positional',
      },
      {
        id: 'image-role',
        inputs: [
          ['other', null, 'mask'],
          ['other', 'image', 'source'],
        ],
        selection: 'positional',
      },
    ],
  },
  {
    id: 'single-transparent',
    description:
      'Strict accepts a sole transparent image, including a mask-only upload, as source and cutout; best_effort refuses the mask-only form.',
    variants: [
      { id: 'untagged', inputs: [['', null, 'cutout']], selection: 'single' },
      { id: 'image-field', inputs: [['image', null, 'cutout']], selection: 'single' },
      { id: 'image-role', inputs: [['other', 'image', 'cutout']], selection: 'single' },
      { id: 'mask-field', inputs: [['mask', null, 'cutout']], selection: 'mask-only' },
      { id: 'mask-role', inputs: [['other', 'mask', 'cutout']], selection: 'mask-only' },
      { id: 'cutout-field', inputs: [['cutout', null, 'cutout']], selection: 'cutout' },
      { id: 'cutout-role', inputs: [['other', 'cutout', 'cutout']], selection: 'cutout' },
    ],
  },
  {
    id: 'ordinary-references',
    description:
      'Other inputs stay references. Untagged transparency never enables Google/OpenAI best_effort editing. Mark masks/cutouts with a field or use.as role.',
    variants: [
      { id: 'text-only', inputs: [], selection: 'references' },
      {
        id: 'transparent-reference',
        inputs: [['other', ['style', 'person'], 'reference']],
        selection: 'references',
      },
      { id: 'opaque-reference', inputs: [['other', null, 'source']], selection: 'references' },
    ],
  },
]

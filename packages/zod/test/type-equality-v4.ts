import type {
  AssemblyIndexItem,
  AssemblyStatus,
  AssemblyStatusError,
  AssemblyStatusMeta,
  AssemblyStatusUpload,
} from '@transloadit/types/assemblyStatus'
import type { AssemblyInstructions } from '@transloadit/types/template'
import type { z } from 'zod/v4'

import type {
  assemblyIndexItemSchema,
  assemblyStatusMetaSchema,
  assemblyStatusSchema,
} from '../src/v4/assemblyStatus.ts'
import type { assemblyInstructionsSchema } from '../src/v4/template.ts'

type Equal<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false

type Assert<T extends true> = T

export type _XPKeywordsTypeCheck = Assert<
  Equal<AssemblyStatusMeta['xp_keywords'], string | number | null | undefined>
>
export type _XPKeywordsInputCheck = Assert<
  Equal<z.input<typeof assemblyStatusMetaSchema>['xp_keywords'], AssemblyStatusMeta['xp_keywords']>
>
export type _XPKeywordsOutputCheck = Assert<
  Equal<z.output<typeof assemblyStatusMetaSchema>['xp_keywords'], AssemblyStatusMeta['xp_keywords']>
>

export type _AssemblyStatusCheck = Assert<
  Equal<AssemblyStatus, z.infer<typeof assemblyStatusSchema>>
>
export type _AssemblyInstructionsCheck = Assert<
  Equal<AssemblyInstructions, z.infer<typeof assemblyInstructionsSchema>>
>

export type _StateTypeCheck = Assert<
  Equal<AssemblyStatusMeta['state'], string | number | null | undefined>
>
export type _XPSubjectTypeCheck = Assert<
  Equal<AssemblyStatusMeta['xp_subject'], string | number | null | undefined>
>
export type _DateTypeCheck = Assert<
  Equal<
    AssemblyStatusMeta[
      | 'date_file_modified'
      | 'date_recorded'
      | 'date_file_created'
      | 'create_date'
      | 'modify_date'],
    string | number | (string | number)[] | null | undefined
  >
>
export type _ExtensionTypeCheck = Assert<Equal<AssemblyStatusUpload['ext'], string | null>>
export type _ErrorTypeCheck = Assert<Equal<AssemblyStatusError['error'], string>>
export type _ListErrorTypeCheck = Assert<
  Equal<AssemblyIndexItem['error'], string | null | undefined>
>
export type _AssemblyIndexCheck = Assert<
  Equal<AssemblyIndexItem, z.infer<typeof assemblyIndexItemSchema>>
>

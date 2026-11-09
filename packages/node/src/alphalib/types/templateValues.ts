import type { SimpleValueReason } from '../renderSimpleValue.ts'

import { formatSimpleValueReason } from '../renderSimpleValue.ts'

/** Usage in MiB charged for each dynamically evaluated Assembly expression. */
export const expressionEvaluationUsageMebibytes = 0.2

/** Character domain shared by stored Template IDs and their pagination cursors. */
// biome-ignore lint/suspicious/noControlCharactersInRegex: Stored Template IDs allow the full ASCII range.
export const storedTemplateIdentifierPattern = /^[\x00-\x7F]*$/u

/** Template Assembly Status retention values shared by runtime validation and contracts. */
export const templateAssemblyStatusExpiries = Object.freeze({
  noTmpFileRetention: 'NoSave',
  oneDay: '1day',
  sevenDays: '7days',
  thirtyDays: '30days',
  ninetyDays: '90days',
})

/** Template transcoding-result retention values shared by runtime validation and contracts. */
export const templateTranscodingResultExpiries = Object.freeze({
  noTmpFileRetention: 'NoSave',
  oneDay: '1day',
})

/** Default storage lifecycle selections; separate from upload and execution phase timeouts. */
export const templateRetentionDefaults = Object.freeze({
  assemblyStatus: templateAssemblyStatusExpiries.ninetyDays,
  transcodingResult: templateTranscodingResultExpiries.oneDay,
})

export const templateListFieldValues = [
  'account_id',
  'assembly_status_expiry',
  'cron_auth_key_id',
  'cron_enabled',
  'cron_max_concurrent_runs',
  'cron_region',
  'cron_schedule_with_seconds',
  'created',
  'deleted',
  'encryption_version',
  'id',
  'json',
  'last_used',
  'modified',
  'name',
  'require_signature_auth',
  'transcoding_result_expiry',
] as const

export type TemplateListField = (typeof templateListFieldValues)[number]

export const templateListDefaultFields = [
  'id',
  'name',
  'json',
  'encryption_version',
  'require_signature_auth',
  'assembly_status_expiry',
  'transcoding_result_expiry',
  'last_used',
  'created',
  'modified',
] as const satisfies readonly TemplateListField[]

export const templateListOrderValues = ['asc', 'desc'] as const
export type TemplateListOrder = (typeof templateListOrderValues)[number]

export const templateListSortValues = ['id', 'name', 'created', 'modified', 'last_used'] as const
export type TemplateListSort = (typeof templateListSortValues)[number]

export const templateIncludeBuiltinModes = ['none', 'latest', 'all'] as const
export type TemplateIncludeBuiltinMode = (typeof templateIncludeBuiltinModes)[number]

export const templateIncludeBuiltinValues = [
  ...templateIncludeBuiltinModes,
  'exclusively-latest',
  'exclusively-all',
] as const
export type TemplateIncludeBuiltinValue = (typeof templateIncludeBuiltinValues)[number]

/** Canonical Template-list defaults shared by API2 and generated clients. */
export const templateListDefaults = Object.freeze({
  includeBuiltin: 'none',
  keywords: '',
  order: 'desc',
  page: 1,
  pagesize: 850,
  sort: 'created',
} satisfies {
  includeBuiltin: TemplateIncludeBuiltinValue
  keywords: string
  order: TemplateListOrder
  page: number
  pagesize: number
  sort: TemplateListSort
})

/** Maximum page size accepted by Template listing. */
export const templateListMaxPageSize = 850

/** Code-unit length retained for the private admin Workspace override. */
export const templateListWorkspaceIdCodeUnits = 32

/** Maximum customer-supplied characters retained in a Template-list error reason. */
export const templateListInvalidRequestValueMaxCharacters = 200

/** Handler-priority Template-list validation reasons shared by runtime and contract enforcement. */
export const templateListInvalidRequestReasons = {
  order: {
    message: 'Invalid order (must be "asc" or "desc")',
    value: 'string',
  },
  sort: {
    message: 'Invalid sort (must be "created", "modified", "name", "id" or "last_used")',
    suffix: '.',
    value: 'string',
  },
  pagesize: {
    message: `Invalid pagesize (must be between 1 and ${templateListMaxPageSize})`,
    suffix: '.',
    value: 'integer-prefix',
  },
  page: {
    message: 'Invalid page',
    suffix: '.',
    value: 'integer-prefix',
  },
  account_id: {
    message: 'Invalid accountId',
    suffix: '.',
    value: 'string',
  },
  include_builtin: {
    message: 'Invalid include_builtin',
    value: 'string',
  },
} satisfies Record<string, SimpleValueReason>

export type TemplateListInvalidRequestField = keyof typeof templateListInvalidRequestReasons

/** Formats one established Template-list reason from its shared contract fact. */
export function formatTemplateListInvalidRequestReason(
  field: TemplateListInvalidRequestField,
  value: unknown,
): string {
  const reason = templateListInvalidRequestReasons[field]
  return formatSimpleValueReason(
    typeof value === 'number' && reason.value === 'integer-prefix'
      ? { ...reason, value: 'string' }
      : reason,
    value,
    templateListInvalidRequestValueMaxCharacters,
  )
}

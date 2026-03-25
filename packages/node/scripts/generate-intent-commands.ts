import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execa } from 'execa'
import type { ZodObject } from 'zod'
import {
  ZodBoolean,
  ZodDefault,
  ZodEffects,
  ZodEnum,
  ZodLiteral,
  ZodNullable,
  ZodNumber,
  ZodOptional,
  ZodString,
  ZodUnion,
} from 'zod'

import type {
  IntentCommandSpec,
  IntentInputLocalFilesSpec,
  IntentSchemaOptionSpec,
} from '../src/cli/intentCommandSpecs.ts'
import { intentCommandSpecs } from '../src/cli/intentCommandSpecs.ts'

type GeneratedFieldKind = 'boolean' | 'number' | 'string'

interface GeneratedSchemaField {
  description?: string
  kind: GeneratedFieldKind
  name: string
  optionFlags: string
  propertyName: string
  required: boolean
}

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const packageRoot = path.resolve(__dirname, '..')
const outputPath = path.resolve(__dirname, '../src/cli/commands/generated-intents.ts')

function toCamelCase(value: string): string {
  return value.replace(/_([a-z])/g, (_match, letter: string) => letter.toUpperCase())
}

function toKebabCase(value: string): string {
  return value.replaceAll('_', '-')
}

function unwrapSchema(input: unknown): { required: boolean; schema: unknown } {
  let schema = input
  let required = true

  while (true) {
    if (schema instanceof ZodEffects) {
      schema = schema._def.schema
      continue
    }

    if (schema instanceof ZodOptional) {
      required = false
      schema = schema.unwrap()
      continue
    }

    if (schema instanceof ZodDefault) {
      required = false
      schema = schema.removeDefault()
      continue
    }

    if (schema instanceof ZodNullable) {
      required = false
      schema = schema.unwrap()
      continue
    }

    return { required, schema }
  }
}

function getFieldKind(schema: unknown): GeneratedFieldKind {
  if (schema instanceof ZodEffects) {
    return getFieldKind(schema._def.schema)
  }

  if (schema instanceof ZodString || schema instanceof ZodEnum) {
    return 'string'
  }

  if (schema instanceof ZodNumber) {
    return 'number'
  }

  if (schema instanceof ZodBoolean) {
    return 'boolean'
  }

  if (schema instanceof ZodLiteral) {
    if (typeof schema.value === 'number') return 'number'
    if (typeof schema.value === 'boolean') return 'boolean'
    return 'string'
  }

  if (schema instanceof ZodUnion) {
    const optionKinds = new Set(schema._def.options.map((option) => getFieldKind(option)))
    if (optionKinds.size === 1) {
      const [kind] = optionKinds
      if (kind != null) return kind
    }
    return 'string'
  }

  throw new Error('Unsupported schema type')
}

function collectSchemaFields(schemaOptions: IntentSchemaOptionSpec): GeneratedSchemaField[] {
  const shape = (schemaOptions.schema as ZodObject<Record<string, unknown>>).shape
  const requiredKeys = new Set(schemaOptions.requiredKeys ?? [])

  return schemaOptions.keys.map((key) => {
    const fieldSchema = shape[key]
    if (fieldSchema == null) {
      throw new Error(`Schema is missing expected key "${key}"`)
    }

    const { required: schemaRequired, schema: unwrappedSchema } = unwrapSchema(fieldSchema)
    const propertyName = toCamelCase(key)
    const optionFlags = `--${toKebabCase(key)}`
    const description = fieldSchema.description
    const required = requiredKeys.has(key) || schemaRequired

    return {
      name: key,
      propertyName,
      optionFlags,
      required,
      description,
      kind: getFieldKind(unwrappedSchema),
    }
  })
}

function formatDescription(description: string | undefined): string {
  return JSON.stringify((description ?? '').trim())
}

function formatUsageExamples(examples: Array<[string, string]>): string {
  return examples
    .map(([label, example]) => `      [${JSON.stringify(label)}, ${JSON.stringify(example)}],`)
    .join('\n')
}

function formatSchemaFields(fieldSpecs: GeneratedSchemaField[]): string {
  return fieldSpecs
    .map((fieldSpec) => {
      const requiredLine = fieldSpec.required ? '\n      required: true,' : ''
      return `  ${fieldSpec.propertyName} = Option.String('${fieldSpec.optionFlags}', {
    description: ${formatDescription(fieldSpec.description)},${requiredLine}
  })`
    })
    .join('\n\n')
}

function formatRawValues(fieldSpecs: GeneratedSchemaField[]): string {
  if (fieldSpecs.length === 0) {
    return '{}'
  }

  return `{
${fieldSpecs.map((fieldSpec) => `        ${JSON.stringify(fieldSpec.name)}: this.${fieldSpec.propertyName},`).join('\n')}
      }`
}

function formatFieldSpecsLiteral(fieldSpecs: GeneratedSchemaField[]): string {
  if (fieldSpecs.length === 0) return '[]'

  return `[
${fieldSpecs
  .map(
    (fieldSpec) =>
      `        { name: ${JSON.stringify(fieldSpec.name)}, kind: ${JSON.stringify(fieldSpec.kind)} },`,
  )
  .join('\n')}
      ]`
}

function formatLocalInputOptions(input: IntentInputLocalFilesSpec): string {
  const blocks = [
    `  inputs = Option.Array('--input,-i', {
    description: ${JSON.stringify(input.description)},
  })`,
  ]

  if (input.recursive !== false) {
    blocks.push(`  recursive = Option.Boolean('--recursive,-r', false, {
    description: 'Enumerate input directories recursively',
  })`)
  }

  if (input.allowWatch) {
    blocks.push(`  watch = Option.Boolean('--watch,-w', false, {
    description: 'Watch inputs for changes',
  })`)
  }

  if (input.deleteAfterProcessing !== false) {
    blocks.push(`  deleteAfterProcessing = Option.Boolean('--delete-after-processing,-d', false, {
    description: 'Delete input files after they are processed',
  })`)
  }

  if (input.reprocessStale !== false) {
    blocks.push(`  reprocessStale = Option.Boolean('--reprocess-stale', false, {
    description: 'Process inputs even if output is newer',
  })`)
  }

  if (input.allowSingleAssembly) {
    blocks.push(`  singleAssembly = Option.Boolean('--single-assembly', false, {
    description: 'Pass all input files to a single assembly instead of one assembly per file',
  })`)
  }

  if (input.allowConcurrency) {
    blocks.push(`  concurrency = Option.String('--concurrency,-c', {
    description: 'Maximum number of concurrent assemblies (default: 5)',
    validator: t.isNumber(),
  })`)
  }

  return blocks.join('\n\n')
}

function formatInputOptions(spec: IntentCommandSpec): string {
  if (spec.input.kind === 'local-files') {
    return formatLocalInputOptions(spec.input)
  }

  if (spec.input.kind === 'remote-url') {
    return `  input = Option.String('--input,-i', {
    description: ${JSON.stringify(spec.input.description)},
    required: true,
  })`
  }

  return ''
}

function formatLocalCreateOptions(
  spec: IntentCommandSpec,
  input: IntentInputLocalFilesSpec,
): string {
  const entries = ['      inputs: this.inputs ?? [],', '      output: this.outputPath,']

  if (spec.outputMode != null) {
    entries.push(`      outputMode: ${JSON.stringify(spec.outputMode)},`)
  }

  if (input.recursive !== false) {
    entries.push('      recursive: this.recursive,')
  }

  if (input.allowWatch) {
    entries.push('      watch: this.watch,')
  }

  if (input.deleteAfterProcessing !== false) {
    entries.push('      del: this.deleteAfterProcessing,')
  }

  if (input.reprocessStale !== false) {
    entries.push('      reprocessStale: this.reprocessStale,')
  }

  if (input.allowSingleAssembly) {
    entries.push('      singleAssembly: this.singleAssembly,')
  } else if (input.defaultSingleAssembly) {
    entries.push('      singleAssembly: true,')
  }

  if (input.allowConcurrency) {
    entries.push(
      '      concurrency: this.concurrency == null ? undefined : Number(this.concurrency),',
    )
  }

  return entries.join('\n')
}

function formatLocalValidation(input: IntentInputLocalFilesSpec, commandLabel: string): string {
  const lines = [
    '    if ((this.inputs ?? []).length === 0) {',
    `      this.output.error('${commandLabel} requires at least one --input')`,
    '      return 1',
    '    }',
  ]

  if (input.allowWatch && input.allowSingleAssembly) {
    lines.push(
      '',
      '    if (this.singleAssembly && this.watch) {',
      "      this.output.error('--single-assembly cannot be used with --watch')",
      '      return 1',
      '    }',
    )
  }

  if (input.allowWatch && input.defaultSingleAssembly) {
    lines.push(
      '',
      '    if (this.watch) {',
      "      this.output.error('--watch is not supported for this command')",
      '      return 1',
      '    }',
    )
  }

  return lines.join('\n')
}

function formatRunBody(spec: IntentCommandSpec, fieldSpecs: GeneratedSchemaField[]): string {
  if (spec.execution.kind === 'single-step') {
    const parseStep = `    const step = parseIntentStep({
      schema: ${spec.schemaOptions?.importName},
      fixedValues: ${JSON.stringify(spec.execution.fixedValues, null, 6).replace(/\n/g, '\n      ')},
      fieldSpecs: ${formatFieldSpecsLiteral(fieldSpecs)},
      rawValues: ${formatRawValues(fieldSpecs)},
    })`

    if (spec.input.kind === 'local-files') {
      return `${formatLocalValidation(spec.input, spec.paths[0].join(' '))}

${parseStep}

    const { hasFailures } = await assembliesCommands.create(this.output, this.client, {
      stepsData: {
        ${JSON.stringify(spec.execution.resultStepName)}: step,
      },
${formatLocalCreateOptions(spec, spec.input)}
    })

    return hasFailures ? 1 : undefined`
    }

    return `${parseStep}

    const { hasFailures } = await assembliesCommands.create(this.output, this.client, {
      stepsData: {
        ${JSON.stringify(spec.execution.resultStepName)}: step,
      },
      inputs: [],
      output: this.outputPath,
    })

    return hasFailures ? 1 : undefined`
  }

  if (spec.execution.kind === 'remote-preview') {
    return `    const previewStep = parseIntentStep({
      schema: ${spec.schemaOptions?.importName},
      fixedValues: ${JSON.stringify(spec.execution.fixedValues, null, 6).replace(/\n/g, '\n      ')},
      fieldSpecs: ${formatFieldSpecsLiteral(fieldSpecs)},
      rawValues: ${formatRawValues(fieldSpecs)},
    })

    const { hasFailures } = await assembliesCommands.create(this.output, this.client, {
      stepsData: {
        ${JSON.stringify(spec.execution.importStepName)}: {
          robot: '/http/import',
          url: this.input,
        },
        ${JSON.stringify(spec.execution.previewStepName)}: {
          ...previewStep,
          use: ${JSON.stringify(spec.execution.importStepName)},
        },
      },
      inputs: [],
      output: this.outputPath,
    })

    return hasFailures ? 1 : undefined`
  }

  if (spec.input.kind !== 'local-files') {
    throw new Error(`Template command ${spec.className} requires local-files input`)
  }

  return `${formatLocalValidation(spec.input, spec.paths[0].join(' '))}

    const { hasFailures } = await assembliesCommands.create(this.output, this.client, {
      template: ${JSON.stringify(spec.execution.templateId)},
${formatLocalCreateOptions(spec, spec.input)}
    })

    return hasFailures ? 1 : undefined`
}

function generateImports(): string {
  const imports = new Map<string, string>()

  for (const spec of intentCommandSpecs) {
    if (!spec.schemaOptions) continue
    imports.set(spec.schemaOptions.importName, spec.schemaOptions.importPath)
  }

  return [...imports.entries()]
    .sort(([nameA], [nameB]) => nameA.localeCompare(nameB))
    .map(([importName, importPath]) => `import { ${importName} } from '${importPath}'`)
    .join('\n')
}

function generateClass(spec: IntentCommandSpec): string {
  const fieldSpecs = spec.schemaOptions == null ? [] : collectSchemaFields(spec.schemaOptions)
  const schemaFields = formatSchemaFields(fieldSpecs)
  const inputOptions = formatInputOptions(spec)
  const runBody = formatRunBody(spec, fieldSpecs)

  return `
export class ${spec.className} extends AuthenticatedCommand {
  static override paths = ${JSON.stringify(spec.paths)}

  static override usage = Command.Usage({
    category: 'Intent Commands',
    description: ${JSON.stringify(spec.description)},
    details: ${JSON.stringify(spec.details ?? '')},
    examples: [
${formatUsageExamples(spec.examples)}
    ],
  })

${schemaFields}${schemaFields && inputOptions ? '\n\n' : ''}${inputOptions}

  outputPath = Option.String('--out,-o', {
    description: ${JSON.stringify(spec.outputDescription)},
    required: ${spec.outputRequired},
  })

  protected async run(): Promise<number | undefined> {
${runBody}
  }
}
`
}

function generateFile(): string {
  const commandClasses = intentCommandSpecs.map(generateClass)
  const commandNames = intentCommandSpecs.map((spec) => spec.className)

  return `// DO NOT EDIT BY HAND.
// Generated by \`packages/node/scripts/generate-intent-commands.ts\`.

import { Command, Option } from 'clipanion'
import * as t from 'typanion'

${generateImports()}
import * as assembliesCommands from './assemblies.ts'
import { AuthenticatedCommand } from './BaseCommand.ts'
import { parseIntentStep } from '../intentRuntime.ts'
${commandClasses.join('\n')}
export const intentCommands = [
${commandNames.map((name) => `  ${name},`).join('\n')}
] as const
`
}

async function main(): Promise<void> {
  await mkdir(path.dirname(outputPath), { recursive: true })
  await writeFile(outputPath, generateFile())
  await execa(
    'yarn',
    ['exec', 'biome', 'check', '--write', path.relative(packageRoot, outputPath)],
    {
      cwd: packageRoot,
    },
  )
}

main().catch((error) => {
  if (!(error instanceof Error)) {
    throw new Error(`Was thrown a non-error: ${error}`)
  }

  console.error(error)
  process.exit(1)
})

import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { execa } from 'execa'

import type {
  GeneratedSchemaField,
  ResolvedIntentCommandSpec,
} from '../src/cli/intentResolvedDefinitions.ts'
import { resolveIntentCommandSpecs } from '../src/cli/intentResolvedDefinitions.ts'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const packageRoot = path.resolve(__dirname, '..')
const outputPath = path.resolve(__dirname, '../src/cli/commands/generated-intents.ts')

function formatDescription(description: string | undefined): string {
  return JSON.stringify((description ?? '').trim())
}

function formatUsageExamples(examples: Array<[string, string]>): string {
  return examples
    .map(([label, example]) => `      [${JSON.stringify(label)}, ${JSON.stringify(example)}],`)
    .join('\n')
}

function formatFieldDefinitionsName(spec: ResolvedIntentCommandSpec): string {
  return `${spec.className[0]?.toLowerCase() ?? ''}${spec.className.slice(1)}Fields`
}

function formatSchemaFields(
  fieldSpecs: GeneratedSchemaField[],
  spec: ResolvedIntentCommandSpec,
): string {
  return fieldSpecs
    .map((fieldSpec) => {
      return `  ${fieldSpec.propertyName} = createIntentOption(${formatFieldDefinitionsName(spec)}.${fieldSpec.propertyName})`
    })
    .join('\n\n')
}

function formatFieldDefinitions(
  fieldSpecs: GeneratedSchemaField[],
  spec: ResolvedIntentCommandSpec,
): string {
  if (fieldSpecs.length === 0) {
    return ''
  }

  return `const ${formatFieldDefinitionsName(spec)} = {
${fieldSpecs
  .map((fieldSpec) => {
    const requiredLine = fieldSpec.required ? '\n    required: true,' : ''
    return `  ${fieldSpec.propertyName}: {
    name: ${JSON.stringify(fieldSpec.name)},
    kind: ${JSON.stringify(fieldSpec.kind)},
    propertyName: ${JSON.stringify(fieldSpec.propertyName)},
    optionFlags: ${JSON.stringify(fieldSpec.optionFlags)},
    description: ${formatDescription(fieldSpec.description)},${requiredLine}
  },`
  })
  .join('\n')}
} as const`
}

function generateImports(specs: ResolvedIntentCommandSpec[]): string {
  const imports = new Map<string, string>()

  for (const spec of specs) {
    if (spec.schemaSpec == null) continue
    imports.set(spec.schemaSpec.importName, spec.schemaSpec.importPath)
  }

  return [...imports.entries()]
    .sort(([nameA], [nameB]) => nameA.localeCompare(nameB))
    .map(([importName, importPath]) => `import { ${importName} } from '${importPath}'`)
    .join('\n')
}

function getCommandDefinitionName(spec: ResolvedIntentCommandSpec): string {
  return `${spec.className[0]?.toLowerCase() ?? ''}${spec.className.slice(1)}Definition`
}

function getBaseClassName(spec: ResolvedIntentCommandSpec): string {
  if (spec.input.kind === 'none') {
    return 'GeneratedNoInputIntentCommand'
  }

  if (spec.input.defaultSingleAssembly) {
    return 'GeneratedBundledFileIntentCommand'
  }

  return 'GeneratedStandardFileIntentCommand'
}

function formatIntentDefinition(spec: ResolvedIntentCommandSpec): string {
  if (spec.execution.kind === 'single-step') {
    const commandLabelLine =
      spec.input.kind === 'local-files'
        ? `\n  commandLabel: ${JSON.stringify(spec.commandLabel)},`
        : ''
    const inputPolicyLine =
      spec.input.kind === 'local-files'
        ? `\n  inputPolicy: ${JSON.stringify(spec.input.inputPolicy, null, 4).replaceAll('\n', '\n  ')},`
        : ''
    const outputMode =
      spec.outputMode == null ? '' : `\n  outputMode: ${JSON.stringify(spec.outputMode)},`
    const outputLines = `\n  outputDescription: ${JSON.stringify(spec.outputDescription)},`
    const fieldsLine =
      spec.fieldSpecs.length === 0 ? '[]' : `Object.values(${formatFieldDefinitionsName(spec)})`

    return `const ${getCommandDefinitionName(spec)} = {${commandLabelLine}${inputPolicyLine}${outputMode}${outputLines}
  execution: {
    kind: 'single-step',
    schema: ${spec.schemaSpec?.importName},
    fields: ${fieldsLine},
    fixedValues: ${JSON.stringify(spec.execution.fixedValues, null, 4).replaceAll('\n', '\n    ')},
    resultStepName: ${JSON.stringify(spec.execution.resultStepName)},
  },
} as const`
  }

  const outputMode =
    spec.outputMode == null ? '' : `\n  outputMode: ${JSON.stringify(spec.outputMode)},`
  return `const ${getCommandDefinitionName(spec)} = {
  commandLabel: ${JSON.stringify(spec.commandLabel)},
  inputPolicy: { "kind": "required" },${outputMode}
  outputDescription: ${JSON.stringify(spec.outputDescription)},
  execution: {
    kind: 'template',
    templateId: ${JSON.stringify(spec.execution.templateId)},
  },
} as const`
}

function generateClass(spec: ResolvedIntentCommandSpec): string {
  const schemaFields = formatSchemaFields(spec.fieldSpecs, spec)
  const baseClassName = getBaseClassName(spec)

  return `
class ${spec.className} extends ${baseClassName} {
  static override paths = ${JSON.stringify([spec.paths])}

  static override intentDefinition = ${getCommandDefinitionName(spec)}

  static override usage = Command.Usage({
    category: 'Intent Commands',
    description: ${JSON.stringify(spec.description)},
    details: ${JSON.stringify(spec.details)},
    examples: [
${formatUsageExamples(spec.examples)}
    ],
  })

${schemaFields}
}
`
}

function generateFile(specs: ResolvedIntentCommandSpec[]): string {
  const fieldDefinitions = specs
    .map((spec) => formatFieldDefinitions(spec.fieldSpecs, spec))
    .filter((definition) => definition.length > 0)
  const commandDefinitions = specs.map(formatIntentDefinition)
  const commandClasses = specs.map(generateClass)
  const commandNames = specs.map((spec) => spec.className)

  return `// DO NOT EDIT BY HAND.
// Generated by \`packages/node/scripts/generate-intent-commands.ts\`.

import { Command } from 'clipanion'

${generateImports(specs)}
import {
  createIntentOption,
  GeneratedBundledFileIntentCommand,
  GeneratedNoInputIntentCommand,
  GeneratedStandardFileIntentCommand,
} from '../intentRuntime.ts'
${fieldDefinitions.join('\n\n')}
${commandDefinitions.join('\n\n')}
${commandClasses.join('\n')}
export const intentCommands = [
${commandNames.map((name) => `  ${name},`).join('\n')}
] as const
`
}

async function main(): Promise<void> {
  const resolvedSpecs = resolveIntentCommandSpecs()

  await mkdir(path.dirname(outputPath), { recursive: true })
  await writeFile(outputPath, generateFile(resolvedSpecs))
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

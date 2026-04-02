import type { CommandClass } from 'clipanion'
import { Command } from 'clipanion'

import type {
  GeneratedSchemaField,
  ResolvedIntentCommandSpec,
} from './intentResolvedDefinitions.ts'
import { resolveIntentCommandSpecs } from './intentResolvedDefinitions.ts'
import {
  createIntentOption,
  GeneratedBundledFileIntentCommand,
  GeneratedNoInputIntentCommand,
  GeneratedStandardFileIntentCommand,
  GeneratedWatchableFileIntentCommand,
} from './intentRuntime.ts'

type IntentBaseClass =
  | typeof GeneratedBundledFileIntentCommand
  | typeof GeneratedNoInputIntentCommand
  | typeof GeneratedStandardFileIntentCommand
  | typeof GeneratedWatchableFileIntentCommand

function getOptionFields(spec: ResolvedIntentCommandSpec): readonly GeneratedSchemaField[] {
  if (spec.execution.kind === 'dynamic-step') {
    return spec.execution.fields
  }

  return spec.fieldSpecs
}

function getBaseClass(spec: ResolvedIntentCommandSpec): IntentBaseClass {
  if (spec.runnerKind === 'no-input') {
    return GeneratedNoInputIntentCommand
  }

  if (spec.runnerKind === 'bundled') {
    return GeneratedBundledFileIntentCommand
  }

  if (spec.runnerKind === 'watchable') {
    return GeneratedWatchableFileIntentCommand
  }

  return GeneratedStandardFileIntentCommand
}

function createIntentCommandClass(spec: ResolvedIntentCommandSpec): CommandClass {
  const BaseClass = getBaseClass(spec)

  class RuntimeIntentCommand extends BaseClass {}

  Object.defineProperty(RuntimeIntentCommand, 'name', {
    value: spec.className,
  })

  Object.assign(RuntimeIntentCommand, {
    paths: [spec.paths],
    intentDefinition:
      spec.execution.kind === 'single-step'
        ? {
            commandLabel: spec.commandLabel,
            inputPolicy: spec.input.kind === 'local-files' ? spec.input.inputPolicy : undefined,
            outputDescription: spec.outputDescription,
            outputMode: spec.outputMode,
            execution: {
              kind: 'single-step',
              schema: spec.schemaSpec?.schema,
              fields: spec.fieldSpecs,
              fixedValues: spec.execution.fixedValues,
              resultStepName: spec.execution.resultStepName,
            },
          }
        : spec.execution.kind === 'dynamic-step'
          ? {
              commandLabel: spec.commandLabel,
              inputPolicy: spec.input.kind === 'local-files' ? spec.input.inputPolicy : undefined,
              outputDescription: spec.outputDescription,
              outputMode: spec.outputMode,
              execution: {
                kind: 'dynamic-step',
                handler: spec.execution.handler,
                fields: spec.execution.fields,
                resultStepName: spec.execution.resultStepName,
              },
            }
          : {
              commandLabel: spec.commandLabel,
              inputPolicy: spec.input.kind === 'local-files' ? spec.input.inputPolicy : undefined,
              outputDescription: spec.outputDescription,
              outputMode: spec.outputMode,
              execution: {
                kind: 'template',
                templateId: spec.execution.templateId,
              },
            },
    usage: Command.Usage({
      category: 'Intent Commands',
      description: spec.description,
      details: spec.details,
      examples: spec.examples,
    }),
  })

  for (const field of getOptionFields(spec)) {
    Object.defineProperty(RuntimeIntentCommand.prototype, field.propertyName, {
      configurable: true,
      enumerable: true,
      writable: true,
      value: createIntentOption(field),
    })
  }

  return RuntimeIntentCommand as unknown as CommandClass
}

export const intentCommands = resolveIntentCommandSpecs().map(createIntentCommandClass)

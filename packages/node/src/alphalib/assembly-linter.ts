import type { ValueNode } from 'json-to-ast'
import parse from 'json-to-ast'
import { z } from 'zod'

import { entries } from './object.ts'
import {
  addUseReference,
  botNeedsInput,
  doesStepRobotSupportUse,
  getFirstStepNameThatDoesNotNeedInput,
  getIndentation,
  hasRobot,
  parseSafeTemplate,
} from './stepParsing.ts'
import { robotsMeta } from './types/robots/_index.ts'
import type { InterpolatableRobotHttpImportInstructionsWithHiddenFieldsInput } from './types/robots/http-import.ts'
import { stackVersions } from './types/stackVersions.ts'
import type { StepInput } from './types/template.ts'
import { assemblyInstructionsSchema } from './types/template.ts'
import { zodParseWithContext } from './zodParseWithContext.ts'

// Maximum number of steps allowed in a Smart CDN Assembly
// We set this ~unreasonably high for now as it could already avoid misuse/abuse
// until we have settled on a discussion about limits:
// See: https://github.com/transloadit/content/pull/4176
const MAX_STEPS_PER_URLTRANSFORM_ASSEMBLY = 20

// Type for objects with AST metadata added by getASTValue
type WithASTMetadata<T extends object> = T & {
  __line: Record<string, number>
  __column: Record<string, number>
}

// Define all possible linter result codes
export type LinterResultCode =
  | 'duplicate-key-in-step'
  | 'empty-steps'
  | 'empty-use-array'
  | 'infinite-assembly'
  | 'invalid-json'
  | 'invalid-steps-type'
  | 'missing-ffmpeg-stack'
  | 'missing-imagemagick-stack'
  | 'missing-input'
  | 'missing-original-storage'
  | 'missing-robot'
  | 'missing-steps'
  | 'missing-url'
  | 'schema-violation'
  | 'missing-use-steps'
  | 'missing-use'
  | 'no-storage'
  | 'smart-cdn-input-field-missing'
  | 'step-is-not-an-object'
  | 'undefined-robot'
  | 'undefined-step'
  | 'unqualified-http-import-url'
  | 'smart-cdn-max-steps-exceeded'
  | 'smart-cdn-robot-not-allowed'
  | 'wrong-ffmpeg-version'
  | 'wrong-imagemagick-version'
  | 'wrong-step-name'
  | 'wrong-use-type'

type StepWithMetadata = StepInput & {
  __line: Record<string, number>
  __column: Record<string, number>
}

interface StepsWithMetadata {
  [stepName: string]: StepWithMetadata | Record<string, number>
  __line: Record<string, number>
  __column: Record<string, number>
}

interface TemplateWithMetadata extends Record<string, unknown> {
  steps?: StepsWithMetadata
  __line?: Record<string, number>
  __column?: Record<string, number>
}

const fixWrongStackVersionSchema = z.object({
  stepName: z.string(),
  paramName: z.string(),
  recommendedVersion: z.string(),
})
type FixDataWrongStackVersion = z.infer<typeof fixWrongStackVersionSchema>
const fixMissingUseSchema = z.object({
  stepName: z.string(),
})
type FixDataMissingUse = z.infer<typeof fixMissingUseSchema>
const fixDuplicateKeyInStepSchema = z.object({
  stepName: z.string(),
  duplicateKeys: z.array(z.string()),
})
type FixDataDuplicateKeyInStep = z.infer<typeof fixDuplicateKeyInStepSchema>
const fixSmartCdnInputFieldSchema = z.object({
  stepName: z.string(),
})
type FixDataSmartCdnInputField = z.infer<typeof fixSmartCdnInputFieldSchema>
const fixMissingInputSchema = z.object({})
type FixDataMissingInput = z.infer<typeof fixMissingInputSchema>
const fixMissingStepsSchema = z.object({})
type FixDataMissingSteps = z.infer<typeof fixMissingStepsSchema>
const fixInvalidStepsTypeSchema = z.object({})
type FixDataInvalidStepsType = z.infer<typeof fixInvalidStepsTypeSchema>
const fixEmptyStepsSchema = z.object({})
type FixDataEmptySteps = z.infer<typeof fixEmptyStepsSchema>
const fixMissingOriginalStorageSchema = z.object({})
type FixDataMissingOriginalStorage = z.infer<typeof fixMissingOriginalStorageSchema>

export type FixData =
  | { fixId: 'fix-wrong-stack-version'; fixData: FixDataWrongStackVersion }
  | { fixId: 'fix-missing-use'; fixData: FixDataMissingUse }
  | { fixId: 'fix-duplicate-key-in-step'; fixData: FixDataDuplicateKeyInStep }
  | { fixId: 'fix-missing-input'; fixData: FixDataMissingInput }
  | { fixId: 'fix-missing-steps'; fixData: FixDataMissingSteps }
  | { fixId: 'fix-invalid-steps-type'; fixData: FixDataInvalidStepsType }
  | { fixId: 'fix-empty-steps'; fixData: FixDataEmptySteps }
  | { fixId: 'fix-missing-original-storage'; fixData: FixDataMissingOriginalStorage }
  | { fixId: 'fix-smart-cdn-input-field'; fixData: FixDataSmartCdnInputField }

export type AssemblyLinterResult = {
  code: LinterResultCode
  type: 'error' | 'warning'
  row: number
  column: number
  message?: string
  stepName?: string
  robot?: string
  isAudioRobot?: boolean
  stackVersion?: string
  wrongStepName?: string
  desc?: string | null
  duplicateKeys?: string[]
  // For URL Transform validation
  maxStepCount?: number // Optional: Max steps allowed for Smart CDN
  stepCount?: number // Optional: Actual number of steps found
} & Partial<FixData>

class ParseError extends SyntaxError {
  line: number

  column: number

  rawMessage: string

  source: null | string

  constructor(
    message: string,
    line: number,
    column: number,
    rawMessage: string,
    source: string | null,
  ) {
    super(message)
    this.line = line
    this.column = column
    this.rawMessage = rawMessage
    this.source = source
  }
}

function isObject(obj: unknown): obj is object {
  return typeof obj === 'object' && !Array.isArray(obj) && obj !== null
}
function has<K extends string>(object: object, key: K): object is Record<K, unknown> {
  return Object.hasOwn(object, key)
}

function isParseError(e: unknown): e is ParseError {
  return (
    e instanceof Error &&
    isObject(e) &&
    'line' in e &&
    typeof e.line === 'number' &&
    'column' in e &&
    typeof e.column === 'number' &&
    'rawMessage' in e &&
    typeof e.rawMessage === 'string'
  )
}

// getASTValue traverses through the provided AST and will return
// the JavaScript value described by it.
// Objects and arrays will also have the __line and __column
// properties containing line and column number for their
// child elements.
// See https://github.com/vtrushin/json-to-ast#node-types
function getASTValue(ast: ValueNode): unknown {
  switch (ast.type) {
    case 'Literal':
      return ast.value
    case 'Array': {
      const value: unknown[] = []
      const lines: number[] = []
      const columns: number[] = []

      for (const property of ast.children as ValueNode[]) {
        if (property.loc) {
          // json-to-ast starts the line and column numbers at 1 but the
          // ace editor expects them to start at 0. To make up for that
          // difference we subtract 1.
          value.push(getASTValue(property))
          lines.push(property.loc.start.line - 1)
          columns.push(property.loc.start.column - 1)
        }
      }
      Object.defineProperty(value, '__line', { value: lines })
      Object.defineProperty(value, '__column', { value: columns })
      return value
    }
    case 'Object': {
      const value: Record<string, unknown> = {}
      const lines: Record<string, number> = {}
      const columns: Record<string, number> = {}

      for (const property of ast.children) {
        if (property.key && property.value && property.value.loc) {
          // json-to-ast starts the line and column numbers at 1 but the
          // ace editor expects them to start at 0. To make up for that
          // difference we subtract 1.
          value[property.key.value] = getASTValue(property.value)
          lines[property.key.value] = property.value.loc.start.line - 1
          columns[property.key.value] = property.value.loc.start.column - 1
        }
      }
      Object.defineProperty(value, '__line', { value: lines })
      Object.defineProperty(value, '__column', { value: columns })
      return value
    }
    default:
      // Should not happen for valid ValueNode types
      return undefined
  }
}

// getRobotsUsingTool returns an array of the robots names
// which have a specific tool. This can be used to
// get all robots supporting the ffmpeg_stack setting, for example.
function getRobotsUsingTool(tool?: 'ffmpeg' | 'imagemagick') {
  return Object.entries(robotsMeta)
    .filter(([, meta]) => !tool || meta.uses_tools?.includes(tool))
    .map(([varName]) => {
      // turn: audioArtworkMeta -> /audio/artwork
      // turn: s3StoreMeta -> /s3/store
      const rName = `/${varName
        .replace(/([a-z0-9])([A-Z])/g, '$1/$2')
        .toLowerCase()
        .replace(/\/meta$/, '')}`

      return rName
    })
}

const STORE_ROBOT_NAME = /^\/[a-z0-9]+\/store$/i
function isStoreRobot(name: string) {
  return STORE_ROBOT_NAME.test(name)
}

const IMPORT_ROBOT_NAME = /^\/[a-z0-9]+\/import$/i
function isImportRobot(name: string) {
  return IMPORT_ROBOT_NAME.test(name)
}

const FFMPEG_ROBOT_NAMES = getRobotsUsingTool('ffmpeg')
function isFfmpegRobot(name: string) {
  return FFMPEG_ROBOT_NAMES.some((x) => x === name)
}

const IMAGICK_ROBOT_NAMES = getRobotsUsingTool('imagemagick')
function isImagickRobot(name: string) {
  return IMAGICK_ROBOT_NAMES.some((x) => x === name)
}

const ALL_ROBOT_NAMES = getRobotsUsingTool()
function isRobot(name: string) {
  return ALL_ROBOT_NAMES.includes(name)
}

function isHttpImportRobot(name: string) {
  return name === '/http/import'
}

// lintStackParameter validates whether a given step has a proper
// ffmpeg_stack or imagemagick_stack paramater with an existing version.
// Which parameter is expected is controlled by the stackName
// argument which should either by 'ffmpeg' or 'imagemagick'.
// If a linting issue is found, the corresponding message is added
// to the result array.
function lintStackParameter(
  step: StepWithMetadata,
  stepName: string,
  steps: StepsWithMetadata,
  stackName: keyof typeof stackVersions,
  result: AssemblyLinterResult[],
) {
  const paramName = `${stackName}_stack` as 'ffmpeg_stack' | 'imagemagick_stack'

  if (has(step, paramName)) {
    const stackVersionValue = step[paramName]
    if (typeof stackVersionValue === 'string') {
      if (!stackVersions[stackName].test.test(stackVersionValue)) {
        result.push({
          code: `wrong-${stackName}-version` as LinterResultCode,
          stepName,
          robot: step.robot,
          isAudioRobot: step.robot?.indexOf('/audio/') === 0,
          stackVersion: stackVersionValue,
          type: 'error',
          row: steps.__line[stepName],
          column: steps.__column[stepName],
          fixId: 'fix-wrong-stack-version',
          fixData: {
            stepName,
            paramName,
            recommendedVersion: stackVersions[stackName].recommendedVersion,
          },
        })
      }
    } else {
      // Handle cases where the stack parameter is present but not a string (though schema should catch this)
      // Or, decide if this case is impossible due to schema validation and remove this else.
      // For now, let's assume schema validation makes this path unlikely for a 'wrong-version' error,
      // but a general 'schema-violation' might be more appropriate if this state is reached.
    }
  }
}

function lintUseArray(
  use: unknown,
  stepName: string,
  stepNames: string[],
  result: AssemblyLinterResult[],
  row: number | undefined,
  column: number | undefined,
) {
  if (!Array.isArray(use)) return
  if (use.length === 0) {
    result.push({
      code: 'empty-use-array',
      stepName,
      type: 'warning',
      row: row ?? 0,
      column: column ?? 0,
    })
    return
  }

  use.forEach(
    (obj: string | { name: string; __line?: number[]; __column?: number[] }, index: number) => {
      let name: string | undefined
      if (typeof obj === 'object' && obj !== null) {
        name = obj.name
      } else if (typeof obj === 'string') {
        name = obj
      }

      if (name && stepNames.indexOf(name) === -1) {
        result.push({
          code: 'undefined-step',
          stepName,
          wrongStepName: name,
          type: 'error',
          row:
            typeof obj === 'object' && obj !== null && obj.__line?.[index]
              ? obj.__line[index]
              : (row ?? 0),
          column:
            typeof obj === 'object' && obj !== null && obj.__column?.[index]
              ? obj.__column[index]
              : (column ?? 0),
        })
      }
    },
  )
}

function lintHttpImportUrl(
  step: StepWithMetadata,
  stepName: string,
  result: AssemblyLinterResult[],
) {
  if (!has(step, 'url')) {
    return
  }

  const { url } = step
  if (typeof url !== 'string') {
    return
  }

  // Check if the URL contains a field variable without a protocol or domain
  const fieldVariableRegex = /^\$\{fields\.[^}]+\}$/
  const protocolDomainRegex = /^(https?:\/\/|\/\/)[^/]+/i

  if (fieldVariableRegex.test(url) && !protocolDomainRegex.test(url)) {
    result.push({
      code: 'unqualified-http-import-url',
      stepName,
      type: 'warning',
      row: step.__line.url,
      column: step.__column.url,
      message:
        'The /http/import url should include a protocol and domain name for security reasons.',
    })
  }
}

export function lint(assembly: TemplateWithMetadata): AssemblyLinterResult[] {
  const result: AssemblyLinterResult[] = []

  if (!isObject(assembly) || !('steps' in assembly)) {
    result.push({
      code: 'missing-steps',
      type: 'error',
      row: 0,
      column: 0,
      message: "The 'steps' property is missing",
      fixId: 'fix-missing-steps',
      fixData: {},
    })
    return result
  }

  if (!isObject(assembly.steps)) {
    result.push({
      code: 'invalid-steps-type',
      type: 'error',
      row: assembly.__line?.steps ?? 0,
      column: assembly.__column?.steps ?? 0,
      message: "The 'steps' property must be an object",
      fixId: 'fix-invalid-steps-type',
      fixData: {},
    })
    return result
  }

  if (Object.keys(assembly.steps).length === 0) {
    result.push({
      code: 'empty-steps',
      type: 'warning',
      row: assembly.__line?.steps ?? 0,
      column: assembly.__column?.steps ?? 0,
      message: "The 'steps' object is empty",
      fixId: 'fix-empty-steps',
      fixData: {},
    })
    return result // Return here to avoid additional checks for empty steps
  }

  if (!isObject(assembly.steps)) {
    return result
  }

  const stepNames = Object.keys(assembly.steps).filter(
    (key) => key !== '__line' && key !== '__column',
  )
  if (!stepNames.includes(':original')) {
    // The step :original always exists automatically
    stepNames.push(':original')
  }

  let hasFileServe = false
  let hasFieldsInput = false
  let importStepName = ''

  // First pass - check for /file/serve and ${fields.input}
  for (const [stepName, step] of Object.entries(assembly.steps)) {
    if (stepName === '__line' || stepName === '__column') continue
    if (!isObject(step)) continue

    // Ensure 'step' is actually a StepWithMetadata-like object, not just Record<string, number>
    // A simple check for 'robot' or other StepInput fields can make the cast safer.
    // StepInput is { robot?: string; use?: unknown; ... } & Record<string, unknown>
    // StepWithMetadata adds __line and __column to StepInput.
    // A Record<string, number> would not typically have these specific fields like 'robot'.
    if (!('robot' in step || 'use' in step)) {
      // This object doesn't look like a step, skip or handle as an error.
      // For now, let's assume it might be an invalid structure caught by schema validation later
      // or it's a case not expected here if it passed earlier checks.
      continue
    }

    const typedStep = step as StepWithMetadata
    if (!typedStep.robot) continue

    // Check if we have a /file/serve robot anywhere
    if (typedStep.robot === '/file/serve') {
      hasFileServe = true
    }

    // Check if we use ${fields.input} in any import step
    if (isImportRobot(typedStep.robot)) {
      importStepName = stepName
      const stepStr = JSON.stringify(step)
      if (stepStr.includes('${fields.input}')) {
        hasFieldsInput = true
      }
    }
  }

  // If we have /file/serve but don't use ${fields.input} in the import step, add warning
  if (hasFileServe && !hasFieldsInput && importStepName) {
    result.push({
      code: 'smart-cdn-input-field-missing',
      type: 'warning',
      row: assembly.steps.__line?.[importStepName] ?? 0,
      column: assembly.steps.__column?.[importStepName] ?? 0,
      message: 'Smart CDN path component available as `${fields.input}`',
      stepName: importStepName,
      fixId: 'fix-smart-cdn-input-field',
      fixData: { stepName: importStepName },
    })
  }

  let usesOriginalFiles = false
  let storesOriginalFiles = false
  let hasInputStep = false

  for (const [stepName, step] of Object.entries(assembly.steps)) {
    if (stepName === '__line' || stepName === '__column') continue

    if (!step || typeof step !== 'object' || Array.isArray(step)) {
      result.push({
        code: 'step-is-not-an-object',
        stepName,
        type: 'error',
        row: assembly.steps.__line?.[stepName] ?? 0,
        column: assembly.steps.__column?.[stepName] ?? 0,
      })
      continue
    }

    const stepKeys = Object.keys(step).filter((key) => key !== '__line' && key !== '__column')
    if (!('robot' in step || 'use' in step)) {
      if (stepKeys.length > 0) {
        result.push({
          code: 'missing-robot',
          stepName,
          type: 'error',
          row: assembly.steps.__line?.[stepName] ?? 0,
          column: assembly.steps.__column?.[stepName] ?? 0,
        })
      }
      continue
    }

    const typedStep = step as StepWithMetadata

    if (!typedStep.robot) {
      result.push({
        code: 'missing-robot',
        stepName,
        type: 'error',
        row: assembly.steps.__line?.[stepName] ?? 0,
        column: assembly.steps.__column?.[stepName] ?? 0,
      })
      continue
    } else if (!isRobot(typedStep.robot)) {
      result.push({
        code: 'undefined-robot',
        stepName,
        robot: typedStep.robot,
        type: 'error',
        row: typedStep.__line.robot,
        column: typedStep.__column.robot,
      })
    } else if (typedStep.robot === '/file/serve') {
      hasFileServe = true
      if ('url' in typedStep && !('use' in typedStep)) {
        const stepStr = JSON.stringify(step)
        if (!stepStr.includes('${fields.input}')) {
          result.push({
            code: 'smart-cdn-input-field-missing',
            type: 'warning',
            row: assembly.steps.__line?.[stepName] ?? 0,
            column: assembly.steps.__column?.[stepName] ?? 0,
            message: 'Smart CDN path component available as `${fields.input}`',
            stepName,
          })
        }
      }
    } else if (isFfmpegRobot(typedStep.robot)) {
      lintStackParameter(typedStep, stepName, assembly.steps, 'ffmpeg', result)
    } else if (isImagickRobot(typedStep.robot)) {
      lintStackParameter(typedStep, stepName, assembly.steps, 'imagemagick', result)
    } else if (typedStep.robot === '/upload/handle') {
      if (stepName !== ':original') {
        result.push({
          code: 'wrong-step-name',
          type: 'error',
          row: assembly.steps.__line?.[stepName] ?? 0,
          column: assembly.steps.__column?.[stepName] ?? 0,
        })
      }
    } else if (isHttpImportRobot(typedStep.robot)) {
      lintHttpImportUrl(typedStep, stepName, result)
    }

    if (!has(typedStep, 'use')) {
      if (typedStep.robot === '/html/convert') {
        // The /html/convert robot can either act as a import robot when
        // the `url` parameter is defined. Or it can be a conversion robot
        // if `use` is available. If neither of those parameters is given,
        // we emit a warning.
        if (has(typedStep, 'url')) {
          hasInputStep = true
        } else {
          result.push({
            code: 'missing-url',
            stepName,
            type: 'warning',
            row: assembly.steps.__line?.[stepName] ?? 0,
            column: assembly.steps.__column?.[stepName] ?? 0,
          })
        }
      } else if (
        // Check if this robot doesn't need input (like import robots, /upload/handle,
        // file-generating robots like /image/generate, /text/speak with prompt, etc.)
        !botNeedsInput(typedStep.robot, stepName, typedStep)
      ) {
        hasInputStep = true
      } else {
        // Import robots and /upload/handle do not need a use parameter. For
        // all others we emit a warning.
        result.push({
          code: 'missing-use',
          stepName,
          type: 'warning',
          row: assembly.steps.__line?.[stepName] ?? 0,
          column: assembly.steps.__column?.[stepName] ?? 0,
          fixId: 'fix-missing-use',
          fixData: { stepName },
        })
      }
    } else {
      if (Array.isArray(typedStep.use)) {
        const referencesOriginal = typedStep.use.some((item) => {
          if (typeof item === 'string') {
            return item === ':original'
          }
          return (
            typeof item === 'object' && item !== null && 'name' in item && item.name === ':original'
          )
        })
        if (referencesOriginal) {
          hasInputStep = true
        }

        // Situation 1: use parameter is an array, for example
        // "use": [ "hello", { name: ":original" } ]
        lintUseArray(
          typedStep.use,
          stepName,
          stepNames,
          result,
          typedStep.__line.use,
          typedStep.__column.use,
        )
      } else if (typeof typedStep.use === 'object' && typedStep.use !== null) {
        // Situation 2: use parameter is an object, for example
        // "use": { steps: [ "hello", "hi" ], "bundle_steps": true }
        // typedStep.use here is inferred as StepUse, which can be StepUseObject
        // StepUseObject has a MANDATORY 'steps' property of type StepUseArrayItemSchema[]
        const useObject = typedStep.use // No immediate cast

        if ('steps' in useObject) {
          if (Array.isArray(useObject.steps)) {
            // Now useObject.steps is known to be an array.
            // We still need to ensure elements match StepUseArrayItemSchema if processing them.
            // The existing lintUseArray function takes 'unknown[]' for its first arg's 'steps' property if it's an object, so this is compatible.
            if (
              useObject.steps.some((step) => {
                if (typeof step === 'string') {
                  return step === ':original'
                }
                return (
                  typeof step === 'object' &&
                  step !== null &&
                  'name' in step &&
                  step.name === ':original'
                )
              })
            ) {
              hasInputStep = true
            }

            // Access metadata for the 'steps' key within the useObject, if available.
            // The useObject itself, being a product of getASTValue for an object, should have __line/__column.
            const useStepsLine = (useObject as WithASTMetadata<typeof useObject>)?.__line?.steps
            const useStepsColumn = (useObject as WithASTMetadata<typeof useObject>)?.__column?.steps

            lintUseArray(
              useObject.steps,
              stepName,
              stepNames,
              result,
              useStepsLine ?? typedStep.__line.use, // Fallback to the line of the 'use' key itself
              useStepsColumn ?? typedStep.__column.use, // Fallback to the column of the 'use' key itself
            )
          } else if (typeof useObject.steps !== 'string') {
            // If 'steps' is not an array or not present, it's an invalid use object structure.
            result.push({
              code: 'missing-use-steps', // Or a more specific error like 'invalid-use-object-structure'
              stepName,
              type: 'error',
              row: typedStep.__line.use, // Point to the start of the use object
              column: typedStep.__column.use,
            })
          }
        }
      } else if (typeof typedStep.use === 'string') {
        if (typedStep.use === ':original') {
          hasInputStep = true
        }

        // Situation 3: use parameter is a string, for example
        // "use": "import"
        if (stepNames.indexOf(typedStep.use) === -1) {
          result.push({
            code: 'undefined-step',
            stepName,
            wrongStepName: typedStep.use,
            type: 'error',
            row: typedStep.__line.use,
            column: typedStep.__column.use,
          })
        }
      } else {
        // Situation 4: use parameter has some other invalid type
        result.push({
          code: 'wrong-use-type',
          stepName,
          type: 'error',
          row: typedStep.__line.use,
          column: typedStep.__column.use,
        })
      }

      const referencesOriginalFiles = JSON.stringify(typedStep.use).includes(':original')
      if (referencesOriginalFiles) {
        if (typedStep.robot && isStoreRobot(typedStep.robot)) {
          storesOriginalFiles = true
        } else {
          usesOriginalFiles = true
        }
      }
    }
  }

  // When the /file/serve robot is used for the UrlProxy, customers should not use a
  // storage robot, so we should not warn them about it.
  if (!hasFileServe) {
    const hasStorageRobot = hasRobot(JSON.stringify(assembly), /\/store$/, true)

    if (usesOriginalFiles && !storesOriginalFiles && hasStorageRobot) {
      // Keep only the missing-original-storage warning
      result.push({
        code: 'missing-original-storage',
        type: 'warning',
        row: assembly.__line?.steps ?? 0,
        column: assembly.__column?.steps ?? 0,
        fixId: 'fix-missing-original-storage',
        fixData: {},
      })
    }
  }

  if (!hasInputStep) {
    result.push({
      code: 'missing-input',
      type: 'error',
      row: assembly.__line?.steps ?? 0,
      column: assembly.__column?.steps ?? 0,
      fixId: 'fix-missing-input',
      fixData: {}, // Add an empty object as fixData
    })
  }

  // Add schema violations as linting issues, only if we don't have any
  // serious linting issues yet. Otherwise we risk having duplicate
  // issues, for example, for ffmpeg_stack. Both the linter and the schema cover it.
  // @TODO: In the future we should delete Linter issues that are covered by the Schema.
  // It could result in just having only a few Linter issues left.
  const cntErrors = result.filter((r) => r.type === 'error').length
  // const cntWarnings = result.filter((r) => r.type === 'warning').length

  if (!cntErrors) {
    const parsed = zodParseWithContext(assemblyInstructionsSchema, assembly)
    if (!parsed.success) {
      for (const zodIssue of parsed.errors) {
        // Start with default values at the steps object level
        let row = assembly.__line?.steps ?? 1
        let column = assembly.__column?.steps ?? 1
        const { path } = zodIssue

        // Find the row and column of this path in the JSON string:
        if (path.length > 0) {
          let current: Record<string, unknown> = assembly
          let metadata: Record<string, unknown> = assembly

          // Walk the path to find the deepest available line/column info
          for (const segment of path) {
            if (typeof segment === 'string' && current && typeof current === 'object') {
              // Keep track of both the actual value and its metadata
              current = current[segment] as Record<string, unknown>

              // The metadata contains __line and __column info
              if (metadata && '__line' in metadata && '__column' in metadata) {
                const lines = metadata.__line as Record<string, number>
                const columns = metadata.__column as Record<string, number>

                if (segment in lines && segment in columns) {
                  row = lines[segment]
                  column = columns[segment]
                }
              }

              // Update metadata pointer for next iteration
              metadata = current
            }
          }
        }

        result.push({
          code: 'schema-violation',
          type: 'error',
          row,
          column,
          message: zodIssue.humanReadable,
        })
      }
    }
  }

  return result
}

function isInfiniteAssembly(
  template: TemplateWithMetadata,
): [
  isInfiniteAssembly: boolean,
  positionalInfo?: { line: number; column: number; stepName: string },
] {
  if (!template.steps) return [false]

  const graph = new Map<string, string[]>()
  for (const [stepName, stepValue] of Object.entries(template.steps)) {
    if (stepName === '__line' || stepName === '__column') continue

    if (
      typeof stepValue !== 'object' ||
      stepValue === null ||
      !('use' in stepValue) ||
      !stepValue.use
    ) {
      continue
    }

    const stepUseValue = stepValue.use

    if (typeof stepUseValue === 'string') {
      graph.set(stepName, [stepUseValue])
      continue
    }

    if (Array.isArray(stepUseValue)) {
      // Filter out non-string/non-object-with-name items to satisfy .every checks
      const filteredUseArray = stepUseValue.filter(
        (u): u is string | { name: string } =>
          typeof u === 'string' ||
          (typeof u === 'object' && u !== null && 'name' in u && typeof u.name === 'string'),
      )

      if (filteredUseArray.every((u): u is string => typeof u === 'string')) {
        graph.set(stepName, filteredUseArray)
        continue
      }
      if (
        filteredUseArray.every(
          (u): u is { name: string } => typeof u === 'object' && u !== null && 'name' in u,
        )
      ) {
        graph.set(
          stepName,
          filteredUseArray.map((u) => (u as { name: string }).name),
        )
        continue
      }
    }

    if (
      typeof stepUseValue === 'object' &&
      stepUseValue !== null &&
      'steps' in stepUseValue &&
      Array.isArray((stepUseValue as { steps?: unknown }).steps)
    ) {
      const useSteps = (stepUseValue as { steps: (string | { name: string })[] }).steps
      // Similar filtering as above for useSteps elements
      const filteredUseSteps = useSteps.filter(
        (s): s is string | { name: string } =>
          typeof s === 'string' ||
          (typeof s === 'object' && s !== null && 'name' in s && typeof s.name === 'string'),
      )

      if (filteredUseSteps.every((s): s is string => typeof s === 'string')) {
        graph.set(stepName, filteredUseSteps)
      } else if (
        filteredUseSteps.every(
          (s): s is { name: string } => typeof s === 'object' && s !== null && 'name' in s,
        )
      ) {
        graph.set(
          stepName,
          filteredUseSteps.map((s) => (s as { name: string }).name),
        )
      }
    }
  }

  const visited = new Set<string>()
  const recursionStack = new Set<string>()

  function dfs(node: string): boolean {
    if (recursionStack.has(node)) return true // Cycle detected
    if (visited.has(node)) return false // Already visited and no cycle from this node

    visited.add(node)
    recursionStack.add(node)

    const neighbors = graph.get(node) || []
    for (const neighbor of neighbors) {
      // One of the pitfalls of our normalization is that an :original step
      // references itself in its own use property after normalization.
      // This is an "accepted" circular dependency.
      if (node === ':original' && neighbor !== ':original') {
        continue
      }
      if (dfs(neighbor)) {
        return true // Cycle detected in recursion
      }
    }
    recursionStack.delete(node)
    return false
  }

  for (const [stepName, stepValue] of Object.entries(template.steps)) {
    if (stepName === '__line' || stepName === '__column') continue
    if (!graph.has(stepName)) continue

    if (!visited.has(stepName) && dfs(stepName)) {
      const offendingStep = stepValue as StepWithMetadata // Cast for __line/__column access
      return [
        true,
        {
          stepName,
          line: offendingStep.__line?.use ?? 0, // Assumes 'use' is a key in __line for the property itself
          column: offendingStep.__column?.use ?? 0,
        },
      ] // Circular dependency found
    }
  }

  return [false] // No circular dependencies detected
}

function findDuplicateKeysInAST(
  node: ValueNode,
  path = '',
  annotations: AssemblyLinterResult[] = [],
) {
  if (node.type === 'Object') {
    const keysSeen = new Map<string, ValueNode>()

    for (const property of node.children) {
      const key = property.key.value
      const keyLocation = property.key.loc
      const fullPath = path ? `${path}.${key}` : key

      if (keysSeen.has(key) && keyLocation) {
        const stepName = path.includes('steps.') ? path.split('steps.')[1] : undefined
        // Duplicate key found
        annotations.push({
          code: 'duplicate-key-in-step',
          type: 'warning',
          row: keyLocation.start.line - 1,
          column: keyLocation.start.column - 1,
          message: `Duplicate key '${key}' found`,
          stepName,
          duplicateKeys: [key],
          fixId: 'fix-duplicate-key-in-step',
          fixData: {
            stepName: stepName ?? '',
            duplicateKeys: [key],
          },
        } satisfies AssemblyLinterResult)
      } else {
        keysSeen.set(key, property.value)
      }

      // Recurse into the property value
      findDuplicateKeysInAST(property.value, fullPath, annotations)
    }
  } else if (node.type === 'Array') {
    for (const item of node.children) {
      findDuplicateKeysInAST(item, path, annotations)
    }
  }
}

/**
 * Checks if an assembly is a Smart CDN Assembly by looking for the `/file/serve` robot
 */
export function isSmartCdnAssembly(assembly: TemplateWithMetadata): boolean {
  if (!isObject(assembly) || !isObject(assembly.steps)) {
    return false
  }

  for (const [stepName, step] of Object.entries(assembly.steps)) {
    if (stepName === '__line' || stepName === '__column') continue
    if (!isObject(step)) continue

    const typedStep = step as StepWithMetadata
    if (typedStep.robot === '/file/serve') {
      return true
    }
  }

  return false
}

// This function counts the steps in an assembly
function countSteps(steps: Record<string, unknown>): number {
  // Filter out metadata properties
  return Object.keys(steps).filter((key) => key !== '__line' && key !== '__column').length
}

// Checks if a robot is allowed for Smart CDN
function isRobotAllowedForSmartCdn(robotName: string): boolean {
  if (!robotName || typeof robotName !== 'string') {
    return false
  }

  // Convert robotName like /http/import to httpImportMeta
  const parts = robotName.substring(1).split('/')
  const keyBase = parts
    .map((part, index) => {
      if (index === 0) return part
      return part.charAt(0).toUpperCase() + part.slice(1)
    })
    .join('')
  const robotMetaKey = `${keyBase}Meta`

  const meta = robotsMeta[robotMetaKey as keyof typeof robotsMeta]

  // Check if this robot exists and is allowed for Smart CDN
  return meta?.allowed_for_url_transform === true
}

// This function lints Smart CDN Assemblies
function lintSmartCdn(assembly: Record<string, unknown>): AssemblyLinterResult[] {
  const results: AssemblyLinterResult[] = []

  if (!assembly.steps || typeof assembly.steps !== 'object') {
    return results
  }

  const steps = assembly.steps as Record<string, unknown> & {
    __line?: Record<string, number>
    __column?: Record<string, number>
  }

  // Check step count against limit
  const stepCount = countSteps(steps)
  if (stepCount > MAX_STEPS_PER_URLTRANSFORM_ASSEMBLY) {
    results.push({
      code: 'smart-cdn-max-steps-exceeded',
      type: 'error',
      row: (assembly.__line as Record<string, number> | undefined)?.steps ?? 0,
      column: (assembly.__column as Record<string, number> | undefined)?.steps ?? 0,
      message: `Smart CDN Assemblies are limited to ${MAX_STEPS_PER_URLTRANSFORM_ASSEMBLY} steps, but found ${stepCount} steps`,
      maxStepCount: MAX_STEPS_PER_URLTRANSFORM_ASSEMBLY,
      stepCount,
    })
  }

  // Check for disallowed robots
  for (const [stepName, step] of Object.entries(steps)) {
    if (stepName === '__line' || stepName === '__column' || typeof step !== 'object' || !step) {
      continue
    }

    const typedStep = step as { robot?: string } & Record<string, unknown>
    const robotNameValue = typedStep.robot

    if (robotNameValue && !isRobotAllowedForSmartCdn(robotNameValue)) {
      results.push({
        code: 'smart-cdn-robot-not-allowed',
        type: 'error',
        row: steps.__line?.[stepName] ?? 0,
        column: steps.__column?.[stepName] ?? 0,
        message: `Robot "${robotNameValue}" is not allowed in Smart CDN Assemblies`,
        stepName,
        robot: robotNameValue,
      })
    }
  }

  return results
}

export async function parseAndLint(json: string): Promise<AssemblyLinterResult[]> {
  let ast: ValueNode
  try {
    ast = parse(json, { loc: true })
  } catch (e) {
    if (!(e instanceof Error)) {
      throw e
    }

    if (e.name !== 'SyntaxError') {
      throw e
    }

    if (!isParseError(e)) {
      throw e
    }

    return [
      {
        code: 'invalid-json',
        type: 'error',
        row: e.line - 1,
        column: e.column - 1,
        message: e.rawMessage,
      },
    ]
  }

  const obj = getASTValue(ast)
  const templateMeta = obj as TemplateWithMetadata

  const annotations = lint(templateMeta)

  // Additional checks for Smart CDN assemblies
  if (isSmartCdnAssembly(templateMeta)) {
    annotations.push(...lintSmartCdn(templateMeta))
  }

  findDuplicateKeysInAST(ast, undefined, annotations)

  const [isInfinite, positionalInfo] = isInfiniteAssembly(templateMeta)
  if (isInfinite && positionalInfo) {
    annotations.push({
      code: 'infinite-assembly',
      type: 'error',
      row: positionalInfo.line,
      column: positionalInfo.column,
      stepName: positionalInfo.stepName,
    })
  }

  // Sort the annotations by row numbers descending
  annotations.sort((a, b) => a.row - b.row)

  return annotations
}

function fixWrongStackVersion(content: string, fixData: FixDataWrongStackVersion): string {
  // A wrong stack version is a violation of our schema so we cannot use parseSafeTemplate
  // here.
  let parsed: unknown
  let indent = '  '
  try {
    parsed = JSON.parse(content)
    indent = getIndentation(content)
  } catch (_e) {
    return content
  }

  if (!isObject(parsed)) {
    return content
  }

  const parsedRecord = parsed as Record<string, unknown>
  const stepsValue = parsedRecord.steps
  if (!isObject(stepsValue)) {
    return content
  }

  const stepsRecord = stepsValue as Record<string, unknown>
  const newStepsEntries: [string, unknown][] = []

  for (const [stepName2, step2] of Object.entries(stepsRecord)) {
    if (typeof step2 !== 'object' || step2 === null) {
      newStepsEntries.push([stepName2, step2])
      continue
    }

    let newStep = { ...step2 }
    if (fixData.stepName === stepName2) {
      newStep = { ...step2, [fixData.paramName]: fixData.recommendedVersion }
    }

    newStepsEntries.push([stepName2, newStep])
  }

  return JSON.stringify(
    { ...parsedRecord, steps: Object.fromEntries(newStepsEntries) },
    null,
    indent,
  )
}

function fixMissingUse(content: string, fixData: FixDataMissingUse): string {
  // A missing use is a violation of our schema so we cannot use parseSafeTemplate
  // here.
  let parsed: unknown
  let indent = '  '
  try {
    parsed = JSON.parse(content)
    indent = getIndentation(content)
  } catch (_e) {
    return content
  }

  if (!isObject(parsed)) {
    return content
  }

  const parsedRecord = parsed as Record<string, unknown>
  const stepsValue = parsedRecord.steps
  if (!isObject(stepsValue)) {
    return content
  }

  const stepsRecord = stepsValue as Record<string, unknown>

  // Get the step that needs fixing
  const stepValue = stepsRecord[fixData.stepName]
  if (!isObject(stepValue) || !('robot' in stepValue)) {
    return content
  }

  const step = stepValue as StepInput

  // Get the first upload or import step:
  const firstInputStepName = getFirstStepNameThatDoesNotNeedInput(content)
  if (!firstInputStepName) {
    return content
  }

  // Add the use parameter pointing to :original only if the robot supports it:
  if (doesStepRobotSupportUse(step)) {
    step.use = firstInputStepName
  }

  parsedRecord.steps = stepsRecord

  return JSON.stringify(parsedRecord, null, indent)
}

function fixDuplicateKeyInStep(content: string, _fixData: FixDataDuplicateKeyInStep): string {
  const [templateError, template, indent] = parseSafeTemplate(content)
  if (templateError) {
    // If parsing fails, return the original content
    return content
  }

  return JSON.stringify(template, null, indent)
}

function fixMissingSteps(content: string): string {
  const [templateError, template, indent] = parseSafeTemplate(content)
  if (templateError) {
    return JSON.stringify({ steps: {} }, null, '  ')
  }
  return JSON.stringify({ ...template, steps: {} }, null, indent)
}

function fixMissingInput(content: string): string {
  // A missing input is a violation of our schema so we cannot use parseSafeTemplate
  // here.
  let parsed: unknown
  let indent = '  '
  try {
    parsed = JSON.parse(content)
    indent = getIndentation(content)
  } catch (_e) {
    return content
  }

  if (!isObject(parsed)) {
    return content
  }

  const parsedRecord = parsed as Record<string, unknown>
  const stepsValue = parsedRecord.steps
  if (!isObject(stepsValue)) {
    return content
  }

  const stepsRecord = stepsValue as Record<string, unknown>

  // Add the :original step with /upload/handle robot
  stepsRecord[':original'] = {
    robot: '/upload/handle',
  }

  // Update other steps to use :original if they don't have a 'use' property
  for (const [stepName, step] of Object.entries(stepsRecord)) {
    if (stepName !== ':original' && isObject(step) && !('use' in step) && 'robot' in step) {
      // Use addUseReference instead of direct assignment
      // @ts-expect-error: robot should be good here
      const updatedStep = addUseReference(step, ':original')
      stepsRecord[stepName] = updatedStep
    }
  }

  parsedRecord.steps = stepsRecord

  return JSON.stringify(parsedRecord, null, indent)
}

function fixInvalidStepsType(content: string): string {
  const [templateError, template, indent] = parseSafeTemplate(content)
  if (templateError) {
    return JSON.stringify({ steps: {} }, null, indent)
  }

  // Ensure that steps is always an object, even if it's empty
  if (typeof template.steps !== 'object' || Object.keys(template.steps).length === 0) {
    template.steps = {}
  }

  return JSON.stringify(template, null, indent)
}

function fixEmptySteps(content: string): string {
  const [templateError, template, indent] = parseSafeTemplate(content)
  if (templateError) {
    return content
  }

  if (Object.keys(template.steps ?? {}).length === 0) {
    template.steps = {
      ':original': {
        robot: '/upload/handle',
      },
    }
  }

  return JSON.stringify(template, null, indent)
}

function fixMissingOriginalStorage(content: string): string {
  const [templateError, template, indent] = parseSafeTemplate(content)
  if (templateError) {
    return content
  }

  // Find the storage step
  for (const [, step] of entries(template.steps)) {
    if (step.robot.endsWith('/store')) {
      // Add :original to the use array if it's not already there
      const updatedStep = addUseReference(step, ':original', { leading: true })
      Object.assign(step, updatedStep)
    }
  }

  return JSON.stringify(template, null, indent)
}

// Add new fix function
function fixSmartCdnInputField(content: string, fixData: FixDataSmartCdnInputField): string {
  const [templateError, template, indent] = parseSafeTemplate(content)
  if (templateError) {
    return content
  }

  const step = template.steps?.[fixData.stepName]

  if (!step || step.robot !== '/http/import') {
    return content
  }

  // Type assertion since we know this is an http-import step
  const httpImportStep = step as InterpolatableRobotHttpImportInstructionsWithHiddenFieldsInput

  // Only modify the url field in the specified step
  httpImportStep.url = 'https://demos.transloadit.com/${fields.input}'

  // Stringify back with the same indentation
  return JSON.stringify(template, null, indent)
}

export function applyFix<T extends FixData['fixId']>(
  content: string,
  fixId: T,
  fixData?: Extract<FixData, { fixId: T }>['fixData'],
): string {
  switch (fixId) {
    case 'fix-wrong-stack-version':
      return fixWrongStackVersion(content, fixWrongStackVersionSchema.parse(fixData))
    case 'fix-missing-use':
      return fixMissingUse(content, fixMissingUseSchema.parse(fixData))
    case 'fix-duplicate-key-in-step':
      return fixDuplicateKeyInStep(content, fixDuplicateKeyInStepSchema.parse(fixData))
    case 'fix-missing-input':
      fixMissingInputSchema.parse(fixData)
      return fixMissingInput(content)
    case 'fix-missing-steps':
      fixMissingStepsSchema.parse(fixData)
      return fixMissingSteps(content)
    case 'fix-invalid-steps-type':
      fixInvalidStepsTypeSchema.parse(fixData)
      return fixInvalidStepsType(content)
    case 'fix-empty-steps':
      fixEmptyStepsSchema.parse(fixData)
      return fixEmptySteps(content)
    case 'fix-missing-original-storage':
      fixMissingOriginalStorageSchema.parse(fixData)
      return fixMissingOriginalStorage(content)
    case 'fix-smart-cdn-input-field':
      return fixSmartCdnInputField(content, fixSmartCdnInputFieldSchema.parse(fixData))
    default:
      throw new Error(`Unknown fixId: ${fixId satisfies never}`)
  }
}

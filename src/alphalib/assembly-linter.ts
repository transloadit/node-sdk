// TODO: more linting rules for the future
// - referencing non-existent template credentials
// - using non-existent parameters for robots
// - more linting for /upload/handle (use parameter, :original name)

import type { ValueNode } from 'json-to-ast'
import parse from 'json-to-ast'
import { z } from 'zod'

import { entries } from './object.ts'
import {
  getFirstStepNameThatDoesNotNeedInput,
  hasRobot,
  addUseReference,
  parseSafeTemplate,
  doesStepRobotSupportUse,
  getIndentation,
} from './stepParsing.ts'
import { robotsMeta } from './types/robots/_index.ts'
import { stackVersions } from './types/stackVersions.ts'
import {
  assemblyInstructionsSchema,
  type AssemblyInstructionsInput,
  type StepInput,
} from './types/template.ts'
import { zodParseWithContext } from './zodParseWithContext.ts'

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
  return Object.prototype.hasOwnProperty.call(object, key)
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
function getASTValue(ast: ValueNode) {
  let value: $TSFixMe

  const lines: $TSFixMe = []
  const columns: $TSFixMe = []

  switch (ast.type) {
    case 'Literal':
      value = ast.value
      break
    case 'Array':
      value = []

      ast.children.forEach((property: $TSFixMe) => {
        value.push(getASTValue(property))

        // json-to-ast starts the line and column numbers at 1 but the
        // ace editor expects them to start at 0. To make up for that
        // difference we subtract 1.
        lines.push(property.loc.start.line - 1)
        columns.push(property.loc.start.column - 1)

        Object.defineProperty(value, '__line', { value: lines })
        Object.defineProperty(value, '__column', { value: columns })
      })
      break
    case 'Object':
      value = {}

      ast.children.forEach((property: $TSFixMe) => {
        value[property.key.value] = getASTValue(property.value)

        // json-to-ast starts the line and column numbers at 1 but the
        // ace editor expects them to start at 0. To make up for that
        // difference we subtract 1.
        lines[property.key.value] = property.value.loc.start.line - 1
        columns[property.key.value] = property.value.loc.start.column - 1

        Object.defineProperty(value, '__line', { value: lines })
        Object.defineProperty(value, '__column', { value: columns })
      })
      break
    default:
      break
  }

  return value
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
  step: $TSFixMe,
  stepName: string,
  steps: $TSFixMe,
  stackName: keyof typeof stackVersions,
  result: $TSFixMe,
) {
  const paramName = `${stackName}_stack`

  // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
  if (has(step, paramName) && !stackVersions[stackName].test.test(step[paramName])) {
    result.push({
      code: `wrong-${stackName}-version`,
      stepName,
      robot: step.robot,
      // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
      isAudioRobot: step.robot.indexOf('/audio/') === 0,
      stackVersion: step[paramName],
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
}

function lintUseArray(
  use: $TSFixMe,
  stepName: $TSFixMe,
  stepNames: $TSFixMe,
  result: $TSFixMe,
  row: $TSFixMe,
  column: $TSFixMe,
) {
  if (use.length === 0) {
    result.push({
      code: 'empty-use-array',
      stepName,
      type: 'warning',
      row,
      column,
    })
    return
  }

  use.forEach((obj: $TSFixMe, index: $TSFixMe) => {
    let name
    if (typeof obj === 'object') {
      name = obj.name
    } else if (typeof obj === 'string') {
      name = obj
    }

    if (stepNames.indexOf(name) === -1) {
      result.push({
        code: 'undefined-step',
        stepName,
        wrongStepName: name,
        type: 'error',
        row: use.__line[index],
        column: use.__column[index],
      })
    }
  })
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

// Add this new function after the existing lint function
function lintStepsStructure(assembly: TemplateWithMetadata): AssemblyLinterResult[] {
  const result: AssemblyLinterResult[] = []

  if (!('steps' in assembly)) {
    result.push({
      code: 'missing-steps',
      type: 'error',
      row: 0,
      column: 0,
      message: "The 'steps' property is missing",
      fixId: 'fix-missing-steps',
      fixData: {},
    })
  } else if (!isObject(assembly.steps)) {
    result.push({
      code: 'invalid-steps-type',
      type: 'error',
      row: assembly.__line?.steps ?? 0,
      column: assembly.__column?.steps ?? 0,
      message: "The 'steps' property must be an object",
      fixId: 'fix-invalid-steps-type',
      fixData: {},
    })
  }

  return result
}

// Update the lint function to include the new lintStepsStructure check
export function lint(assembly: TemplateWithMetadata): AssemblyLinterResult[] {
  const result: AssemblyLinterResult[] = []

  if (!('steps' in assembly)) {
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

  result.push(...lintStepsStructure(assembly))

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

    const typedStep = step as StepWithMetadata
    if (!typedStep.robot) continue

    // Check if we have a /file/serve robot anywhere
    if (typedStep.robot === '/file/serve') {
      hasFileServe = true
    }

    // Check if we use ${fields.input} in any import step
    if (isImportRobot(typedStep.robot) || typedStep.robot === '/http/import') {
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
      message: 'Smart CDN path component available as ${fields.input}',
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

    const typedStep = step as StepWithMetadata

    if (!typedStep.robot) {
      result.push({
        code: 'missing-robot',
        stepName,
        type: 'error',
        row: assembly.steps.__line?.[stepName] ?? 0,
        column: assembly.steps.__column?.[stepName] ?? 0,
      })
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
            message: 'Smart CDN path component available as ${fields.input}',
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
        typedStep.robot === '/upload/handle' ||
        (typedStep.robot && isImportRobot(typedStep.robot))
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
      if (Array.isArray(typedStep.use) && typeof typedStep.use[0] === 'string') {
        if (JSON.stringify(typedStep.use).includes(':original')) {
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
        const useObject = typedStep.use as {
          steps?: unknown[]
          __line?: Record<string, number>
          __column?: Record<string, number>
        }
        if (Array.isArray(useObject.steps)) {
          if (useObject.steps.includes(':original')) {
            hasInputStep = true
          }

          lintUseArray(
            useObject.steps,
            stepName,
            stepNames,
            result,
            useObject.__line?.steps,
            useObject.__column?.steps,
          )
        } else if ('use' in typedStep && isObject(typedStep.use)) {
          // @TODO we cannot lint Complex use objects yet, so we'll just assume any object is good here
        } else {
          result.push({
            code: 'missing-use-steps',
            stepName,
            type: 'error',
            row: typedStep.__line.use,
            column: typedStep.__column.use,
          })
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

async function isInfiniteAssembly(
  assemblyWithPositionalInfo: AssemblyInstructionsInput,
): Promise<
  [isInfiniteAssembly: boolean, positionalInfo?: { line: number; column: number; stepName: string }]
> {
  if (!assemblyWithPositionalInfo.steps) return [false]

  // build a graph of step names
  const graph = new Map<string, string[]>()
  for (const [stepName, step] of Object.entries(assemblyWithPositionalInfo.steps)) {
    if (typeof step !== 'object' || step === null || !('use' in step) || !step.use) continue

    if (typeof step.use === 'string') {
      graph.set(stepName, [step.use])
      continue
    }

    if (Array.isArray(step.use)) {
      if (step.use.every((u): u is string => typeof u === 'string')) {
        graph.set(stepName, step.use)
        continue
      } else if (
        step.use.every((u): u is { name: string } => typeof u === 'object' && 'name' in u)
      ) {
        graph.set(
          stepName,
          step.use.map((u) => u.name),
        )
        continue
      }
    }

    if (
      step.use &&
      typeof step.use === 'object' &&
      'steps' in step.use &&
      step.use.steps &&
      Array.isArray(step.use.steps)
    ) {
      if (step.use.steps.every((s): s is string => typeof s === 'string')) {
        graph.set(stepName, step.use.steps)
      } else if (
        step.use.steps.every((s): s is { name: string } => typeof s === 'object' && 'name' in s)
      ) {
        graph.set(
          stepName,
          step.use.steps.map((s) => s.name),
        )
      }
    }
  }

  const visited = new Set()
  const recursionStack = new Set()

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

    recursionStack.delete(node) // Backtrack

    return false
  }

  for (const [stepName, step] of Object.entries(assemblyWithPositionalInfo.steps)) {
    if (!visited.has(stepName) && dfs(stepName)) {
      return [
        true,
        {
          stepName,
          line: (step as $TSFixMe).__line.use,
          column: (step as $TSFixMe).__column.use,
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
  const annotations = lint(obj)

  findDuplicateKeysInAST(ast, undefined, annotations)

  const [isInfinite, positionalInfo] = await isInfiniteAssembly(obj)
  if (isInfinite) {
    annotations.push({
      code: 'infinite-assembly',
      type: 'error',
      row: positionalInfo!.line,
      column: positionalInfo!.column,
      stepName: positionalInfo?.stepName,
    })
  }

  // Sort the annotations by row numbers descending
  annotations.sort((a, b) => a.row - b.row)

  return annotations
}

function fixWrongStackVersion(content: string, fixData: FixDataWrongStackVersion): string {
  // A wrong stack version is a violation of our schema so we cannot use parseSafeTemplate
  // here.
  let parsed
  let indent = '  '
  try {
    parsed = JSON.parse(content)
    indent = getIndentation(content)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (_e) {
    return content
  }

  if (!('steps' in parsed) || !isObject(parsed.steps)) {
    return content
  }

  const newStepsEntries: [string, unknown][] = []

  for (const [stepName2, step2] of Object.entries(parsed.steps)) {
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

  return JSON.stringify({ ...parsed, steps: Object.fromEntries(newStepsEntries) }, null, indent)
}

function fixMissingUse(content: string, fixData: FixDataMissingUse): string {
  // A missing use is a violation of our schema so we cannot use parseSafeTemplate
  // here.
  let parsed
  let indent = '  '
  try {
    parsed = JSON.parse(content)
    indent = getIndentation(content)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (_e) {
    return content
  }

  // Get the step that needs fixing
  const step = parsed.steps[fixData.stepName]
  if (!step || !('robot' in step)) {
    return content
  }

  // Get the first upload or import step:
  const firstInputStepName = getFirstStepNameThatDoesNotNeedInput(content)
  if (!firstInputStepName) {
    return content
  }

  // Add the use parameter pointing to :original only if the robot supports it:
  if (doesStepRobotSupportUse(step)) {
    step.use = firstInputStepName
  }

  return JSON.stringify(parsed, null, indent)
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
  let parsed
  let indent = '  '
  try {
    parsed = JSON.parse(content)
    indent = getIndentation(content)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (_e) {
    return content
  }

  if (!('steps' in parsed) || !isObject(parsed.steps)) {
    return content
  }

  // Add the :original step with /upload/handle robot
  parsed.steps[':original'] = {
    robot: '/upload/handle',
  }

  // Update other steps to use :original if they don't have a 'use' property
  for (const [stepName, step] of Object.entries(parsed.steps)) {
    if (stepName !== ':original' && isObject(step) && !('use' in step) && 'robot' in step) {
      // Use addUseReference instead of direct assignment
      // @ts-expect-error: robot should be good here
      addUseReference({ ...step, use: [] }, ':original')
    }
  }

  return JSON.stringify(parsed, null, indent)
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

  // Only modify the url field in the specified step
  step.url = 'https://demos.transloadit.com/${fields.input}'

  // Stringify back with the same indentation
  return JSON.stringify(template, null, indent)
}

export async function applyFix<T extends FixData['fixId']>(
  content: string,
  fixId: T,
  fixData?: Extract<FixData, { fixId: T }>['fixData'],
): Promise<string> {
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

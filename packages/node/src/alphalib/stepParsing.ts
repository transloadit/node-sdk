import type { ZodObject, ZodRawShape } from 'zod'
import { z } from 'zod'

import { entries } from './object.ts'
import { robotsSchema } from './types/robots/_index.ts'
import {
  useParamArrayOfStringsSchema,
  useParamArrayOfUseParamObjectSchema,
  useParamObjectOfStepsSchema,
  useParamStringSchema,
} from './types/robots/_instructions-primitives.ts'
import type { RobotFilePreviewInstructionsInput } from './types/robots/file-preview.ts'
import type { RobotFileServeInstructionsInput } from './types/robots/file-serve.ts'
import type { RobotS3StoreInstructionsInput } from './types/robots/s3-store.ts'
import type {
  AssemblyInstructionsInput,
  StepInput,
  StepInputWithUse,
  StepsInput,
} from './types/template.ts'
import { assemblyInstructionsSchema } from './types/template.ts'
import type { ZodIssueWithContext } from './zodParseWithContext.ts'
import { zodParseWithContext } from './zodParseWithContext.ts'

type StepInputRecord = StepInput & Record<string, unknown>

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

// Add this type to represent steps that don't require use
export type NoUseRobot =
  | '/upload/handle'
  | '/google/import'
  | '/dropbox/import'
  | '/supabase/import'
  | '/swift/import'
  | '/backblaze/import'
  | '/ftp/import'
  | '/cloudfiles/import'
  | '/cloudflare/import'
  | '/digitalocean/import'
  | '/http/import'
  | '/s3/import'
  | '/azure/import'
  | '/minio/import'
  | '/wasabi/import'
  | '/edgly/deliver'
  | '/tlcdn/deliver'
  | '/sftp/import'

export type StepInputWithoutUse = Omit<StepInput, 'use'> & {
  robot: NoUseRobot
}

export function doesRobotSupportUse(
  robot: string,
): robot is Exclude<StepInput['robot'], NoUseRobot> {
  return (
    robot !== '/upload/handle' &&
    robot !== '/google/import' &&
    robot !== '/dropbox/import' &&
    robot !== '/supabase/import' &&
    robot !== '/swift/import' &&
    robot !== '/backblaze/import' &&
    robot !== '/ftp/import' &&
    robot !== '/cloudfiles/import' &&
    robot !== '/cloudflare/import' &&
    robot !== '/digitalocean/import' &&
    robot !== '/http/import' &&
    robot !== '/s3/import' &&
    robot !== '/azure/import' &&
    robot !== '/minio/import' &&
    robot !== '/wasabi/import' &&
    robot !== '/edgly/deliver' &&
    robot !== '/tlcdn/deliver' &&
    robot !== '/sftp/import'
  )
}

export function doesStepRobotSupportUse(step: StepInput): step is StepInputWithUse {
  return 'robot' in step && doesRobotSupportUse(step.robot)
}

export interface ParsedTemplateField {
  mostCommonExampleValue: FieldOccurrence['exampleValues'][number]
  fieldName: string
  value?: string
  occurrences: FieldOccurrence[]
}

export interface FieldOccurrence {
  errors: string[]
  exampleValues: (string | number | boolean)[]
  leader: string
  paramName: string
  path: (number | string)[]
  requiresDenoEval: boolean
  rName: string
  stepName: string
  trailer: string
}

export interface ValidationError {
  stepName: string
  robotName: string
  paramName: string
  fieldNames: string[]
  message: string
  value: unknown
}

export interface Recommendation {
  id: string
  robotName: string
  description: string
  applyFunction: (content: string) => string
  iconSrc: string
}

export interface InterpolatedTemplateError {
  stepName: string
  robotName: string
  paramName: string
  fieldNames: string[]
  message: string
  value: unknown
}
export function nonSignedSmartCDNUrl(
  argWorkspaceSlug: string,
  argTemplateSlug: string,
  argInputField: string,
  params: Record<string, string | number> = {},
) {
  const workspaceSlug = encodeURIComponent(argWorkspaceSlug)
  const templateSlug = encodeURIComponent(argTemplateSlug)
  const inputField = encodeURIComponent(argInputField)

  const queryParams = new URLSearchParams(
    Object.fromEntries(entries(params).map(([key, value]) => [key, String(value)])),
  )
  queryParams.sort()

  const nonSignedUrl = `https://${workspaceSlug}.tlcdn.com/${templateSlug}/${inputField}?${queryParams}`
  return nonSignedUrl
}

export function simplifyUse(step: StepInput): StepInput {
  if (!doesStepRobotSupportUse(step)) {
    return step
  }

  if (!('use' in step)) {
    return step
  }

  // const zodRes1 = useParamStringSchema.safeParse(step.use)
  const zodRes2 = useParamArrayOfStringsSchema.safeParse(step.use)
  // const zodRes3 = useParamArrayOfUseParamObjectSchema.safeParse(step.use)
  // const zodRes4 = useParamObjectOfStepsSchema.safeParse(step.use)

  if (zodRes2.success) {
    // Turn single element array into a string
    if (zodRes2.data.length === 1) {
      step.use = zodRes2.data[0]
    }
  }

  return step
}

export function getLastUsedStepName(step: StepInput): string | undefined {
  if (!doesStepRobotSupportUse(step)) {
    return undefined
  }
  if (!('use' in step)) {
    return undefined
  }

  const zodRes1 = useParamStringSchema.safeParse(step.use)
  const zodRes2 = useParamArrayOfStringsSchema.safeParse(step.use)
  const zodRes3 = useParamArrayOfUseParamObjectSchema.safeParse(step.use)
  const zodRes4 = useParamObjectOfStepsSchema.safeParse(step.use)

  if (zodRes1.success) {
    return zodRes1.data
  }
  if (zodRes2.success) {
    return zodRes2.data[zodRes2.data.length - 1]
  }
  if (zodRes3.success) {
    return zodRes3.data[zodRes3.data.length - 1].name
  }
  if (zodRes4.success) {
    const zodRes41 = useParamStringSchema.safeParse(zodRes4.data.steps)
    const zodRes42 = useParamArrayOfStringsSchema.safeParse(zodRes4.data.steps)
    const zodRes43 = useParamArrayOfUseParamObjectSchema.safeParse(zodRes4.data.steps)

    if (zodRes41.success) {
      return zodRes41.data
    }
    if (zodRes42.success) {
      return zodRes42.data[zodRes42.data.length - 1]
    }
    if (zodRes43.success) {
      return zodRes43.data[zodRes43.data.length - 1].name
    }
    throw new Error('Invalid use value')
  }

  return undefined
}

export function addUseReference(
  step: StepInput,
  newName: string,
  opts?: {
    leading?: boolean
    silent?: boolean
  },
): StepInput {
  // const step = structuredClone(step)
  const { leading = false } = opts ?? {}

  if (!doesStepRobotSupportUse(step)) {
    return step
  }

  if (!('use' in step)) {
    // TypeScript now knows this step supports 'use' due to the doesStepRobotSupportUse check
    // We need to return a new object with the use property
    return { ...step, use: newName } as StepInput
  }

  const zodRes1 = useParamStringSchema.safeParse(step.use)
  const zodRes2 = useParamArrayOfStringsSchema.safeParse(step.use)
  const zodRes3 = useParamArrayOfUseParamObjectSchema.safeParse(step.use)
  const zodRes4 = useParamObjectOfStepsSchema.safeParse(step.use)

  if (zodRes1.success) {
    step.use = leading ? [newName, zodRes1.data] : [zodRes1.data, newName]
  } else if (zodRes2.success) {
    step.use = leading ? [newName, ...zodRes2.data] : [...zodRes2.data, newName]
  } else if (zodRes3.success) {
    step.use = leading ? [{ name: newName }, ...zodRes3.data] : [...zodRes3.data, { name: newName }]
  } else if (zodRes4.success) {
    const zodRes41 = useParamStringSchema.safeParse(zodRes4.data.steps)
    const zodRes42 = useParamArrayOfStringsSchema.safeParse(zodRes4.data.steps)
    const zodRes43 = useParamArrayOfUseParamObjectSchema.safeParse(zodRes4.data.steps)

    if (zodRes41.success) {
      step.use = leading
        ? { ...zodRes4.data, steps: [newName, zodRes41.data] }
        : { ...zodRes4.data, steps: [zodRes41.data, newName] }
    } else if (zodRes42.success) {
      step.use = leading
        ? { ...zodRes4.data, steps: [newName, ...zodRes42.data] }
        : { ...zodRes4.data, steps: [...zodRes42.data, newName] }
    } else if (zodRes43.success) {
      step.use = leading
        ? { ...zodRes4.data, steps: [{ name: newName }, ...zodRes43.data] }
        : { ...zodRes4.data, steps: [...zodRes43.data, { name: newName }] }
    } else {
      throw new Error('Invalid use value')
    }
  }

  return simplifyUse(step)
}

// Helper function to update 'use' references
export function renameUseReferences(step: StepInput, oldName: string, newName: string): StepInput {
  if (!('use' in step)) {
    return step
  }

  const zodRes1 = useParamStringSchema.safeParse(step.use)
  const zodRes2 = useParamArrayOfStringsSchema.safeParse(step.use)
  const zodRes3 = useParamArrayOfUseParamObjectSchema.safeParse(step.use)
  const zodRes4 = useParamObjectOfStepsSchema.safeParse(step.use)

  if (zodRes1.success) {
    step.use = step.use === oldName ? newName : step.use
  } else if (zodRes2.success) {
    const newUse: z.infer<typeof useParamArrayOfStringsSchema> = []
    for (const currentName of zodRes2.data) {
      if (currentName === oldName) {
        if (!newUse.includes(newName)) {
          newUse.push(newName)
        }
      } else if (!newUse.includes(currentName)) {
        newUse.push(currentName)
      }
    }
    step.use = newUse
  } else if (zodRes3.success) {
    step.use = zodRes3.data.map((u) => ({
      ...u,
      name: u.name === oldName ? newName : u.name,
    }))
  } else if (zodRes4.success) {
    const zodRes41 = useParamStringSchema.safeParse(zodRes4.data.steps)
    const zodRes42 = useParamArrayOfStringsSchema.safeParse(zodRes4.data.steps)
    const zodRes43 = useParamArrayOfUseParamObjectSchema.safeParse(zodRes4.data.steps)

    if (zodRes41.success) {
      step.use = {
        ...zodRes4.data,
        steps: zodRes41.data === oldName ? newName : zodRes41.data,
      }
    } else if (zodRes42.success) {
      step.use = {
        ...zodRes4.data,
        steps: zodRes42.data.map((u) => (u === oldName ? newName : u)),
      }
    } else if (zodRes43.success) {
      step.use = {
        ...zodRes4.data,
        steps: zodRes43.data.map((u) => ({
          ...u,
          name: u.name === oldName ? newName : u.name,
        })),
      }
    } else {
      throw new Error('Invalid use value')
    }
  }

  return simplifyUse(step)
}

export function removeUseReference(step: StepInput, nameToRemove: string): StepInput {
  if (!('use' in step)) {
    return step
  }

  const zodRes1 = useParamStringSchema.safeParse(step.use)
  const zodRes2 = useParamArrayOfStringsSchema.safeParse(step.use)
  const zodRes3 = useParamArrayOfUseParamObjectSchema.safeParse(step.use)
  const zodRes4 = useParamObjectOfStepsSchema.safeParse(step.use)

  if (zodRes1.success) {
    if (step.use === nameToRemove) {
      return { ...step, use: [] }
    }
    return step
  }

  if (zodRes2.success) {
    const newUse = zodRes2.data.filter((u) => u !== nameToRemove)
    return simplifyUse({ ...step, use: newUse })
  }

  if (zodRes3.success) {
    const newUse = zodRes3.data.filter((u) => u.name !== nameToRemove)
    return simplifyUse({ ...step, use: newUse })
  }

  if (zodRes4.success) {
    const zodRes41 = useParamStringSchema.safeParse(zodRes4.data.steps)
    const zodRes42 = useParamArrayOfStringsSchema.safeParse(zodRes4.data.steps)
    const zodRes43 = useParamArrayOfUseParamObjectSchema.safeParse(zodRes4.data.steps)

    if (zodRes41.success) {
      if (zodRes41.data === nameToRemove) {
        return { ...step, use: { ...zodRes4.data, steps: [] } }
      }
      return step
    }

    if (zodRes42.success) {
      const newSteps = zodRes42.data.filter((u) => u !== nameToRemove)
      return simplifyUse({ ...step, use: { ...zodRes4.data, steps: newSteps } })
    }

    if (zodRes43.success) {
      const newSteps = zodRes43.data.filter((u) => u.name !== nameToRemove)
      return simplifyUse({ ...step, use: { ...zodRes4.data, steps: newSteps } })
    }

    throw new Error('Invalid use value')
  }

  return step
}

function isZodObject(schema: z.ZodType<unknown>): schema is ZodObject<ZodRawShape> {
  return 'shape' in schema
}

function getSchemaForRobot(rName: string): z.ZodType<unknown> | undefined {
  // Extract all robot schemas from the union and convert readonly array to regular array
  const schemas = [...robotsSchema._def.options]

  // Find the matching schema based on the robot name
  return schemas.find((schema) => {
    if (!isZodObject(schema)) return false
    const shape = schema.shape

    if (!('robot' in shape)) return false
    const robotField = shape.robot

    if (!(robotField instanceof z.ZodLiteral)) return false

    return robotField.value === rName
  })
}

interface ParseSafeTemplateOpts {
  silent?: boolean
}

export const getIndentation = (templateContent: string) => {
  const lines = templateContent.split('\n')

  // Find the first line with content and its indentation level
  let baseIndent = ''
  let firstContentLine = ''
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.length > 0) {
      firstContentLine = line
      baseIndent = line.slice(0, line.length - trimmed.length)
      break
    }
  }

  // Find the first nested line's indentation
  let nestedIndent = ''
  let foundNested = false
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.length === 0) continue

    // Skip the first content line
    if (line === firstContentLine) continue

    const currentIndent = line.slice(0, line.length - trimmed.length)
    if (currentIndent.length > baseIndent.length) {
      nestedIndent = currentIndent.slice(baseIndent.length)
      foundNested = true
      break
    }
  }

  // If we found nested indentation, use that
  if (foundNested) {
    // For tabs, return the actual number of tabs used
    if (nestedIndent.includes('\t')) {
      return '\t'.repeat(nestedIndent.split('\t').length - 1)
    }
    // For spaces, return the actual number of spaces used
    return nestedIndent
  }

  // Default to 2 spaces if no nested indentation found
  return '  '
}

export class StepParsingError extends Error {
  zodIssuesWithContext: ZodIssueWithContext[]

  humanReadable: string

  constructor(message: string, zodIssuesWithContext: ZodIssueWithContext[], humanReadable: string) {
    super(message)
    this.zodIssuesWithContext = zodIssuesWithContext
    this.humanReadable = humanReadable
  }
}

function formatZodIssuesForLog(
  issues: ZodIssueWithContext[],
): Array<{ path: (string | number)[]; code: string; message: string }> {
  return issues.map((issue) => ({
    path: issue.path,
    code: issue.code,
    message: issue.message,
  }))
}

export const parseSafeTemplate = (
  templateContent: string,
  opts?: ParseSafeTemplateOpts,
): [StepParsingError, null] | [null, AssemblyInstructionsInput, string] => {
  const silent = opts?.silent ?? (process.env.NODE_ENV ?? 'production') === 'production'
  let parsed: unknown
  let indent = '  '
  try {
    parsed = JSON.parse(templateContent)

    indent = getIndentation(templateContent)
  } catch (error) {
    if (!silent) {
      console.error('templateContent', { length: templateContent.length })
    }
    return [
      new StepParsingError(
        `Error parsing valid type from Template. ${error}. Input length: ${templateContent.length}`,
        [],
        '',
      ),
      null,
    ]
  }
  const {
    success,
    errors: zodIssuesWithContext,
    humanReadable,
  } = zodParseWithContext(assemblyInstructionsSchema, parsed)
  if (!success) {
    if (!silent) {
      console.error('zodIssuesWithContext', formatZodIssuesForLog(zodIssuesWithContext))
    }
    return [
      new StepParsingError(
        'Error validating Template against assemblyInstructionsSchema. ',
        zodIssuesWithContext,
        humanReadable,
      ),
      null,
    ]
  }

  // We won't return zodRes.data because that will add all the defaults to the
  // original input. So if we know it will pass, we return the original input.
  // One of the few cases where `as` is safe and allowed.
  const safe = parsed as AssemblyInstructionsInput
  return [null, safe, indent]
}

export function botNeedsInput(robotName: string, stepName?: string, step?: StepInput) {
  if (robotName.endsWith('/import')) {
    return false
  }
  if (robotName === '/upload/handle') {
    return false
  }
  if (robotName === '/html/convert') {
    if (step && 'url' in step && typeof step.url === 'string' && step.url) {
      return false
    }
  }
  if (robotName === '/text/speak') {
    if (step && 'prompt' in step && typeof step.prompt === 'string' && step.prompt) {
      return false
    }
  }
  if (robotName === '/image/generate') {
    return false
  }
  if (stepName === ':original') {
    return false
  }

  return true
}

export function getFirstStepNameThatDoesNotNeedInput(
  templateContent: string,
  excludeBots: string[] = [],
): string {
  // Used by functions that fix missing use parameters, which is
  // a violation of our schema so we cannot use parseSafeTemplate
  // here.
  let parsed: unknown
  try {
    parsed = JSON.parse(templateContent)
  } catch (_e) {
    return ''
  }

  if (!isRecord(parsed) || !('steps' in parsed)) {
    return ''
  }

  const stepsValue = (parsed as Record<string, unknown>).steps
  if (!isRecord(stepsValue)) {
    return ''
  }

  const stepsRecord = stepsValue as Record<string, StepInputRecord>

  return getFirstStepNameThatDoesNotNeedInputFromSteps(stepsRecord, excludeBots)
}

const getFirstStepNameThatDoesNotNeedInputFromSteps = (
  steps: Record<string, StepInputRecord>,
  excludeBots: string[] = [],
): string => {
  return (
    Object.keys(steps).find((stepName) => {
      const step = steps[stepName]
      return (
        typeof step === 'object' &&
        step !== null &&
        typeof step.robot === 'string' &&
        !botNeedsInput(step.robot, stepName, step) &&
        !excludeBots.includes(step.robot)
      )
    }) ?? ''
  )
}

function hasRobotInSteps(steps: StepsInput, rName: string | RegExp): boolean {
  return Object.values(steps).some((step) => {
    return typeof rName === 'string' ? step.robot === rName : rName.test(step.robot)
  })
}

const hasSteps = (
  template: AssemblyInstructionsInput,
): template is AssemblyInstructionsInput & { steps: StepsInput } => {
  return typeof template.steps === 'object' && template.steps !== null
}

export const hasRobot = (
  templateContent: string,
  rName: string | RegExp,
  silent?: boolean,
): boolean => {
  const parseOpts = silent === undefined ? undefined : { silent }
  const [templateError, template] = parseSafeTemplate(templateContent, parseOpts)
  if (templateError) {
    return false
  }

  return Object.values(template.steps ?? {}).some((step) => {
    return typeof rName === 'string' ? step.robot === rName : rName.test(step.robot)
  })
}

export const doesContentRequireUpload = (templateContent: string, opts?: { silent: boolean }) => {
  const hasFileUploadRobot = hasRobot(templateContent, '/file/upload', opts?.silent)
  const hasOriginalStepName = templateContent.includes(':original')

  if (hasFileUploadRobot || hasOriginalStepName) {
    return true
  }

  return false
}

export const canAssemblyJustRun = (templateContent: string) => {
  const firstStepNameThatDoesNotNeedInput = getFirstStepNameThatDoesNotNeedInput(templateContent, [
    '/upload/handle',
  ])

  if (firstStepNameThatDoesNotNeedInput !== '') {
    return true
  }

  return false
}

export function addOptimizeRobots(templateContent: string): string {
  const [templateError, template, indent] = parseSafeTemplate(templateContent)
  if (templateError) {
    return templateContent
  }

  const newSteps: StepsInput = {}
  let hasResizeStep = false

  for (const [stepName, step] of entries(template.steps)) {
    newSteps[stepName] = step

    if (step.robot === '/image/resize') {
      hasResizeStep = true
      const optimizeStepName = `${stepName}_optimized`
      const optimizeStep: StepInput = {
        robot: '/image/optimize',
        use: [],
      }
      addUseReference(optimizeStep, stepName)
      newSteps[optimizeStepName] = optimizeStep

      // Update subsequent steps to use the new optimize step
      for (const [, nextStep] of entries(template.steps)) {
        renameUseReferences(nextStep, stepName, optimizeStepName)
      }
    }
  }

  if (!hasResizeStep) {
    return templateContent
  }

  template.steps = newSteps
  return JSON.stringify(template, null, indent)
}

export function removeRobots(templateContent: string, robots: string[] | RegExp = []): string {
  const [templateError, template, indent] = parseSafeTemplate(templateContent)
  if (templateError) {
    return templateContent
  }
  if (!('steps' in template) || typeof template.steps !== 'object') {
    return templateContent
  }

  const newSteps: StepsInput = {}

  const firstImportStepName = Object.keys(template.steps).find((stepName) =>
    template.steps?.[stepName]?.robot?.endsWith('/import'),
  )

  let usedBefore = ''
  for (const [stepName, step] of entries(template.steps)) {
    if (Array.isArray(robots) ? robots.includes(step.robot) : robots.test(step.robot)) {
      usedBefore = stepName
      continue
    }

    if (step.robot === '/file/serve' && firstImportStepName && usedBefore) {
      // Copy step before modifying
      const updatedStep = { ...step }
      renameUseReferences(updatedStep, usedBefore, firstImportStepName)
      newSteps[stepName] = updatedStep
    } else {
      newSteps[stepName] = step
    }
  }

  return JSON.stringify({ ...template, steps: newSteps }, null, indent)
}

export function removeFileServeRobots(templateContent: string): string {
  return removeRobots(templateContent, ['/file/serve'])
}

export function removeUploading(templateContent: string): string {
  const [templateError, template, indent] = parseSafeTemplate(templateContent)
  if (templateError) {
    return templateContent
  }
  if (!('steps' in template) || typeof template.steps !== 'object') {
    return templateContent
  }

  const newSteps: StepsInput = {}

  const firstImportStepName = Object.keys(template.steps).find((stepName) =>
    template.steps?.[stepName]?.robot?.endsWith('/import'),
  )

  for (const [stepName, step] of entries(template.steps)) {
    if (step.robot !== '/upload/handle') {
      newSteps[stepName] = firstImportStepName
        ? renameUseReferences(step, ':original', firstImportStepName)
        : step
    }
  }

  template.steps = newSteps
  return JSON.stringify(template, null, indent)
}

export function getRobotList(templateContent: string): string[] {
  const [templateError, template] = parseSafeTemplate(templateContent)
  if (templateError) {
    return []
  }

  return entries(template.steps).map(([, step]) => step.robot)
}

export function addStorageRobot(content: string): string {
  const [templateError2, template2, indent] = parseSafeTemplate(content)
  if (templateError2) {
    return content
  }
  if (!('steps' in template2) || typeof template2.steps !== 'object') {
    return content
  }

  // Find the last non-storage step
  let lastNonStorageStep = ''
  for (const [stepName, step] of entries(template2.steps)) {
    if (!step.robot.endsWith('/store')) {
      lastNonStorageStep = stepName
    }
  }

  const storedStep: RobotS3StoreInstructionsInput = {
    robot: '/s3/store' as const,
    credentials: 'YOUR_S3_CREDENTIALS',
    path: '/uploads/${file.id}/${file.name}',
    use: [],
  }

  // Add references in order
  if (lastNonStorageStep) {
    addUseReference(storedStep, lastNonStorageStep)
  }
  if (template2.steps[':original']) {
    addUseReference(storedStep, ':original')
  }

  template2.steps.stored = storedStep

  return JSON.stringify(template2, null, indent)
}

export function addFilePreviewRobot(templateContent: string): string {
  const [templateError, template, indent] = parseSafeTemplate(templateContent)
  if (templateError) {
    return templateContent
  }
  if (!('steps' in template) || typeof template.steps !== 'object') {
    return templateContent
  }
  const steps = template.steps
  const newSteps: StepsInput = {}

  let importStepName: string | null = null
  let serveStep: string | null = null
  let width: RobotFilePreviewInstructionsInput['width']
  let height: RobotFilePreviewInstructionsInput['height']
  let format: RobotFilePreviewInstructionsInput['format']

  // Identify steps and extract width
  for (const [stepName, step] of entries(steps)) {
    if (!botNeedsInput(step.robot)) {
      importStepName = stepName
    } else if (['/image/resize', '/video/thumb'].includes(step.robot)) {
      if ('width' in step && (typeof step.width === 'number' || typeof step.width === 'string')) {
        width = step.width
      }
      if (
        'height' in step &&
        (typeof step.height === 'number' || typeof step.height === 'string')
      ) {
        height = step.height
      }
      if ('format' in step) {
        if (step.format === 'png') {
          format = 'png'
        } else if (step.format === 'jpg') {
          format = 'jpg'
        } else if (step.format === 'gif') {
          format = 'gif'
        }
      }
    } else if (step.robot === '/file/serve') {
      serveStep = stepName
    }
  }

  // Add import step
  if (importStepName) {
    newSteps[importStepName] = steps[importStepName]
  }

  if (!width) {
    if (serveStep) {
      width = '${fields.w}'
    } else {
      width = 500
    }
  }
  if (!height) {
    if (serveStep) {
      height = '${fields.h}'
    } else {
      height = 250
    }
  }

  if (!format) {
    format = 'png'
  }

  // Add preview step
  newSteps.previewed = {
    robot: '/file/preview',
    use: [],
    format,
    width,
    height,
    resize_strategy: 'min_fit',
  } satisfies RobotFilePreviewInstructionsInput
  if (importStepName) {
    addUseReference(newSteps.previewed, importStepName)
  }

  // Update serve step
  if (serveStep) {
    newSteps[serveStep] = {
      robot: '/file/serve',
      use: [],
    } satisfies RobotFileServeInstructionsInput
    // Always use 'previewed' as the source for serve step
    addUseReference(newSteps[serveStep], 'previewed')
  }

  template.steps = newSteps
  return JSON.stringify(template, null, indent)
}

export function getRecommendations(templateContent: string, silent?: boolean): Recommendation[] {
  const parseOpts = silent === undefined ? undefined : { silent }
  const [templateError, template] = parseSafeTemplate(templateContent, parseOpts)
  if (templateError) {
    return []
  }
  if (!hasSteps(template)) {
    return []
  }

  const recommendations: Recommendation[] = []
  const steps = template.steps

  const stepCount = Object.keys(steps).length
  const canJustRun = getFirstStepNameThatDoesNotNeedInputFromSteps(steps, ['/upload/handle']) !== ''
  const hasFileServe = hasRobotInSteps(steps, '/file/serve')
  const hasStorageRobot = hasRobotInSteps(steps, /\/store$/)
  const hasImageResizeStep = hasRobotInSteps(steps, '/image/resize')
  const hasVideoThumbStep = hasRobotInSteps(steps, '/video/thumb')
  const hasImageResizeOrVideoThumb = hasImageResizeStep || hasVideoThumbStep

  // Add the storage recommendation if needed
  if (!hasStorageRobot && !hasFileServe) {
    recommendations.push({
      id: 'ADD_STORAGE',
      robotName: 'Add Storage Robot',
      description: 'Add a storage Robot to permanently save your processed files.',
      applyFunction: (templateContent2) => addStorageRobot(templateContent2),
      iconSrc: '/assets/images/robots/s3-store.png',
    })
  }

  if (stepCount === 2 && canJustRun && hasFileServe) {
    recommendations.push({
      id: 'ADD_FILE_PREVIEW',
      robotName: 'Add /file/preview',
      description:
        'You are serving assets directly to users. Consider adding a preview Step to reduce sizes and bandwidth usage.',
      applyFunction: (templateContent2) => addFilePreviewRobot(templateContent2),
      iconSrc: '/assets/images/robots/file-preview.png',
    })
  } else if (stepCount === 3 && canJustRun && hasFileServe && hasImageResizeOrVideoThumb) {
    const robotToSwap = hasImageResizeStep ? '/image/resize' : '/video/thumb'
    const imageOrVideo = hasImageResizeStep ? 'image' : 'video'
    const negative = hasImageResizeStep ? 'video' : 'image'

    recommendations.push({
      id: 'REPLACE_THUMBESQUE_WITH_FILE_PREVIEW',
      robotName: 'Use /file/preview',
      description: `If you swap out the ${robotToSwap} Step for /file/preview, you can serve previews of not only ${imageOrVideo}s but also ${negative}s, audio, PDFs, and more.`,
      applyFunction: (templateContent2) => addFilePreviewRobot(templateContent2),
      iconSrc: '/assets/images/robots/file-preview.png',
    })
  } else if (
    hasRobotInSteps(steps, '/image/resize') &&
    !hasRobotInSteps(steps, '/image/optimize')
  ) {
    recommendations.push({
      id: 'ADD_IMAGE_OPTIMIZE',
      robotName: 'Add /image/optimize',
      description: 'Optimize your resized images to reduce file size without losing quality.',
      applyFunction: (templateContent2) => addOptimizeRobots(templateContent2),
      iconSrc: '/assets/images/robots/image-optimize.png',
    })
  }

  // Sort recommendations by id to ensure consistent order
  return recommendations.sort((a, b) => a.id.localeCompare(b.id))
}

export function addFileServeRobot(templateContent: string): string {
  const [templateError, template, indent] = parseSafeTemplate(templateContent)
  if (templateError) {
    return templateContent
  }
  if (!('steps' in template) || typeof template.steps !== 'object') {
    return templateContent
  }

  const { steps } = template

  let lastNonImportStepName = ''
  let lastExportStepName = ''

  // Find the last non-import step and any export step
  for (const [stepName, step] of entries(steps)) {
    if (!step.robot.endsWith('/import')) {
      lastNonImportStepName = stepName
    }
    if (step.robot.includes('/store')) {
      lastExportStepName = stepName
    }
  }

  // If there's an export step, replace it with /file/serve
  if (lastExportStepName) {
    const lastExportStep = steps[lastExportStepName]
    delete steps[lastExportStepName]

    const finalUse = getLastUsedStepName(lastExportStep)
    if (finalUse) {
      steps.served = {
        robot: '/file/serve',
        use: [],
      } satisfies RobotFileServeInstructionsInput
      addUseReference(steps.served, finalUse)
    }
  } else {
    // If no export step, append /file/serve as a new step
    steps.served = {
      robot: '/file/serve',
      use: [],
    } satisfies RobotFileServeInstructionsInput
    addUseReference(steps.served, lastNonImportStepName)
  }

  return JSON.stringify(template, null, indent)
}

export function addUploadHandleRobot(templateContent: string): string {
  const [templateError, template, indent] = parseSafeTemplate(templateContent)
  if (templateError) {
    return templateContent
  }
  if (!('steps' in template) || typeof template.steps !== 'object') {
    return templateContent
  }

  const steps = template.steps

  const stepsOrder = Object.keys(steps)
  let firstImportStepName: string | null = null
  let firstImportStepIndex = -1

  // Find the first import step
  for (let i = 0; i < stepsOrder.length; i++) {
    const stepName = stepsOrder[i]
    const step = steps[stepName]
    if (step.robot.endsWith('/import')) {
      firstImportStepName = stepName
      firstImportStepIndex = i
      break
    }
  }

  const newSteps: StepsInput = {}
  if (firstImportStepName !== null && firstImportStepIndex >= 0) {
    // Replace the first import step with ':original' at the same position
    const stepsOrderNew = [...stepsOrder]
    stepsOrderNew[firstImportStepIndex] = ':original'

    for (const stepName of stepsOrderNew) {
      if (stepName === ':original') {
        newSteps[stepName] = { robot: '/upload/handle' }
      } else {
        let step = steps[stepName]
        step = renameUseReferences(step, firstImportStepName, ':original')
        newSteps[stepName] = step
      }
    }
  } else {
    // No import step, insert ':original' before the first step
    const stepsOrderNew = [':original', ...stepsOrder]
    let isFirstStep = true
    for (const stepName of stepsOrderNew) {
      if (stepName === ':original') {
        newSteps[stepName] = { robot: '/upload/handle' }
      } else {
        const step = steps[stepName]
        if (
          isFirstStep &&
          (!('use' in step) || (Array.isArray(step.use) && step.use.length === 0)) &&
          doesStepRobotSupportUse(step)
        ) {
          step.use = ':original'
          isFirstStep = false
        }
        newSteps[stepName] = step
      }
    }
  }

  template.steps = newSteps
  return JSON.stringify(template, null, indent)
}

export function addImportRobot(templateContent: string): string {
  const [templateError, template, indent] = parseSafeTemplate(templateContent)
  if (templateError) {
    return templateContent
  }
  if (!('steps' in template) || typeof template.steps !== 'object') {
    return templateContent
  }

  const steps = template.steps
  const newSteps: StepsInput = {}

  // Check if an import or html/convert robot already exists
  const hasImportRobot =
    Boolean(getFirstStepNameThatDoesNotNeedInput(templateContent)) &&
    !hasRobot(templateContent, '/upload/handle')
  if (hasImportRobot) {
    return templateContent // No changes needed
  }

  const uploadHandleStepName = Object.keys(steps).find(
    (stepName) => steps[stepName].robot === '/upload/handle',
  )

  // Find the first non-import-non-export step to determine media type
  let firstNonImportExportStep: StepInput | undefined
  for (const [, step] of entries(steps)) {
    if (
      !firstNonImportExportStep &&
      !step.robot.endsWith('/import') &&
      !step.robot.includes('/store') &&
      step.robot !== '/file/serve'
    ) {
      firstNonImportExportStep = step
    }
  }

  // Add the import step, replacing the upload/handle step if it exists
  const importStepName = 'imported'

  let url: string

  // Set URL based on the type of media being processed
  const robotName = firstNonImportExportStep?.robot || ''
  if (robotName.startsWith('/image/') || robotName === '/file/preview') {
    url = 'https://demos.transloadit.com/inputs/prinsengracht.jpg'
  } else if (robotName.startsWith('/video/')) {
    url = 'https://demos.transloadit.com/inputs/wave10.mp4'
  } else if (robotName.startsWith('/audio/')) {
    url = 'https://demos.transloadit.com/inputs/joakim_karud-rock_angel.mp3'
  } else if (robotName.startsWith('/document/')) {
    url = 'https://demos.transloadit.com/inputs/aws-cloud-best-practices.pdf'
  } else {
    url = 'https://demos.transloadit.com/inputs/prinsengracht.jpg'
  }

  newSteps[importStepName] = {
    robot: '/http/import',
    url,
  } satisfies StepInput

  // Update references and add other steps
  for (const [stepName, step] of entries(steps)) {
    if (stepName !== uploadHandleStepName) {
      const updatedStep = { ...step }
      if (uploadHandleStepName) {
        renameUseReferences(updatedStep, uploadHandleStepName, importStepName)
      } else if (
        !('use' in updatedStep) ||
        (Array.isArray(updatedStep.use) && updatedStep.use.length === 0)
      ) {
        addUseReference(updatedStep, importStepName)
      }
      newSteps[stepName] = updatedStep
    }
  }

  template.steps = newSteps
  return JSON.stringify(template, null, indent)
}

export function addFieldsInput(templateContent: string): string {
  let parsed: unknown
  let indent = '  '
  try {
    parsed = JSON.parse(templateContent)
    indent = getIndentation(templateContent)
  } catch (_e) {
    return templateContent
  }

  if (!isRecord(parsed)) {
    return templateContent
  }

  const parsedRecord = parsed as Record<string, unknown>
  const stepsValue = parsedRecord.steps
  if (!isRecord(stepsValue)) {
    return templateContent
  }

  const steps = stepsValue as Record<string, StepInputRecord>

  for (const [, step] of entries(steps)) {
    if (step.robot === '/http/import') {
      if ('url' in step && typeof step.url === 'string') {
        if (!step.url.includes('${fields.input}')) {
          let url: URL
          try {
            url = new URL(step.url)
            url.pathname = '${fields.input}'
            step.url = url.toString().replaceAll('%7B', '{').replaceAll('%7D', '}')
          } catch (_e) {
            step.url = 'https://demos.transloadit.com/${fields.input}'
          }
        }
      } else {
        step.url = 'https://demos.transloadit.com/${fields.input}'
      }
    } else if (step.robot.endsWith('/import')) {
      if ('path' in step && typeof step.path === 'string') {
        if (!step.path.includes('${fields.input}')) {
          let url: URL
          try {
            url = new URL(step.path)
            url.pathname = '${fields.input}'
            step.path = url.toString().replaceAll('%7B', '{').replaceAll('%7D', '}')
          } catch (_e) {
            step.path = '${fields.input}'
          }
        }
      } else {
        step.path = '${fields.input}'
      }
      break
    }
  }

  parsedRecord.steps = steps

  return JSON.stringify(parsedRecord, null, indent)
}

function getExampleValueForField(
  rName: string,
  paramName: string,
): FieldOccurrence['exampleValues'][number][] {
  if (rName === '/http/import' && paramName === 'url') {
    return ['inputs/prinsengracht.jpg']
  }
  if (rName.endsWith('/import') && paramName === 'path') {
    return ['inputs/prinsengracht.jpg']
  }

  if (paramName === 'width') {
    return [400]
  }
  if (paramName === 'height') {
    return [180]
  }

  return []
}

function getMostCommonExampleValue(
  occurrences: FieldOccurrence[],
): FieldOccurrence['exampleValues'][number] {
  const exampleValues = occurrences.map((occurrence) => occurrence.exampleValues[0])
  const exampleValueCounts = new Map<FieldOccurrence['exampleValues'][number], number>()

  for (const value of exampleValues) {
    exampleValueCounts.set(value, (exampleValueCounts.get(value) || 0) + 1)
  }

  let mostCommonValue: string | number | boolean | undefined
  let maxCount = 0

  for (const [value, count] of exampleValueCounts.entries()) {
    if (count > maxCount) {
      maxCount = count
      mostCommonValue = value
    }
  }

  if (mostCommonValue === undefined) {
    return ''
  }

  return mostCommonValue
}

// Modify the extractFieldNamesFromTemplate function
export function extractFieldNamesFromTemplate(templateContent: string): ParsedTemplateField[] {
  const [templateError, template] = parseSafeTemplate(templateContent)
  if (templateError) {
    return []
  }
  const fieldsMap = new Map<string, ParsedTemplateField>()

  function traverse(value: unknown, path: (number | string)[], stepName: string, rName: string) {
    if (typeof value === 'string') {
      const matches = value.match(/\${fields\.([a-zA-Z0-9_]+)}/g)
      if (matches) {
        for (const match of matches) {
          const fieldName = match.slice(9, -1)
          let field = fieldsMap.get(fieldName)
          if (!field) {
            field = {
              fieldName,
              occurrences: [],
              mostCommonExampleValue: '',
            }
            fieldsMap.set(fieldName, field)
          }

          const parts = value.split(match)
          const [leader, trailer] = parts
          const paramName = String(path[0])

          field.occurrences.push({
            stepName,
            exampleValues: getExampleValueForField(rName, paramName),
            rName,
            paramName,
            leader,
            trailer,
            requiresDenoEval: false,
            errors: [],
            path: [stepName, ...path],
          })
        }
      }
    } else if (Array.isArray(value)) {
      for (const [index, item] of value.entries()) {
        traverse(item, [...path, index], stepName, rName)
      }
    } else if (typeof value === 'object' && value !== null) {
      for (const [key, childValue] of entries(value)) {
        traverse(childValue, [...path, key], stepName, rName)
      }
    }
  }

  for (const [stepName, step] of entries(template.steps || {})) {
    if (typeof step !== 'object' || step === null) {
      continue
    }
    if (!('robot' in step)) {
      continue
    }
    if (typeof step.robot !== 'string') {
      continue
    }
    const rName = step.robot || ''
    traverse(step, [], stepName, rName)
  }

  for (const field of fieldsMap.values()) {
    field.mostCommonExampleValue = getMostCommonExampleValue(field.occurrences)
  }

  return Array.from(fieldsMap.values())
}

function getFinalType(schema: z.ZodTypeAny): z.ZodTypeAny {
  if (schema instanceof z.ZodOptional || schema instanceof z.ZodNullable) {
    return getFinalType(schema.unwrap())
  }
  if (schema instanceof z.ZodDefault) {
    return getFinalType(schema._def.innerType)
  }
  return schema
}

export function interpolateFieldsInTemplate(
  templateContent: string,
  allFields: ParsedTemplateField[],
  opts?: { silent: boolean },
): AssemblyInstructionsInput {
  const [templateError, template] = parseSafeTemplate(templateContent, opts)
  if (templateError) {
    return { steps: {} }
  }
  const { steps } = template
  const newSteps: StepsInput = {}

  for (const [stepName, step] of entries(steps)) {
    const newStep = { ...step }

    for (const [paramName, paramValue] of entries(step)) {
      if (typeof paramValue === 'string') {
        let newValue: string | number | boolean = paramValue

        for (const field of allFields) {
          for (const occurrence of field.occurrences) {
            if (occurrence.stepName === stepName && occurrence.paramName === paramName) {
              const compiledValue = `${occurrence.leader}${field.value}${occurrence.trailer}`
              newValue = compiledValue
            }
          }
        }

        // Convert to number if expected
        const schema = getSchemaForRobot(step.robot)
        if (schema && isZodObject(schema)) {
          const paramSchema = schema.shape[paramName]
          const finalParamSchema = getFinalType(paramSchema)

          if (finalParamSchema instanceof z.ZodNumber) {
            const num = Number(newValue)
            if (!Number.isNaN(num)) {
              newValue = num
            }
          }
        }

        Object.assign(newStep, { [paramName]: newValue })
      }
    }

    newSteps[stepName] = newStep
  }

  return { ...template, steps: newSteps }
}

export function validateInterpolatedTemplate(
  template: AssemblyInstructionsInput,
  fieldsWithValues: ParsedTemplateField[],
  fieldNameToValidate?: string,
): ValidationError[] {
  const errors: ValidationError[] = []

  for (const [stepName, step] of entries(template.steps)) {
    const schema = getSchemaForRobot(step.robot)
    if (!schema) {
      console.error('No schema linked up for', step.robot)
      continue
    }

    const zodRes = schema.safeParse(step)
    if (!zodRes.success) {
      for (const err of zodRes.error.errors) {
        if (err.path.length !== 1) {
          continue
        }
        if (typeof err.path[0] !== 'string') {
          continue
        }

        const fieldNames: string[] = []
        for (const field of fieldsWithValues) {
          if (field.fieldName === fieldNameToValidate || fieldNameToValidate === undefined) {
            for (const occurrence of field.occurrences) {
              if (occurrence.stepName === stepName && occurrence.paramName === err.path[0]) {
                fieldNames.push(field.fieldName)
              }
            }
          }
        }

        if (fieldNames.length > 0) {
          const paramName = err.path[0]
          const value = Object.entries(step).find(([key]) => key === paramName)?.[1]
          errors.push({
            stepName,
            robotName: step.robot,
            paramName,
            value,
            fieldNames,
            message: err.message,
          })
        }
      }
    }
  }

  return errors
}

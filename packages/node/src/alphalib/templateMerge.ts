import merge from 'lodash-es/merge.js'
import type { ResponseTemplateContent, TemplateContent } from '../apiTypes.ts'
import type { AssemblyInstructionsInput } from './types/template.ts'

export function mergeTemplateContent(
  template: TemplateContent | ResponseTemplateContent,
  params?: AssemblyInstructionsInput,
): AssemblyInstructionsInput {
  const templateContent = structuredClone(template) as TemplateContent | ResponseTemplateContent
  const templateRecord = templateContent as Record<string, unknown>

  if (templateContent.allow_steps_override == null) {
    templateContent.allow_steps_override = true
  }

  if (params?.steps != null && templateContent.allow_steps_override === false) {
    throw new Error('TEMPLATE_DENIES_STEPS_OVERRIDE')
  }

  if (params == null) {
    return templateContent as AssemblyInstructionsInput
  }

  const paramsRecord = { ...params } as Record<string, unknown>
  for (const key of Object.keys(templateRecord)) {
    if (paramsRecord[key] === null && templateRecord[key] !== null) {
      paramsRecord[key] = templateRecord[key]
    }
  }

  return merge({}, templateRecord, paramsRecord) as AssemblyInstructionsInput
}

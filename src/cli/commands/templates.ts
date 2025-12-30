import fsp from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'
import { Command, Option } from 'clipanion'
import rreaddir from 'recursive-readdir'
import { z } from 'zod'
import { tryCatch } from '../../alphalib/tryCatch.ts'
import type { Steps } from '../../alphalib/types/template.ts'
import { stepsSchema } from '../../alphalib/types/template.ts'
import type { TemplateContent } from '../../apiTypes.ts'
import type { Transloadit } from '../../Transloadit.ts'
import { createReadStream, formatAPIError, streamToBuffer } from '../helpers.ts'
import type { IOutputCtl } from '../OutputCtl.ts'
import ModifiedLookup from '../template-last-modified.ts'
import type { TemplateFile } from '../types.ts'
import { ensureError, isTransloaditAPIError, TemplateFileDataSchema } from '../types.ts'
import { AuthenticatedCommand } from './BaseCommand.ts'

const rreaddirAsync = promisify(rreaddir)

export interface TemplateCreateOptions {
  name: string
  file: string
}

export interface TemplateGetOptions {
  templates: string[]
}

export interface TemplateModifyOptions {
  template: string
  name?: string
  file: string
}

interface TemplateDeleteOptions {
  templates: string[]
}

interface TemplateListOptions {
  before?: string
  after?: string
  order?: 'asc' | 'desc'
  sort?: string
  fields?: string[]
}

export interface TemplateSyncOptions {
  files: string[]
  recursive?: boolean
}

export async function create(
  output: IOutputCtl,
  client: Transloadit,
  { name, file }: TemplateCreateOptions,
): Promise<unknown> {
  try {
    const buf = await streamToBuffer(createReadStream(file))

    const parsed: unknown = JSON.parse(buf.toString())
    const validated = stepsSchema.safeParse(parsed)
    if (!validated.success) {
      throw new Error(`Invalid template steps format: ${validated.error.message}`)
    }

    const result = await client.createTemplate({
      name,
      // Steps (validated) is assignable to StepsInput at runtime; cast for TS
      template: { steps: validated.data } as TemplateContent,
    })
    output.print(result.id, result)
    return result
  } catch (err) {
    const error = ensureError(err)
    output.error(error.message)
    throw err
  }
}

export async function get(
  output: IOutputCtl,
  client: Transloadit,
  { templates }: TemplateGetOptions,
): Promise<void> {
  const requests = templates.map((template) => client.getTemplate(template))

  const [err, results] = await tryCatch(Promise.all(requests))
  if (err) {
    output.error(formatAPIError(err))
    throw err
  }

  for (const result of results) {
    output.print(result, result)
  }
}

export async function modify(
  output: IOutputCtl,
  client: Transloadit,
  { template, name, file }: TemplateModifyOptions,
): Promise<void> {
  try {
    const buf = await streamToBuffer(createReadStream(file))

    let steps: Steps | null = null
    let newName = name

    if (buf.length > 0) {
      const parsed: unknown = JSON.parse(buf.toString())
      const validated = stepsSchema.safeParse(parsed)
      if (!validated.success) {
        throw new Error(`Invalid template steps format: ${validated.error.message}`)
      }
      steps = validated.data
    }

    if (!name || buf.length === 0) {
      const tpl = await client.getTemplate(template)
      if (!name) newName = tpl.name
      if (buf.length === 0 && tpl.content.steps) {
        steps = tpl.content.steps
      }
    }

    if (steps === null) {
      throw new Error('No steps to update template with')
    }

    await client.editTemplate(template, {
      name: newName,
      // Steps (validated) is assignable to StepsInput at runtime; cast for TS
      template: { steps } as TemplateContent,
    })
  } catch (err) {
    output.error(formatAPIError(err))
    throw err
  }
}

async function deleteTemplates(
  output: IOutputCtl,
  client: Transloadit,
  { templates }: TemplateDeleteOptions,
): Promise<void> {
  await Promise.all(
    templates.map(async (template) => {
      const [err] = await tryCatch(client.deleteTemplate(template))
      if (err) {
        output.error(formatAPIError(err))
        throw err
      }
    }),
  )
}

// Export with `delete` alias for external consumers
export { deleteTemplates as delete }

const TemplateIdSchema = z.object({
  id: z.string(),
})

function list(
  output: IOutputCtl,
  client: Transloadit,
  { before, after, order, sort, fields }: TemplateListOptions,
): void {
  const stream = client.streamTemplates({
    todate: before,
    fromdate: after,
    order,
    sort: sort as 'id' | 'name' | 'created' | 'modified' | undefined,
  })

  stream.on('readable', () => {
    const template: unknown = stream.read()
    if (template == null) return

    const parsed = TemplateIdSchema.safeParse(template)
    if (!parsed.success) return

    if (fields == null) {
      output.print(parsed.data.id, template)
    } else {
      const templateRecord = template as Record<string, unknown>
      output.print(fields.map((field) => templateRecord[field]).join(' '), template)
    }
  })

  stream.on('error', (err: unknown) => {
    output.error(formatAPIError(err))
  })
}

export async function sync(
  output: IOutputCtl,
  client: Transloadit,
  { files, recursive }: TemplateSyncOptions,
): Promise<void> {
  // Promise [String] -- all files in the directory tree
  const relevantFilesNested = await Promise.all(
    files.map(async (file) => {
      const stats = await fsp.stat(file)
      if (!stats.isDirectory()) return [file]

      let children: string[]
      if (recursive) {
        children = (await rreaddirAsync(file)) as string[]
      } else {
        const list = await fsp.readdir(file)
        children = list.map((child) => path.join(file, child))
      }

      if (recursive) return children

      // Filter directories if not recursive
      const filtered = await Promise.all(
        children.map(async (child) => {
          const childStats = await fsp.stat(child)
          return childStats.isDirectory() ? null : child
        }),
      )
      return filtered.filter((f): f is string => f !== null)
    }),
  )
  const relevantFiles = relevantFilesNested.flat()

  // Promise [{ file: String, data: JSON }] -- all templates
  const maybeFiles = await Promise.all(relevantFiles.map(templateFileOrNull))
  const templates = maybeFiles.filter((maybeFile): maybeFile is TemplateFile => maybeFile !== null)

  async function templateFileOrNull(file: string): Promise<TemplateFile | null> {
    if (path.extname(file) !== '.json') return null

    try {
      const data = await fsp.readFile(file, 'utf8')
      const parsed: unknown = JSON.parse(data)
      const validated = TemplateFileDataSchema.safeParse(parsed)
      if (!validated.success) return null
      return 'transloadit_template_id' in validated.data ? { file, data: validated.data } : null
    } catch (e) {
      if (e instanceof SyntaxError) return null
      throw e
    }
  }

  const modified = new ModifiedLookup(client)

  const [err] = await tryCatch(
    Promise.all(
      templates.map(async (template) => {
        if (!('steps' in template.data)) {
          if (!template.data.transloadit_template_id) {
            throw new Error(`Template file has no id and no steps: ${template.file}`)
          }
          return download(template)
        }

        if (!template.data.transloadit_template_id) return upload(template)

        const stats = await fsp.stat(template.file)
        const fileModified = stats.mtime

        let templateModified: Date
        const templateId = template.data.transloadit_template_id
        try {
          await client.getTemplate(templateId)
          templateModified = await new Promise<Date>((resolve, reject) =>
            modified.byId(templateId, (err, res) => {
              if (err) {
                reject(err)
              } else if (res) {
                resolve(res)
              } else {
                reject(new Error('No date returned'))
              }
            }),
          )
        } catch (err) {
          if (isTransloaditAPIError(err)) {
            if (err.code === 'SERVER_404' || (err.response && err.response.statusCode === 404)) {
              throw new Error(`Template file references nonexistent template: ${template.file}`)
            }
          }
          throw err
        }

        if (fileModified > templateModified) return upload(template)
        return download(template)
      }),
    ),
  )
  if (err) {
    output.error(err)
    throw err
  }

  async function upload(template: TemplateFile): Promise<void> {
    const params = {
      name: path.basename(template.file, '.json'),
      template: { steps: template.data.steps } as TemplateContent,
    }

    if (!template.data.transloadit_template_id) {
      const result = await client.createTemplate(params)
      template.data.transloadit_template_id = result.id
      await fsp.writeFile(template.file, JSON.stringify(template.data))
      return
    }

    await client.editTemplate(template.data.transloadit_template_id, params)
  }

  async function download(template: TemplateFile): Promise<void> {
    const templateId = template.data.transloadit_template_id
    if (!templateId) {
      throw new Error('Cannot download template without id')
    }

    const result = await client.getTemplate(templateId)

    // Use empty object if template has no steps (undefined would be stripped by JSON.stringify)
    template.data.steps = result.content.steps ?? {}
    const file = path.join(path.dirname(template.file), `${result.name}.json`)

    await fsp.writeFile(template.file, JSON.stringify(template.data))

    if (file !== template.file) {
      await fsp.rename(template.file, file)
    }
  }
}
export class TemplatesCreateCommand extends AuthenticatedCommand {
  static override paths = [
    ['templates', 'create'],
    ['template', 'create'],
    ['t', 'create'],
    ['t', 'c'],
  ]

  static override usage = Command.Usage({
    category: 'Templates',
    description: 'Create a new template',
    details: `
      Create a new template with the given name.
      If FILE is not specified, reads from STDIN.
    `,
    examples: [
      ['Create template from file', 'transloadit templates create my-template steps.json'],
      ['Create template from stdin', 'cat steps.json | transloadit templates create my-template'],
    ],
  })

  name = Option.String({ required: true })
  file = Option.String({ required: false })

  protected async run(): Promise<number | undefined> {
    await create(this.output, this.client, {
      name: this.name,
      file: this.file ?? '-',
    })
    return undefined
  }
}

export class TemplatesGetCommand extends AuthenticatedCommand {
  static override paths = [
    ['templates', 'get'],
    ['template', 'get'],
    ['t', 'get'],
    ['t', 'g'],
  ]

  static override usage = Command.Usage({
    category: 'Templates',
    description: 'Retrieve the template content as JSON',
    examples: [['Get a template', 'transloadit templates get TEMPLATE_ID']],
  })

  templateIds = Option.Rest({ required: 1 })

  protected async run(): Promise<number | undefined> {
    await get(this.output, this.client, {
      templates: this.templateIds,
    })
    return undefined
  }
}

export class TemplatesModifyCommand extends AuthenticatedCommand {
  static override paths = [
    ['templates', 'modify'],
    ['template', 'modify'],
    ['t', 'modify'],
    ['t', 'm'],
    ['templates', 'edit'],
    ['template', 'edit'],
  ]

  static override usage = Command.Usage({
    category: 'Templates',
    description: 'Change the JSON content of a template',
    details: `
      Modify an existing template.
      If FILE is not specified, reads from STDIN.
    `,
    examples: [
      ['Modify template from file', 'transloadit templates modify TEMPLATE_ID steps.json'],
      ['Rename a template', 'transloadit templates modify --name new-name TEMPLATE_ID'],
    ],
  })

  newName = Option.String('--name,-n', {
    description: 'A new name for the template',
  })

  templateId = Option.String({ required: true })
  file = Option.String({ required: false })

  protected async run(): Promise<number | undefined> {
    await modify(this.output, this.client, {
      template: this.templateId,
      name: this.newName,
      file: this.file ?? '-',
    })
    return undefined
  }
}

export class TemplatesDeleteCommand extends AuthenticatedCommand {
  static override paths = [
    ['templates', 'delete'],
    ['template', 'delete'],
    ['t', 'delete'],
    ['t', 'd'],
  ]

  static override usage = Command.Usage({
    category: 'Templates',
    description: 'Delete templates',
    examples: [['Delete a template', 'transloadit templates delete TEMPLATE_ID']],
  })

  templateIds = Option.Rest({ required: 1 })

  protected async run(): Promise<number | undefined> {
    await deleteTemplates(this.output, this.client, {
      templates: this.templateIds,
    })
    return undefined
  }
}

export class TemplatesListCommand extends AuthenticatedCommand {
  static override paths = [
    ['templates', 'list'],
    ['template', 'list'],
    ['t', 'list'],
    ['t', 'l'],
  ]

  static override usage = Command.Usage({
    category: 'Templates',
    description: 'List templates matching given criteria',
    examples: [
      ['List all templates', 'transloadit templates list'],
      ['List templates sorted by name', 'transloadit templates list --sort name'],
    ],
  })

  after = Option.String('--after,-a', {
    description: 'Return only templates created after specified date',
  })

  before = Option.String('--before,-b', {
    description: 'Return only templates created before specified date',
  })

  sort = Option.String('--sort', {
    description: 'Field to sort by (id, name, created, or modified)',
  })

  order = Option.String('--order', {
    description: 'Sort ascending or descending (asc or desc)',
  })

  fields = Option.String('--fields', {
    description: 'Comma-separated list of fields to return for each template',
  })

  protected async run(): Promise<number | undefined> {
    if (this.sort && !['id', 'name', 'created', 'modified'].includes(this.sort)) {
      this.output.error('invalid argument for --sort')
      return 1
    }

    if (this.order && !['asc', 'desc'].includes(this.order)) {
      this.output.error('invalid argument for --order')
      return 1
    }

    const fieldList = this.fields ? this.fields.split(',') : undefined

    await list(this.output, this.client, {
      after: this.after,
      before: this.before,
      sort: this.sort,
      order: this.order as 'asc' | 'desc' | undefined,
      fields: fieldList,
    })
    return undefined
  }
}

export class TemplatesSyncCommand extends AuthenticatedCommand {
  static override paths = [
    ['templates', 'sync'],
    ['template', 'sync'],
    ['t', 'sync'],
    ['t', 's'],
  ]

  static override usage = Command.Usage({
    category: 'Templates',
    description: 'Synchronize local template files with the Transloadit API',
    details: `
      Template files must be named *.json and have the key "transloadit_template_id"
      and optionally "steps". If "transloadit_template_id" is an empty string, then
      a new template will be created using the instructions in "steps". If "steps" is
      missing then it will be filled in by the instructions of the template specified
      by "transloadit_template_id". If both keys are present then the local template
      file and the remote template will be synchronized to whichever was more recently
      modified.
    `,
    examples: [
      ['Sync templates in a directory', 'transloadit templates sync templates/'],
      ['Sync recursively', 'transloadit templates sync --recursive templates/'],
    ],
  })

  recursive = Option.Boolean('--recursive,-r', false, {
    description: 'Look for template files in directories recursively',
  })

  files = Option.Rest()

  protected async run(): Promise<number | undefined> {
    await sync(this.output, this.client, {
      recursive: this.recursive,
      files: this.files,
    })
    return undefined
  }
}

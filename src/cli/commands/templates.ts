import { Command, Option } from 'clipanion'
import * as templates from '../templates.ts'
import { AuthenticatedCommand } from './BaseCommand.ts'

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
    await templates.create(this.output, this.client, {
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
    await templates.get(this.output, this.client, {
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
    await templates.modify(this.output, this.client, {
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
    await templates.delete(this.output, this.client, {
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

    await templates.list(this.output, this.client, {
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
    await templates.sync(this.output, this.client, {
      recursive: this.recursive,
      files: this.files,
    })
    return undefined
  }
}

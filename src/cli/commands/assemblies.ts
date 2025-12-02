import process from 'node:process'
import { Command, Option } from 'clipanion'
import * as assemblies from '../assemblies.ts'
import assembliesCreate from '../assemblies-create.ts'
import { AuthenticatedCommand } from './BaseCommand.ts'

export class AssembliesCreateCommand extends AuthenticatedCommand {
  static override paths = [
    ['assemblies', 'create'],
    ['assembly', 'create'],
    ['a', 'create'],
    ['a', 'c'],
  ]

  static override usage = Command.Usage({
    category: 'Assemblies',
    description: 'Create assemblies to process media',
    details: `
      Create assemblies to process media files using Transloadit.
      You must specify either --steps or --template.
    `,
    examples: [
      [
        'Process a file with steps',
        'transloadit assemblies create --steps steps.json -i input.jpg -o output.jpg',
      ],
      [
        'Process with a template',
        'transloadit assemblies create --template TEMPLATE_ID -i input.jpg -o output/',
      ],
      [
        'Watch for changes',
        'transloadit assemblies create --steps steps.json -i input/ -o output/ --watch',
      ],
    ],
  })

  steps = Option.String('--steps,-s', {
    description: 'Specify assembly instructions with a JSON file',
  })

  template = Option.String('--template,-t', {
    description: 'Specify a template to use for these assemblies',
  })

  inputs = Option.Array('--input,-i', {
    description: 'Provide an input file or a directory',
  })

  outputPath = Option.String('--output,-o', {
    description: 'Specify an output file or directory',
  })

  fields = Option.Array('--field,-f', {
    description: 'Set a template field (KEY=VAL)',
  })

  watch = Option.Boolean('--watch,-w', false, {
    description: 'Watch inputs for changes',
  })

  recursive = Option.Boolean('--recursive,-r', false, {
    description: 'Enumerate input directories recursively',
  })

  deleteAfterProcessing = Option.Boolean('--delete-after-processing,-d', false, {
    description: 'Delete input files after they are processed',
  })

  reprocessStale = Option.Boolean('--reprocess-stale', false, {
    description: 'Process inputs even if output is newer',
  })

  protected async run(): Promise<number | undefined> {
    if (!this.steps && !this.template) {
      this.output.error('assemblies create requires exactly one of either --steps or --template')
      return 1
    }
    if (this.steps && this.template) {
      this.output.error('assemblies create requires exactly one of either --steps or --template')
      return 1
    }

    const inputList = this.inputs ?? []
    if (inputList.length === 0 && this.watch) {
      this.output.error('assemblies create --watch requires at least one input')
      return 1
    }

    // Default to stdin if no inputs and not a TTY
    if (inputList.length === 0 && !process.stdin.isTTY) {
      inputList.push('-')
    }

    const fieldsMap: Record<string, string> = {}
    for (const field of this.fields ?? []) {
      const eqIndex = field.indexOf('=')
      if (eqIndex === -1) {
        this.output.error(`invalid argument for --field: '${field}'`)
        return 1
      }
      const key = field.slice(0, eqIndex)
      const value = field.slice(eqIndex + 1)
      fieldsMap[key] = value
    }

    await assembliesCreate(this.output, this.client, {
      steps: this.steps,
      template: this.template,
      fields: fieldsMap,
      watch: this.watch,
      recursive: this.recursive,
      inputs: inputList,
      output: this.outputPath ?? null,
      del: this.deleteAfterProcessing,
      reprocessStale: this.reprocessStale,
    })
    return undefined
  }
}

export class AssembliesListCommand extends AuthenticatedCommand {
  static override paths = [
    ['assemblies', 'list'],
    ['assembly', 'list'],
    ['a', 'list'],
    ['a', 'l'],
  ]

  static override usage = Command.Usage({
    category: 'Assemblies',
    description: 'List assemblies matching given criteria',
    examples: [
      ['List recent assemblies', 'transloadit assemblies list'],
      ['List assemblies after a date', 'transloadit assemblies list --after 2024-01-01'],
    ],
  })

  before = Option.String('--before,-b', {
    description: 'Return only assemblies created before specified date',
  })

  after = Option.String('--after,-a', {
    description: 'Return only assemblies created after specified date',
  })

  keywords = Option.String('--keywords', {
    description: 'Comma-separated list of keywords to match assemblies',
  })

  fields = Option.String('--fields', {
    description: 'Comma-separated list of fields to return for each assembly',
  })

  protected async run(): Promise<number | undefined> {
    const keywordList = this.keywords ? this.keywords.split(',') : undefined
    const fieldList = this.fields ? this.fields.split(',') : undefined

    await assemblies.list(this.output, this.client, {
      before: this.before,
      after: this.after,
      keywords: keywordList,
      fields: fieldList,
    })
    return undefined
  }
}

export class AssembliesGetCommand extends AuthenticatedCommand {
  static override paths = [
    ['assemblies', 'get'],
    ['assembly', 'get'],
    ['a', 'get'],
    ['a', 'g'],
  ]

  static override usage = Command.Usage({
    category: 'Assemblies',
    description: 'Fetch assembly statuses',
    examples: [['Get assembly status', 'transloadit assemblies get ASSEMBLY_ID']],
  })

  assemblyIds = Option.Rest({ required: 1 })

  protected async run(): Promise<number | undefined> {
    await assemblies.get(this.output, this.client, {
      assemblies: this.assemblyIds,
    })
    return undefined
  }
}

export class AssembliesDeleteCommand extends AuthenticatedCommand {
  static override paths = [
    ['assemblies', 'delete'],
    ['assembly', 'delete'],
    ['a', 'delete'],
    ['a', 'd'],
    ['assemblies', 'cancel'],
    ['assembly', 'cancel'],
  ]

  static override usage = Command.Usage({
    category: 'Assemblies',
    description: 'Cancel assemblies',
    examples: [['Cancel an assembly', 'transloadit assemblies delete ASSEMBLY_ID']],
  })

  assemblyIds = Option.Rest({ required: 1 })

  protected async run(): Promise<number | undefined> {
    await assemblies.delete(this.output, this.client, {
      assemblies: this.assemblyIds,
    })
    return undefined
  }
}

export class AssembliesReplayCommand extends AuthenticatedCommand {
  static override paths = [
    ['assemblies', 'replay'],
    ['assembly', 'replay'],
    ['a', 'replay'],
    ['a', 'r'],
  ]

  static override usage = Command.Usage({
    category: 'Assemblies',
    description: 'Replay assemblies',
    examples: [
      ['Replay an assembly', 'transloadit assemblies replay ASSEMBLY_ID'],
      [
        'Replay with new notify URL',
        'transloadit assemblies replay --notify-url https://example.com/notify ASSEMBLY_ID',
      ],
    ],
  })

  fields = Option.Array('--field,-f', {
    description: 'Set a template field (KEY=VAL)',
  })

  steps = Option.String('--steps,-s', {
    description: 'Override assembly instructions',
  })

  notifyUrl = Option.String('--notify-url', {
    description: 'Specify a new URL for assembly notifications',
  })

  reparseTemplate = Option.Boolean('--reparse-template', false, {
    description: 'Use the most up-to-date version of the template',
  })

  assemblyIds = Option.Rest({ required: 1 })

  protected async run(): Promise<number | undefined> {
    const fieldsMap: Record<string, string> = {}
    for (const field of this.fields ?? []) {
      const eqIndex = field.indexOf('=')
      if (eqIndex === -1) {
        this.output.error(`invalid argument for --field: '${field}'`)
        return 1
      }
      const key = field.slice(0, eqIndex)
      const value = field.slice(eqIndex + 1)
      fieldsMap[key] = value
    }

    await assemblies.replay(this.output, this.client, {
      fields: fieldsMap,
      reparse: this.reparseTemplate,
      steps: this.steps,
      notify_url: this.notifyUrl,
      assemblies: this.assemblyIds,
    })
    return undefined
  }
}

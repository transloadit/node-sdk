import EventEmitter from 'node:events'
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import type { Readable, Writable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { setTimeout as delay } from 'node:timers/promises'
import tty from 'node:tty'
import { promisify } from 'node:util'
import { Command, Option } from 'clipanion'
import got from 'got'
import PQueue from 'p-queue'
import * as t from 'typanion'
import { z } from 'zod'
import { formatLintIssue } from '../../alphalib/assembly-linter.lang.en.ts'
import { tryCatch } from '../../alphalib/tryCatch.ts'
import type { Steps, StepsInput } from '../../alphalib/types/template.ts'
import { stepsSchema } from '../../alphalib/types/template.ts'
import type { CreateAssemblyParams, ReplayAssemblyParams } from '../../apiTypes.ts'
import type { LintFatalLevel } from '../../lintAssemblyInstructions.ts'
import { lintAssemblyInstructions } from '../../lintAssemblyInstructions.ts'
import type { CreateAssemblyOptions, Transloadit } from '../../Transloadit.ts'
import { lintingExamples } from '../docs/assemblyLintingExamples.ts'
import { createReadStream, formatAPIError, readCliInput, streamToBuffer } from '../helpers.ts'
import type { IOutputCtl } from '../OutputCtl.ts'
import { ensureError, isErrnoException } from '../types.ts'
import { AuthenticatedCommand, UnauthenticatedCommand } from './BaseCommand.ts'

// --- From assemblies.ts: Schemas and interfaces ---
export interface AssemblyListOptions {
  before?: string
  after?: string
  fields?: string[]
  keywords?: string[]
  pagesize?: number
}

export interface AssemblyGetOptions {
  assemblies: string[]
}

interface AssemblyDeleteOptions {
  assemblies: string[]
}

export interface AssemblyReplayOptions {
  fields?: Record<string, string>
  reparse?: boolean
  steps?: string
  notify_url?: string
  assemblies: string[]
}

export interface AssemblyLintOptions {
  steps?: string
  template?: string
  fatal?: LintFatalLevel
  fix?: boolean
  providedInput?: string
  json?: boolean
}

const AssemblySchema = z.object({
  id: z.string(),
})

// --- Business logic functions (from assemblies.ts) ---

export function list(
  output: IOutputCtl,
  client: Transloadit,
  { before, after, fields, keywords }: AssemblyListOptions,
): Promise<void> {
  const assemblies = client.streamAssemblies({
    fromdate: after,
    todate: before,
    keywords,
  })

  assemblies.on('readable', () => {
    const assembly: unknown = assemblies.read()
    if (assembly == null) return

    const parsed = AssemblySchema.safeParse(assembly)
    if (!parsed.success) return

    if (fields == null) {
      output.print(parsed.data.id, assembly)
    } else {
      const assemblyRecord = assembly as Record<string, unknown>
      output.print(fields.map((field) => assemblyRecord[field]).join(' '), assembly)
    }
  })

  return new Promise<void>((resolve) => {
    assemblies.on('end', resolve)
    assemblies.on('error', (err: unknown) => {
      output.error(formatAPIError(err))
      resolve()
    })
  })
}

export async function get(
  output: IOutputCtl,
  client: Transloadit,
  { assemblies }: AssemblyGetOptions,
): Promise<void> {
  for (const assembly of assemblies) {
    await delay(1000)
    const [err, result] = await tryCatch(client.getAssembly(assembly))
    if (err) {
      output.error(formatAPIError(err))
      throw ensureError(err)
    }
    output.print(result, result)
  }
}

async function deleteAssemblies(
  output: IOutputCtl,
  client: Transloadit,
  { assemblies }: AssemblyDeleteOptions,
): Promise<void> {
  const promises = assemblies.map(async (assembly) => {
    const [err] = await tryCatch(client.cancelAssembly(assembly))
    if (err) {
      output.error(formatAPIError(err))
    }
  })
  await Promise.all(promises)
}

// Export with `delete` alias for tests (can't use `delete` as function name)
export { deleteAssemblies as delete }

export async function replay(
  output: IOutputCtl,
  client: Transloadit,
  { fields, reparse, steps, notify_url, assemblies }: AssemblyReplayOptions,
): Promise<void> {
  if (steps) {
    try {
      const buf = await streamToBuffer(createReadStream(steps))
      const parsed: unknown = JSON.parse(buf.toString())
      const validated = stepsSchema.safeParse(parsed)
      if (!validated.success) {
        throw new Error(`Invalid steps format: ${validated.error.message}`)
      }
      await apiCall(validated.data)
    } catch (err) {
      const error = ensureError(err)
      output.error(error.message)
    }
  } else {
    await apiCall()
  }

  async function apiCall(stepsOverride?: Steps): Promise<void> {
    const promises = assemblies.map(async (assembly) => {
      const [err] = await tryCatch(
        client.replayAssembly(assembly, {
          reparse_template: reparse ? 1 : 0,
          fields,
          notify_url,
          // Steps (validated) is assignable to StepsInput at runtime; cast for TS
          steps: stepsOverride as ReplayAssemblyParams['steps'],
        }),
      )
      if (err) {
        output.error(formatAPIError(err))
      }
    })
    await Promise.all(promises)
  }
}

export async function lint(
  output: IOutputCtl,
  client: Transloadit | null,
  { steps, template, fatal, fix, providedInput, json }: AssemblyLintOptions,
): Promise<number> {
  let content: string | null
  let isStdin: boolean
  let inputPath: string | undefined
  try {
    ;({
      content,
      isStdin,
      path: inputPath,
    } = await readCliInput({
      inputPath: steps,
      providedInput,
      allowStdinWhenNoPath: true,
    }))
  } catch (error) {
    output.error(ensureError(error).message)
    return 1
  }

  if (content == null && template == null) {
    output.error('assemblies lint requires --steps or stdin input unless --template is provided')
    return 1
  }

  if (fix && content == null && template != null) {
    output.error('assemblies lint --fix requires local instructions (stdin or --steps)')
    return 1
  }

  let result: Awaited<ReturnType<typeof lintAssemblyInstructions>>
  try {
    if (template != null) {
      if (!client) {
        output.error('Missing client for template lookup')
        return 1
      }
      result = await client.lintAssemblyInstructions({
        assemblyInstructions: content ?? undefined,
        templateId: template,
        fatal,
        fix,
      })
    } else {
      result = await lintAssemblyInstructions({
        assemblyInstructions: content ?? undefined,
        fatal,
        fix,
      })
    }
  } catch (error) {
    output.error(ensureError(error).message)
    return 1
  }

  const issues = result.issues

  if (fix && isStdin) {
    if (result.fixedInstructions == null) {
      output.error('No fixed output available.')
      return 1
    }
    process.stdout.write(`${result.fixedInstructions}\n`)
    for (const issue of issues) {
      const line = formatLintIssue(issue)
      if (issue.type === 'warning') output.warn(line)
      else output.error(line)
    }
    return result.success ? 0 : 1
  }

  if (fix && inputPath && result.fixedInstructions != null) {
    await fsp.writeFile(inputPath, result.fixedInstructions)
  }

  if (json) {
    output.print({ ...result, issues }, result)
  } else if (issues.length === 0) {
    output.print('No issues found', result)
  } else {
    for (const issue of issues) {
      output.print(formatLintIssue(issue), issue)
    }
  }

  return result.success ? 0 : 1
}

// --- From assemblies-create.ts: Helper classes and functions ---
interface NodeWatcher {
  on(event: 'error', listener: (err: Error) => void): void
  on(event: 'close', listener: () => void): void
  on(event: 'change', listener: (evt: string, filename: string) => void): void
  on(event: string, listener: (...args: unknown[]) => void): void
  close(): void
}

type NodeWatchFn = (path: string, options?: { recursive?: boolean }) => NodeWatcher

let nodeWatch: NodeWatchFn | undefined

async function getNodeWatch(): Promise<NodeWatchFn> {
  if (!nodeWatch) {
    const mod = (await import('node-watch')) as unknown as { default: NodeWatchFn }
    nodeWatch = mod.default
  }
  return nodeWatch
}

// workaround for determining mime-type of stdin
const stdinWithPath = process.stdin as unknown as { path: string }
stdinWithPath.path = '/dev/stdin'

interface OutStream extends Writable {
  path?: string
  mtime?: Date
}

interface Job {
  in: Readable | null
  out: OutStream | null
}

type OutstreamProvider = (inpath: string | null, indir?: string) => Promise<OutStream | null>

interface StreamRegistry {
  [key: string]: OutStream | undefined
}

interface JobEmitterOptions {
  recursive?: boolean
  outstreamProvider: OutstreamProvider
  streamRegistry: StreamRegistry
  watch?: boolean
  reprocessStale?: boolean
}

interface ReaddirJobEmitterOptions {
  dir: string
  streamRegistry: StreamRegistry
  recursive?: boolean
  outstreamProvider: OutstreamProvider
  topdir?: string
}

interface SingleJobEmitterOptions {
  file: string
  streamRegistry: StreamRegistry
  outstreamProvider: OutstreamProvider
}

interface WatchJobEmitterOptions {
  file: string
  streamRegistry: StreamRegistry
  recursive?: boolean
  outstreamProvider: OutstreamProvider
}

interface StatLike {
  isDirectory(): boolean
}

const fstatAsync = promisify(fs.fstat)

async function myStat(
  stdioStream: NodeJS.ReadStream | NodeJS.WriteStream,
  filepath: string,
): Promise<fs.Stats> {
  if (filepath === '-') {
    const stream = stdioStream as NodeJS.ReadStream & { fd: number }
    return await fstatAsync(stream.fd)
  }
  return await fsp.stat(filepath)
}

function dirProvider(output: string): OutstreamProvider {
  return async (inpath, indir = process.cwd()) => {
    // Inputless assemblies can still write into a directory, but output paths are derived from
    // assembly results rather than an input file path (handled later).
    if (inpath == null) {
      return null
    }
    if (inpath === '-') {
      throw new Error('You must provide an input to output to a directory')
    }

    let relpath = path.relative(indir, inpath)
    relpath = relpath.replace(/^(\.\.\/)+/, '')
    const outpath = path.join(output, relpath)
    const outdir = path.dirname(outpath)

    await fsp.mkdir(outdir, { recursive: true })
    const [, stats] = await tryCatch(fsp.stat(outpath))
    const mtime = stats?.mtime ?? new Date(0)
    const outstream = fs.createWriteStream(outpath) as OutStream
    // Attach a no-op error handler to prevent unhandled errors if stream is destroyed
    // before being consumed (e.g., due to output collision detection)
    outstream.on('error', () => {})
    outstream.mtime = mtime
    return outstream
  }
}

function fileProvider(output: string): OutstreamProvider {
  const dirExistsP = fsp.mkdir(path.dirname(output), { recursive: true })
  return async (_inpath) => {
    await dirExistsP
    if (output === '-') return process.stdout as OutStream

    const [, stats] = await tryCatch(fsp.stat(output))
    const mtime = stats?.mtime ?? new Date(0)
    const outstream = fs.createWriteStream(output) as OutStream
    // Attach a no-op error handler to prevent unhandled errors if stream is destroyed
    // before being consumed (e.g., due to output collision detection)
    outstream.on('error', () => {})
    outstream.mtime = mtime
    return outstream
  }
}

function nullProvider(): OutstreamProvider {
  return async (_inpath) => null
}

class MyEventEmitter extends EventEmitter {
  protected hasEnded: boolean

  constructor() {
    super()
    this.hasEnded = false
  }

  override emit(event: string | symbol, ...args: unknown[]): boolean {
    if (this.hasEnded) return false
    if (event === 'end' || event === 'error') {
      this.hasEnded = true
      return super.emit(event, ...args)
    }
    return super.emit(event, ...args)
  }
}

class ReaddirJobEmitter extends MyEventEmitter {
  constructor({
    dir,
    streamRegistry,
    recursive,
    outstreamProvider,
    topdir = dir,
  }: ReaddirJobEmitterOptions) {
    super()

    process.nextTick(() => {
      this.processDirectory({ dir, streamRegistry, recursive, outstreamProvider, topdir }).catch(
        (err) => {
          this.emit('error', err)
        },
      )
    })
  }

  private async processDirectory({
    dir,
    streamRegistry,
    recursive,
    outstreamProvider,
    topdir,
  }: ReaddirJobEmitterOptions & { topdir: string }): Promise<void> {
    const files = await fsp.readdir(dir)

    const pendingOperations: Promise<void>[] = []

    for (const filename of files) {
      const file = path.normalize(path.join(dir, filename))
      pendingOperations.push(
        this.processFile({ file, streamRegistry, recursive, outstreamProvider, topdir }),
      )
    }

    await Promise.all(pendingOperations)
    this.emit('end')
  }

  private async processFile({
    file,
    streamRegistry,
    recursive = false,
    outstreamProvider,
    topdir,
  }: {
    file: string
    streamRegistry: StreamRegistry
    recursive?: boolean
    outstreamProvider: OutstreamProvider
    topdir: string
  }): Promise<void> {
    const stats = await fsp.stat(file)

    if (stats.isDirectory()) {
      if (recursive) {
        await new Promise<void>((resolve, reject) => {
          const subdirEmitter = new ReaddirJobEmitter({
            dir: file,
            streamRegistry,
            recursive,
            outstreamProvider,
            topdir,
          })
          subdirEmitter.on('job', (job: Job) => this.emit('job', job))
          subdirEmitter.on('error', (error: Error) => reject(error))
          subdirEmitter.on('end', () => resolve())
        })
      }
    } else {
      const existing = streamRegistry[file]
      if (existing) existing.end()
      const outstream = await outstreamProvider(file, topdir)
      streamRegistry[file] = outstream ?? undefined
      const instream = fs.createReadStream(file)
      // Attach a no-op error handler to prevent unhandled errors if stream is destroyed
      // before being consumed (e.g., due to output collision detection)
      instream.on('error', () => {})
      this.emit('job', { in: instream, out: outstream })
    }
  }
}

class SingleJobEmitter extends MyEventEmitter {
  constructor({ file, streamRegistry, outstreamProvider }: SingleJobEmitterOptions) {
    super()

    const normalizedFile = path.normalize(file)
    const existing = streamRegistry[normalizedFile]
    if (existing) existing.end()
    outstreamProvider(normalizedFile).then((outstream) => {
      streamRegistry[normalizedFile] = outstream ?? undefined

      let instream: Readable | null
      if (normalizedFile === '-') {
        if (tty.isatty(process.stdin.fd)) {
          instream = null
        } else {
          instream = process.stdin
        }
      } else {
        instream = fs.createReadStream(normalizedFile)
        // Attach a no-op error handler to prevent unhandled errors if stream is destroyed
        // before being consumed (e.g., due to output collision detection)
        instream.on('error', () => {})
      }

      process.nextTick(() => {
        this.emit('job', { in: instream, out: outstream })
        this.emit('end')
      })
    })
  }
}

class InputlessJobEmitter extends MyEventEmitter {
  constructor({
    outstreamProvider,
  }: { streamRegistry: StreamRegistry; outstreamProvider: OutstreamProvider }) {
    super()

    process.nextTick(() => {
      outstreamProvider(null).then((outstream) => {
        try {
          this.emit('job', { in: null, out: outstream })
        } catch (err) {
          this.emit('error', err)
        }

        this.emit('end')
      })
    })
  }
}

class NullJobEmitter extends MyEventEmitter {
  constructor() {
    super()
    process.nextTick(() => this.emit('end'))
  }
}

class WatchJobEmitter extends MyEventEmitter {
  private watcher: NodeWatcher | null = null

  constructor({ file, streamRegistry, recursive, outstreamProvider }: WatchJobEmitterOptions) {
    super()

    this.init({ file, streamRegistry, recursive, outstreamProvider }).catch((err) => {
      this.emit('error', err)
    })

    // Clean up watcher on process exit signals
    const cleanup = () => this.close()
    process.once('SIGINT', cleanup)
    process.once('SIGTERM', cleanup)
  }

  /** Close the file watcher and release resources */
  close(): void {
    if (this.watcher) {
      this.watcher.close()
      this.watcher = null
    }
  }

  private async init({
    file,
    streamRegistry,
    recursive,
    outstreamProvider,
  }: WatchJobEmitterOptions): Promise<void> {
    const stats = await fsp.stat(file)
    const topdir = stats.isDirectory() ? file : undefined

    const watchFn = await getNodeWatch()
    this.watcher = watchFn(file, { recursive })

    this.watcher.on('error', (err: Error) => {
      this.close()
      this.emit('error', err)
    })
    this.watcher.on('close', () => this.emit('end'))
    this.watcher.on('change', (_evt: string, filename: string) => {
      const normalizedFile = path.normalize(filename)
      this.handleChange(normalizedFile, topdir, streamRegistry, outstreamProvider).catch((err) => {
        this.emit('error', err)
      })
    })
  }

  private async handleChange(
    normalizedFile: string,
    topdir: string | undefined,
    streamRegistry: StreamRegistry,
    outstreamProvider: OutstreamProvider,
  ): Promise<void> {
    const stats = await fsp.stat(normalizedFile)
    if (stats.isDirectory()) return

    const existing = streamRegistry[normalizedFile]
    if (existing) existing.end()

    const outstream = await outstreamProvider(normalizedFile, topdir)
    streamRegistry[normalizedFile] = outstream ?? undefined

    const instream = fs.createReadStream(normalizedFile)
    // Attach a no-op error handler to prevent unhandled errors if stream is destroyed
    // before being consumed (e.g., due to output collision detection)
    instream.on('error', () => {})
    this.emit('job', { in: instream, out: outstream })
  }
}

class MergedJobEmitter extends MyEventEmitter {
  constructor(...jobEmitters: MyEventEmitter[]) {
    super()

    let ncomplete = 0

    for (const jobEmitter of jobEmitters) {
      jobEmitter.on('error', (err: Error) => this.emit('error', err))
      jobEmitter.on('job', (job: Job) => this.emit('job', job))
      jobEmitter.on('end', () => {
        if (++ncomplete === jobEmitters.length) this.emit('end')
      })
    }

    if (jobEmitters.length === 0) {
      this.emit('end')
    }
  }
}

class ConcattedJobEmitter extends MyEventEmitter {
  constructor(emitterFn: () => MyEventEmitter, ...emitterFns: (() => MyEventEmitter)[]) {
    super()

    const emitter = emitterFn()

    emitter.on('error', (err: Error) => this.emit('error', err))
    emitter.on('job', (job: Job) => this.emit('job', job))

    if (emitterFns.length === 0) {
      emitter.on('end', () => this.emit('end'))
    } else {
      emitter.on('end', () => {
        const firstFn = emitterFns[0]
        if (!firstFn) {
          this.emit('end')
          return
        }
        const restEmitter = new ConcattedJobEmitter(firstFn, ...emitterFns.slice(1))
        restEmitter.on('error', (err: Error) => this.emit('error', err))
        restEmitter.on('job', (job: Job) => this.emit('job', job))
        restEmitter.on('end', () => this.emit('end'))
      })
    }
  }
}

function detectConflicts(jobEmitter: EventEmitter): MyEventEmitter {
  const emitter = new MyEventEmitter()
  const outfileAssociations: Record<string, string> = {}

  jobEmitter.on('end', () => emitter.emit('end'))
  jobEmitter.on('error', (err: Error) => emitter.emit('error', err))
  jobEmitter.on('job', (job: Job) => {
    if (job.in == null || job.out == null) {
      emitter.emit('job', job)
      return
    }
    const inPath = (job.in as fs.ReadStream).path as string
    const outPath = job.out.path as string
    if (Object.hasOwn(outfileAssociations, outPath) && outfileAssociations[outPath] !== inPath) {
      emitter.emit(
        'error',
        new Error(`Output collision between '${inPath}' and '${outfileAssociations[outPath]}'`),
      )
    } else {
      outfileAssociations[outPath] = inPath
      emitter.emit('job', job)
    }
  })

  return emitter
}

function dismissStaleJobs(jobEmitter: EventEmitter): MyEventEmitter {
  const emitter = new MyEventEmitter()
  const pendingChecks: Promise<void>[] = []

  jobEmitter.on('end', () => Promise.all(pendingChecks).then(() => emitter.emit('end')))
  jobEmitter.on('error', (err: Error) => emitter.emit('error', err))
  jobEmitter.on('job', (job: Job) => {
    if (job.in == null || job.out == null) {
      emitter.emit('job', job)
      return
    }

    const inPath = (job.in as fs.ReadStream).path as string
    const checkPromise = fsp
      .stat(inPath)
      .then((stats) => {
        const inM = stats.mtime
        const outM = job.out?.mtime ?? new Date(0)

        if (outM <= inM) emitter.emit('job', job)
      })
      .catch(() => {
        emitter.emit('job', job)
      })
    pendingChecks.push(checkPromise)
  })

  return emitter
}

function makeJobEmitter(
  inputs: string[],
  {
    recursive,
    outstreamProvider,
    streamRegistry,
    watch: watchOption,
    reprocessStale,
  }: JobEmitterOptions,
): MyEventEmitter {
  const emitter = new EventEmitter()

  const emitterFns: (() => MyEventEmitter)[] = []
  const watcherFns: (() => MyEventEmitter)[] = []

  async function processInputs(): Promise<void> {
    for (const input of inputs) {
      if (input === '-') {
        emitterFns.push(
          () => new SingleJobEmitter({ file: input, outstreamProvider, streamRegistry }),
        )
        watcherFns.push(() => new NullJobEmitter())
      } else {
        const stats = await fsp.stat(input)
        if (stats.isDirectory()) {
          emitterFns.push(
            () =>
              new ReaddirJobEmitter({ dir: input, recursive, outstreamProvider, streamRegistry }),
          )
          watcherFns.push(
            () =>
              new WatchJobEmitter({ file: input, recursive, outstreamProvider, streamRegistry }),
          )
        } else {
          emitterFns.push(
            () => new SingleJobEmitter({ file: input, outstreamProvider, streamRegistry }),
          )
          watcherFns.push(
            () =>
              new WatchJobEmitter({ file: input, recursive, outstreamProvider, streamRegistry }),
          )
        }
      }
    }

    if (inputs.length === 0) {
      emitterFns.push(() => new InputlessJobEmitter({ outstreamProvider, streamRegistry }))
    }

    startEmitting()
  }

  function startEmitting(): void {
    let source: MyEventEmitter = new MergedJobEmitter(...emitterFns.map((f) => f()))

    if (watchOption) {
      source = new ConcattedJobEmitter(
        () => source,
        () => new MergedJobEmitter(...watcherFns.map((f) => f())),
      )
    }

    source.on('job', (job: Job) => emitter.emit('job', job))
    source.on('error', (err: Error) => emitter.emit('error', err))
    source.on('end', () => emitter.emit('end'))
  }

  processInputs().catch((err) => {
    emitter.emit('error', err)
  })

  const stalefilter = reprocessStale ? (x: EventEmitter) => x as MyEventEmitter : dismissStaleJobs
  return stalefilter(detectConflicts(emitter))
}

export interface AssembliesCreateOptions {
  steps?: string
  template?: string
  fields?: Record<string, string>
  watch?: boolean
  recursive?: boolean
  inputs: string[]
  output?: string | null
  del?: boolean
  reprocessStale?: boolean
  singleAssembly?: boolean
  concurrency?: number
}

const DEFAULT_CONCURRENCY = 5

// --- Main assembly create function ---
export async function create(
  outputctl: IOutputCtl,
  client: Transloadit,
  {
    steps,
    template,
    fields,
    watch: watchOption,
    recursive,
    inputs,
    output,
    del,
    reprocessStale,
    singleAssembly,
    concurrency = DEFAULT_CONCURRENCY,
  }: AssembliesCreateOptions,
): Promise<{ results: unknown[]; hasFailures: boolean }> {
  // Quick fix for https://github.com/transloadit/transloadify/issues/13
  // Only default to stdout when output is undefined (not provided), not when explicitly null
  let resolvedOutput = output
  if (resolvedOutput === undefined && !process.stdout.isTTY) resolvedOutput = '-'

  // Read steps file async before entering the Promise constructor
  // We use StepsInput (the input type) rather than Steps (the transformed output type)
  // to avoid zod adding default values that the API may reject
  let stepsData: StepsInput | undefined
  if (steps) {
    const stepsContent = await fsp.readFile(steps, 'utf8')
    const parsed: unknown = JSON.parse(stepsContent)
    // Basic structural validation: must be an object with step names as keys
    if (parsed == null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('Invalid steps format: expected an object with step names as keys')
    }
    // Validate each step has a robot field
    for (const [stepName, step] of Object.entries(parsed)) {
      if (step == null || typeof step !== 'object' || Array.isArray(step)) {
        throw new Error(`Invalid steps format: step '${stepName}' must be an object`)
      }
      if (!('robot' in step) || typeof (step as Record<string, unknown>).robot !== 'string') {
        throw new Error(
          `Invalid steps format: step '${stepName}' must have a 'robot' string property`,
        )
      }
    }
    stepsData = parsed as StepsInput
  }

  // Determine output stat async before entering the Promise constructor
  let outstat: StatLike | undefined
  if (resolvedOutput != null) {
    const [err, stat] = await tryCatch(myStat(process.stdout, resolvedOutput))
    if (err && (!isErrnoException(err) || err.code !== 'ENOENT')) throw err
    outstat = stat ?? { isDirectory: () => false }

    if (!outstat.isDirectory() && inputs.length !== 0) {
      const firstInput = inputs[0]
      if (firstInput) {
        const firstInputStat = await myStat(process.stdin, firstInput)
        if (inputs.length > 1 || firstInputStat.isDirectory()) {
          const msg = 'Output must be a directory when specifying multiple inputs'
          outputctl.error(msg)
          throw new Error(msg)
        }
      }
    }
  }

  return new Promise((resolve, reject) => {
    const params: CreateAssemblyParams = (
      stepsData ? { steps: stepsData as CreateAssemblyParams['steps'] } : { template_id: template }
    ) as CreateAssemblyParams
    if (fields) {
      params.fields = fields
    }

    const outstreamProvider: OutstreamProvider =
      resolvedOutput == null
        ? nullProvider()
        : outstat?.isDirectory()
          ? dirProvider(resolvedOutput)
          : fileProvider(resolvedOutput)
    const streamRegistry: StreamRegistry = {}

    const emitter = makeJobEmitter(inputs, {
      recursive,
      watch: watchOption,
      outstreamProvider,
      streamRegistry,
      reprocessStale,
    })

    // Use p-queue for concurrency management
    const queue = new PQueue({ concurrency })
    const results: unknown[] = []
    let hasFailures = false
    // AbortController to cancel all in-flight createAssembly calls when an error occurs
    const abortController = new AbortController()

    // Helper to process a single assembly job
    async function processAssemblyJob(
      inPath: string | null,
      outPath: string | null,
      outMtime: Date | undefined,
    ): Promise<unknown> {
      outputctl.debug(`PROCESSING JOB ${inPath ?? 'null'} ${outPath ?? 'null'}`)

      // Create fresh streams for this job
      const inStream = inPath ? fs.createReadStream(inPath) : null
      inStream?.on('error', () => {})

      let superceded = false
      // When writing to a file path (non-directory output), we treat finish as a supersede signal.
      // Directory-output multi-download mode does not use a single shared outstream.
      const markSupersededOnFinish = (stream: OutStream) => {
        stream.on('finish', () => {
          superceded = true
        })
      }

      const createOptions: CreateAssemblyOptions = {
        params,
        signal: abortController.signal,
      }
      if (inStream != null) {
        createOptions.uploads = { in: inStream }
      }

      const result = await client.createAssembly(createOptions)
      if (superceded) return undefined

      const assemblyId = result.assembly_id
      if (!assemblyId) throw new Error('No assembly_id in result')

      const assembly = await client.awaitAssemblyCompletion(assemblyId, {
        signal: abortController.signal,
        onPoll: () => {
          if (superceded) return false
          return true
        },
        onAssemblyProgress: (status) => {
          outputctl.debug(`Assembly status: ${status.ok}`)
        },
      })

      if (superceded) return undefined

      if (assembly.error || (assembly.ok && assembly.ok !== 'ASSEMBLY_COMPLETED')) {
        const msg = `Assembly failed: ${assembly.error || assembly.message} (Status: ${assembly.ok})`
        outputctl.error(msg)
        throw new Error(msg)
      }

      if (!assembly.results) throw new Error('No results in assembly')

      const outIsDirectory = Boolean(resolvedOutput != null && outstat?.isDirectory())
      const entries = Object.entries(assembly.results)
      const allFiles: Array<{
        stepName: string
        file: { name?: string; basename?: string; ext?: string; ssl_url?: string; url?: string }
      }> = []
      for (const [stepName, stepResults] of entries) {
        for (const file of stepResults as Array<{
          name?: string
          basename?: string
          ext?: string
          ssl_url?: string
          url?: string
        }>) {
          allFiles.push({ stepName, file })
        }
      }

      const getFileUrl = (file: { ssl_url?: string; url?: string }): string | null =>
        file.ssl_url ?? file.url ?? null

      const sanitizeName = (value: string): string => {
        const base = path.basename(value)
        return base.replaceAll('\\', '_').replaceAll('/', '_').replaceAll('\u0000', '')
      }

      const ensureUniquePath = async (targetPath: string): Promise<string> => {
        const parsed = path.parse(targetPath)
        let candidate = targetPath
        let counter = 1
        while (true) {
          const [statErr] = await tryCatch(fsp.stat(candidate))
          if (statErr) return candidate
          candidate = path.join(parsed.dir, `${parsed.name}__${counter}${parsed.ext}`)
          counter += 1
        }
      }

      if (resolvedOutput != null && !superceded) {
        // Directory output:
        // - For single-result, input-backed jobs, preserve existing behavior (write to mapped file path).
        // - Otherwise (multi-result or inputless), download all results into a directory structure.
        if (outIsDirectory && (inPath == null || allFiles.length !== 1 || outPath == null)) {
          let baseDir = resolvedOutput
          if (inPath != null) {
            let relpath = path.relative(process.cwd(), inPath)
            relpath = relpath.replace(/^(\.\.\/)+/, '')
            baseDir = path.join(resolvedOutput, path.dirname(relpath), path.parse(relpath).name)
          }
          await fsp.mkdir(baseDir, { recursive: true })

          for (const { stepName, file } of allFiles) {
            const resultUrl = getFileUrl(file)
            if (!resultUrl) continue

            const stepDir = path.join(baseDir, stepName)
            await fsp.mkdir(stepDir, { recursive: true })

            const rawName =
              file.name ??
              (file.basename && file.ext ? `${file.basename}.${file.ext}` : undefined) ??
              `${stepName}_result`
            const safeName = sanitizeName(rawName)
            const targetPath = await ensureUniquePath(path.join(stepDir, safeName))

            outputctl.debug('DOWNLOADING')
            const outStream = fs.createWriteStream(targetPath) as OutStream
            outStream.on('error', () => {})
            const [dlErr] = await tryCatch(
              pipeline(got.stream(resultUrl, { signal: abortController.signal }), outStream),
            )
            if (dlErr) {
              if (dlErr.name === 'AbortError') continue
              outputctl.error(dlErr.message)
              throw dlErr
            }
          }
        } else if (!outIsDirectory && outPath != null) {
          const first = allFiles[0]
          const resultUrl = first ? getFileUrl(first.file) : null
          if (resultUrl) {
            outputctl.debug('DOWNLOADING')
            const outStream = fs.createWriteStream(outPath) as OutStream
            outStream.on('error', () => {})
            outStream.mtime = outMtime
            markSupersededOnFinish(outStream)

            const [dlErr] = await tryCatch(
              pipeline(got.stream(resultUrl, { signal: abortController.signal }), outStream),
            )
            if (dlErr) {
              if (dlErr.name !== 'AbortError') {
                outputctl.error(dlErr.message)
                throw dlErr
              }
            }
          }
        } else if (outIsDirectory && outPath != null) {
          // Single-result, input-backed job: preserve existing file mapping in outdir.
          const first = allFiles[0]
          const resultUrl = first ? getFileUrl(first.file) : null
          if (resultUrl) {
            outputctl.debug('DOWNLOADING')
            const outStream = fs.createWriteStream(outPath) as OutStream
            outStream.on('error', () => {})
            outStream.mtime = outMtime
            markSupersededOnFinish(outStream)

            const [dlErr] = await tryCatch(
              pipeline(got.stream(resultUrl, { signal: abortController.signal }), outStream),
            )
            if (dlErr) {
              if (dlErr.name !== 'AbortError') {
                outputctl.error(dlErr.message)
                throw dlErr
              }
            }
          }
        }
      }

      outputctl.debug(`COMPLETED ${inPath ?? 'null'} ${outPath ?? 'null'}`)

      if (del && inPath) {
        await fsp.unlink(inPath)
      }
      return assembly
    }

    if (singleAssembly) {
      // Single-assembly mode: collect file paths, then create one assembly with all inputs
      // We close streams immediately to avoid exhausting file descriptors with many files
      const collectedPaths: string[] = []

      emitter.on('job', (job: Job) => {
        if (job.in != null) {
          const inPath = (job.in as fs.ReadStream).path as string
          outputctl.debug(`COLLECTING JOB ${inPath}`)
          collectedPaths.push(inPath)
          // Close the stream immediately to avoid file descriptor exhaustion
          ;(job.in as fs.ReadStream).destroy()
          outputctl.debug(`STREAM CLOSED ${inPath}`)
        }
      })

      emitter.on('error', (err: Error) => {
        abortController.abort()
        queue.clear()
        outputctl.error(err)
        reject(err)
      })

      emitter.on('end', async () => {
        if (collectedPaths.length === 0) {
          resolve({ results: [], hasFailures: false })
          return
        }

        // Build uploads object, creating fresh streams for each file
        const uploads: Record<string, Readable> = {}
        const inputPaths: string[] = []
        for (const inPath of collectedPaths) {
          const basename = path.basename(inPath)
          let key = basename
          let counter = 1
          while (key in uploads) {
            key = `${path.parse(basename).name}_${counter}${path.parse(basename).ext}`
            counter++
          }
          uploads[key] = fs.createReadStream(inPath)
          inputPaths.push(inPath)
        }

        outputctl.debug(`Creating single assembly with ${Object.keys(uploads).length} files`)

        try {
          const assembly = await queue.add(async () => {
            const createOptions: CreateAssemblyOptions = {
              params,
              signal: abortController.signal,
            }
            if (Object.keys(uploads).length > 0) {
              createOptions.uploads = uploads
            }

            const result = await client.createAssembly(createOptions)
            const assemblyId = result.assembly_id
            if (!assemblyId) throw new Error('No assembly_id in result')

            const asm = await client.awaitAssemblyCompletion(assemblyId, {
              signal: abortController.signal,
              onAssemblyProgress: (status) => {
                outputctl.debug(`Assembly status: ${status.ok}`)
              },
            })

            if (asm.error || (asm.ok && asm.ok !== 'ASSEMBLY_COMPLETED')) {
              const msg = `Assembly failed: ${asm.error || asm.message} (Status: ${asm.ok})`
              outputctl.error(msg)
              throw new Error(msg)
            }

            // Download all results
            if (asm.results && resolvedOutput != null) {
              for (const [stepName, stepResults] of Object.entries(asm.results)) {
                for (const stepResult of stepResults) {
                  const resultUrl =
                    (stepResult as { ssl_url?: string; url?: string }).ssl_url ?? stepResult.url
                  if (!resultUrl) continue

                  let outPath: string
                  if (outstat?.isDirectory()) {
                    outPath = path.join(resolvedOutput, stepResult.name || `${stepName}_result`)
                  } else {
                    outPath = resolvedOutput
                  }

                  outputctl.debug(`DOWNLOADING ${stepResult.name} to ${outPath}`)
                  const [dlErr] = await tryCatch(
                    pipeline(
                      got.stream(resultUrl, { signal: abortController.signal }),
                      fs.createWriteStream(outPath),
                    ),
                  )
                  if (dlErr) {
                    if (dlErr.name === 'AbortError') continue
                    outputctl.error(dlErr.message)
                    throw dlErr
                  }
                }
              }
            }

            // Delete input files if requested
            if (del) {
              for (const inPath of inputPaths) {
                await fsp.unlink(inPath)
              }
            }
            return asm
          })
          results.push(assembly)
        } catch (err) {
          hasFailures = true
          outputctl.error(err as Error)
        }

        resolve({ results, hasFailures })
      })
    } else {
      // Default mode: one assembly per file with p-queue concurrency limiting
      emitter.on('job', (job: Job) => {
        const inPath = job.in
          ? (((job.in as fs.ReadStream).path as string | undefined) ?? null)
          : null
        const outPath = job.out?.path ?? null
        const outMtime = job.out?.mtime
        outputctl.debug(`GOT JOB ${inPath ?? 'null'} ${outPath ?? 'null'}`)

        // Close the original streams immediately - we'll create fresh ones when processing
        if (job.in != null) {
          ;(job.in as fs.ReadStream).destroy()
        }
        if (job.out != null) {
          job.out.destroy()
        }

        // Add job to queue - p-queue handles concurrency automatically
        queue
          .add(async () => {
            const result = await processAssemblyJob(inPath, outPath, outMtime)
            if (result !== undefined) {
              results.push(result)
            }
          })
          .catch((err: unknown) => {
            hasFailures = true
            outputctl.error(err as Error)
          })
      })

      emitter.on('error', (err: Error) => {
        abortController.abort()
        queue.clear()
        outputctl.error(err)
        reject(err)
      })

      emitter.on('end', async () => {
        // Wait for all queued jobs to complete
        await queue.onIdle()
        resolve({ results, hasFailures })
      })
    }
  })
}

// --- Command classes ---
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

  singleAssembly = Option.Boolean('--single-assembly', false, {
    description: 'Pass all input files to a single assembly instead of one assembly per file',
  })

  concurrency = Option.String('--concurrency,-c', {
    description: 'Maximum number of concurrent assemblies (default: 5)',
    validator: t.isNumber(),
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

    // Default to stdin only for `--steps` mode (common "pipe a file into a one-off assembly" use case).
    // For `--template` mode, templates may be inputless or use /http/import, so stdin should be explicit (`--input -`).
    if (this.steps && inputList.length === 0 && !process.stdin.isTTY) {
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

    if (this.singleAssembly && this.watch) {
      this.output.error('--single-assembly cannot be used with --watch')
      return 1
    }

    const { hasFailures } = await create(this.output, this.client, {
      steps: this.steps,
      template: this.template,
      fields: fieldsMap,
      watch: this.watch,
      recursive: this.recursive,
      inputs: inputList,
      output: this.outputPath ?? null,
      del: this.deleteAfterProcessing,
      reprocessStale: this.reprocessStale,
      singleAssembly: this.singleAssembly,
      concurrency: this.concurrency,
    })
    return hasFailures ? 1 : undefined
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

    await list(this.output, this.client, {
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
    await get(this.output, this.client, {
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
    await deleteAssemblies(this.output, this.client, {
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
    details: `
      Replay one or more assemblies. By default, replays use the original assembly instructions.
      Use --steps to override the instructions, or --reparse-template to use the latest template version.
    `,
    examples: [
      ['Replay an assembly with original steps', 'transloadit assemblies replay ASSEMBLY_ID'],
      [
        'Replay with different steps',
        'transloadit assemblies replay --steps new-steps.json ASSEMBLY_ID',
      ],
      [
        'Replay with updated template',
        'transloadit assemblies replay --reparse-template ASSEMBLY_ID',
      ],
    ],
  })

  fields = Option.Array('--field,-f', {
    description: 'Set a template field (KEY=VAL)',
  })

  steps = Option.String('--steps,-s', {
    description: 'Optional JSON file to override assembly instructions',
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

    await replay(this.output, this.client, {
      fields: fieldsMap,
      reparse: this.reparseTemplate,
      steps: this.steps,
      notify_url: this.notifyUrl,
      assemblies: this.assemblyIds,
    })
    return undefined
  }
}

export class AssembliesLintCommand extends UnauthenticatedCommand {
  static override paths = [
    ['assemblies', 'lint'],
    ['assembly', 'lint'],
    ['a', 'lint'],
  ]

  static override usage = Command.Usage({
    category: 'Assemblies',
    description: 'Lint Assembly Instructions',
    details: `
      Lint Assembly Instructions locally using Transloadit's linter.
      Provide instructions via --steps or stdin (steps-only JSON is accepted).
      Optionally pass --template to
      merge template content with steps before linting (same merge behavior as the API).
    `,
    examples: lintingExamples,
  })

  steps = Option.String('--steps,-s', {
    description: 'JSON file with Assembly Instructions (use "-" for stdin)',
  })

  template = Option.String('--template,-t', {
    description:
      'Template ID to merge before linting. If the template forbids step overrides, linting will fail when steps are provided.',
  })

  fatal = Option.String('--fatal', {
    description: 'Treat issues at this level as fatal (error or warning)',
    validator: t.isEnum(['error', 'warning']),
  })

  fix = Option.Boolean('--fix', false, {
    description:
      'Apply auto-fixes. For files, overwrites in place. For stdin, writes fixed JSON to stdout.',
  })

  protected async run(): Promise<number | undefined> {
    let client: Transloadit | null = null
    if (this.template) {
      if (!this.setupClient()) return 1
      client = this.client
    }

    return await lint(this.output, client, {
      steps: this.steps,
      template: this.template,
      fatal: this.fatal as LintFatalLevel | undefined,
      fix: this.fix,
      json: this.json,
    })
  }
}

import { randomUUID } from 'node:crypto'
import EventEmitter from 'node:events'
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import type { Readable } from 'node:stream'
import { Writable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { setTimeout as delay } from 'node:timers/promises'
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
import {
  concurrencyOption,
  deleteAfterProcessingOption,
  inputPathsOption,
  recursiveOption,
  reprocessStaleOption,
  singleAssemblyOption,
  validateSharedFileProcessingOptions,
  watchOption,
} from '../fileProcessingOptions.ts'
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
  { before, after, fields, keywords, pagesize }: AssemblyListOptions,
): Promise<void> {
  const assemblies = client.streamAssemblies({
    fromdate: after,
    todate: before,
    keywords,
    pagesize,
  })

  assemblies.on('readable', () => {
    // Drain the stream, otherwise `end` may never fire.
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const assembly: unknown = assemblies.read()
      if (assembly == null) return

      const parsed = AssemblySchema.safeParse(assembly)
      if (!parsed.success) continue

      if (fields == null) {
        output.print(parsed.data.id, assembly)
      } else {
        const assemblyRecord = assembly as Record<string, unknown>
        output.print(fields.map((field) => assemblyRecord[field]).join(' '), assembly)
      }
    }
  })

  return new Promise<void>((resolve) => {
    assemblies.on('end', resolve)
    assemblies.on('close', resolve)
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

interface OutputPlan {
  mtime: Date
  path?: string
}

interface Job {
  inputPath: string | null
  out: OutputPlan | null
}

type OutputPlanProvider = (inpath: string | null, indir?: string) => Promise<OutputPlan | null>

interface JobEmitterOptions {
  allowOutputCollisions?: boolean
  recursive?: boolean
  outputPlanProvider: OutputPlanProvider
  singleAssembly?: boolean
  watch?: boolean
  reprocessStale?: boolean
}

interface ReaddirJobEmitterOptions {
  dir: string
  recursive?: boolean
  outputPlanProvider: OutputPlanProvider
  topdir?: string
}

interface SingleJobEmitterOptions {
  file: string
  outputPlanProvider: OutputPlanProvider
}

interface WatchJobEmitterOptions {
  file: string
  recursive?: boolean
  outputPlanProvider: OutputPlanProvider
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

function getJobInputPath(filepath: string): string {
  const normalizedFile = path.normalize(filepath)
  if (normalizedFile === '-') {
    return stdinWithPath.path
  }

  return normalizedFile
}

function createInputUploadStream(filepath: string): Readable {
  const instream = fs.createReadStream(filepath)
  // Attach a no-op error handler to prevent unhandled errors if stream is destroyed
  // before being consumed (e.g., due to output collision detection)
  instream.on('error', () => {})
  return instream
}

function createOutputPlan(pathname: string | undefined, mtime: Date): OutputPlan {
  if (pathname == null) {
    return {
      mtime,
    }
  }

  return {
    mtime,
    path: pathname,
  }
}

function dirProvider(output: string): OutputPlanProvider {
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
    const [, stats] = await tryCatch(fsp.stat(outpath))
    const mtime = stats?.mtime ?? new Date(0)
    return createOutputPlan(outpath, mtime)
  }
}

function fileProvider(output: string): OutputPlanProvider {
  return async (_inpath) => {
    if (output === '-') {
      return createOutputPlan(undefined, new Date(0))
    }

    const [, stats] = await tryCatch(fsp.stat(output))
    const mtime = stats?.mtime ?? new Date(0)
    return createOutputPlan(output, mtime)
  }
}

function nullProvider(): OutputPlanProvider {
  return async (_inpath) => null
}

async function downloadResultToFile(
  resultUrl: string,
  outPath: string,
  signal: AbortSignal,
): Promise<void> {
  await fsp.mkdir(path.dirname(outPath), { recursive: true })

  const tempPath = path.join(
    path.dirname(outPath),
    `.${path.basename(outPath)}.${randomUUID()}.tmp`,
  )
  const outStream = fs.createWriteStream(tempPath)
  outStream.on('error', () => {})

  const [dlErr] = await tryCatch(pipeline(got.stream(resultUrl, { signal }), outStream))
  if (dlErr) {
    await fsp.rm(tempPath, { force: true })
    throw dlErr
  }

  await fsp.rename(tempPath, outPath)
}

async function downloadResultToStdout(resultUrl: string, signal: AbortSignal): Promise<void> {
  const stdoutStream = new Writable({
    write(chunk, _encoding, callback) {
      let settled = false

      const finish = (err?: Error | null) => {
        if (settled) return
        settled = true
        process.stdout.off('drain', onDrain)
        process.stdout.off('error', onError)
        callback(err ?? undefined)
      }

      const onDrain = () => finish()
      const onError = (err: Error) => finish(err)

      process.stdout.once('error', onError)

      try {
        if (process.stdout.write(chunk)) {
          finish()
          return
        }

        process.stdout.once('drain', onDrain)
      } catch (err) {
        finish(ensureError(err))
      }
    },
    final(callback) {
      callback()
    },
  })

  await pipeline(got.stream(resultUrl, { signal }), stdoutStream)
}

interface AssemblyResultFile {
  file: {
    basename?: string | null
    ext?: string | null
    name?: string | null
    ssl_url?: string | null
    url?: string | null
  }
  stepName: string
}

function getResultFileUrl(file: AssemblyResultFile['file']): string | null {
  return file.ssl_url ?? file.url ?? null
}

function sanitizeResultName(value: string): string {
  const base = path.basename(value)
  return base.replaceAll('\\', '_').replaceAll('/', '_').replaceAll('\u0000', '')
}

async function ensureUniquePath(targetPath: string, reservedPaths: Set<string>): Promise<string> {
  const parsed = path.parse(targetPath)
  let candidate = targetPath
  let counter = 1
  while (true) {
    if (!reservedPaths.has(candidate)) {
      const [statErr] = await tryCatch(fsp.stat(candidate))
      if (statErr) {
        reservedPaths.add(candidate)
        return candidate
      }
    }

    candidate = path.join(parsed.dir, `${parsed.name}__${counter}${parsed.ext}`)
    counter += 1
  }
}

function flattenAssemblyResults(results: Record<string, Array<AssemblyResultFile['file']>>): {
  allFiles: AssemblyResultFile[]
  entries: Array<[string, Array<AssemblyResultFile['file']>]>
} {
  const entries = Object.entries(results)
  const allFiles: AssemblyResultFile[] = []
  for (const [stepName, stepResults] of entries) {
    for (const file of stepResults) {
      allFiles.push({ stepName, file })
    }
  }

  return { allFiles, entries }
}

function getResultFileName({ file, stepName }: AssemblyResultFile): string {
  const rawName =
    file.name ??
    (file.basename && file.ext ? `${file.basename}.${file.ext}` : undefined) ??
    `${stepName}_result`

  return sanitizeResultName(rawName)
}

interface AssemblyDownloadTarget {
  resultUrl: string
  targetPath: string | null
}

async function buildDirectoryDownloadTargets({
  allFiles,
  baseDir,
  groupByStep,
}: {
  allFiles: AssemblyResultFile[]
  baseDir: string
  groupByStep: boolean
}): Promise<AssemblyDownloadTarget[]> {
  await fsp.mkdir(baseDir, { recursive: true })

  const targets: AssemblyDownloadTarget[] = []
  const reservedPaths = new Set<string>()
  for (const resultFile of allFiles) {
    const resultUrl = getResultFileUrl(resultFile.file)
    if (resultUrl == null) {
      continue
    }

    const targetDir = groupByStep ? path.join(baseDir, resultFile.stepName) : baseDir
    await fsp.mkdir(targetDir, { recursive: true })

    targets.push({
      resultUrl,
      targetPath: await ensureUniquePath(
        path.join(targetDir, getResultFileName(resultFile)),
        reservedPaths,
      ),
    })
  }

  return targets
}

async function resolveResultDownloadTargets({
  allFiles,
  entries,
  hasDirectoryInput,
  inPath,
  inputs,
  outputMode,
  outputPath,
  outputRoot,
  outputRootIsDirectory,
  singleAssembly,
}: {
  allFiles: AssemblyResultFile[]
  entries: Array<[string, Array<AssemblyResultFile['file']>]>
  hasDirectoryInput: boolean
  inPath: string | null
  inputs: string[]
  outputMode?: 'directory' | 'file'
  outputPath: string | null
  outputRoot: string
  outputRootIsDirectory: boolean
  singleAssembly?: boolean
}): Promise<AssemblyDownloadTarget[]> {
  const shouldGroupByInput =
    !singleAssembly && inPath != null && (hasDirectoryInput || inputs.length > 1)

  const resolveDirectoryBaseDir = (): string => {
    if (!shouldGroupByInput || inPath == null) {
      return outputRoot
    }

    if (hasDirectoryInput && outputPath != null) {
      const mappedRelative = path.relative(outputRoot, outputPath)
      const mappedDir = path.dirname(mappedRelative)
      const mappedStem = path.parse(mappedRelative).name
      return path.join(outputRoot, mappedDir === '.' ? '' : mappedDir, mappedStem)
    }

    return path.join(outputRoot, path.parse(path.basename(inPath)).name)
  }

  if (!outputRootIsDirectory) {
    if (allFiles.length > 1) {
      if (outputPath == null) {
        throw new Error('stdout can only receive a single result file')
      }

      throw new Error('file outputs can only receive a single result file')
    }

    const first = allFiles[0]
    const resultUrl = first == null ? null : getResultFileUrl(first.file)
    if (resultUrl == null) {
      return []
    }

    return [{ resultUrl, targetPath: outputPath }]
  }

  if (singleAssembly) {
    return await buildDirectoryDownloadTargets({
      allFiles,
      baseDir: outputRoot,
      groupByStep: false,
    })
  }

  if (outputMode === 'directory' || outputPath == null) {
    return await buildDirectoryDownloadTargets({
      allFiles,
      baseDir: resolveDirectoryBaseDir(),
      groupByStep: entries.length > 1,
    })
  }

  if (allFiles.length === 1) {
    const first = allFiles[0]
    const resultUrl = first == null ? null : getResultFileUrl(first.file)
    return resultUrl == null ? [] : [{ resultUrl, targetPath: outputPath }]
  }

  return await buildDirectoryDownloadTargets({
    allFiles,
    baseDir: path.join(path.dirname(outputPath), path.parse(outputPath).name),
    groupByStep: true,
  })
}

async function materializeAssemblyResults({
  abortSignal,
  hasDirectoryInput,
  inPath,
  inputs,
  outputMode,
  outputPath,
  outputRoot,
  outputRootIsDirectory,
  outputctl,
  results,
  singleAssembly,
}: {
  abortSignal: AbortSignal
  hasDirectoryInput: boolean
  inPath: string | null
  inputs: string[]
  outputMode?: 'directory' | 'file'
  outputPath: string | null
  outputRoot: string | null
  outputRootIsDirectory: boolean
  outputctl: IOutputCtl
  results: Record<string, Array<AssemblyResultFile['file']>>
  singleAssembly?: boolean
}): Promise<void> {
  if (outputRoot == null) {
    return
  }

  const { allFiles, entries } = flattenAssemblyResults(results)
  const targets = await resolveResultDownloadTargets({
    allFiles,
    entries,
    hasDirectoryInput,
    inPath,
    inputs,
    outputMode,
    outputPath,
    outputRoot,
    outputRootIsDirectory,
    singleAssembly,
  })

  for (const { resultUrl, targetPath } of targets) {
    outputctl.debug('DOWNLOADING')
    const [dlErr] = await tryCatch(
      targetPath == null
        ? downloadResultToStdout(resultUrl, abortSignal)
        : downloadResultToFile(resultUrl, targetPath, abortSignal),
    )
    if (dlErr) {
      if (dlErr.name === 'AbortError') {
        continue
      }
      outputctl.error(dlErr.message)
      throw dlErr
    }
  }
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
  constructor({ dir, recursive, outputPlanProvider, topdir = dir }: ReaddirJobEmitterOptions) {
    super()

    process.nextTick(() => {
      this.processDirectory({
        dir,
        recursive,
        outputPlanProvider,
        topdir,
      }).catch((err) => {
        this.emit('error', err)
      })
    })
  }

  private async processDirectory({
    dir,
    recursive,
    outputPlanProvider,
    topdir,
  }: ReaddirJobEmitterOptions & { topdir: string }): Promise<void> {
    const files = await fsp.readdir(dir)

    const pendingOperations: Promise<void>[] = []

    for (const filename of files) {
      const file = path.normalize(path.join(dir, filename))
      pendingOperations.push(this.processFile({ file, recursive, outputPlanProvider, topdir }))
    }

    await Promise.all(pendingOperations)
    this.emit('end')
  }

  private async processFile({
    file,
    recursive = false,
    outputPlanProvider,
    topdir,
  }: {
    file: string
    recursive?: boolean
    outputPlanProvider: OutputPlanProvider
    topdir: string
  }): Promise<void> {
    const stats = await fsp.stat(file)

    if (stats.isDirectory()) {
      if (recursive) {
        await new Promise<void>((resolve, reject) => {
          const subdirEmitter = new ReaddirJobEmitter({
            dir: file,
            recursive,
            outputPlanProvider,
            topdir,
          })
          subdirEmitter.on('job', (job: Job) => this.emit('job', job))
          subdirEmitter.on('error', (error: Error) => reject(error))
          subdirEmitter.on('end', () => resolve())
        })
      }
    } else {
      const outputPlan = await outputPlanProvider(file, topdir)
      this.emit('job', { inputPath: getJobInputPath(file), out: outputPlan })
    }
  }
}

class SingleJobEmitter extends MyEventEmitter {
  constructor({ file, outputPlanProvider }: SingleJobEmitterOptions) {
    super()

    const normalizedFile = path.normalize(file)
    outputPlanProvider(normalizedFile)
      .then((outputPlan) => {
        process.nextTick(() => {
          this.emit('job', { inputPath: getJobInputPath(normalizedFile), out: outputPlan })
          this.emit('end')
        })
      })
      .catch((err: unknown) => {
        process.nextTick(() => {
          this.emit('error', ensureError(err))
        })
      })
  }
}

class InputlessJobEmitter extends MyEventEmitter {
  constructor({ outputPlanProvider }: { outputPlanProvider: OutputPlanProvider }) {
    super()

    process.nextTick(() => {
      outputPlanProvider(null)
        .then((outputPlan) => {
          try {
            this.emit('job', { inputPath: null, out: outputPlan })
          } catch (err) {
            this.emit('error', ensureError(err))
            return
          }

          this.emit('end')
        })
        .catch((err: unknown) => {
          this.emit('error', ensureError(err))
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

  constructor({ file, recursive, outputPlanProvider }: WatchJobEmitterOptions) {
    super()

    this.init({ file, recursive, outputPlanProvider }).catch((err) => {
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
    recursive,
    outputPlanProvider,
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
      this.handleChange(normalizedFile, topdir, outputPlanProvider).catch((err) => {
        this.emit('error', err)
      })
    })
  }

  private async handleChange(
    normalizedFile: string,
    topdir: string | undefined,
    outputPlanProvider: OutputPlanProvider,
  ): Promise<void> {
    const stats = await fsp.stat(normalizedFile)
    if (stats.isDirectory()) return

    const outputPlan = await outputPlanProvider(normalizedFile, topdir)
    this.emit('job', { inputPath: getJobInputPath(normalizedFile), out: outputPlan })
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
    if (job.inputPath == null || job.out == null) {
      emitter.emit('job', job)
      return
    }
    const inPath = job.inputPath
    const outPath = job.out.path
    if (outPath == null) {
      emitter.emit('job', job)
      return
    }
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
    if (job.inputPath == null || job.out == null) {
      emitter.emit('job', job)
      return
    }

    const inPath = job.inputPath
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

function passthroughJobs(jobEmitter: EventEmitter): MyEventEmitter {
  const emitter = new MyEventEmitter()

  jobEmitter.on('end', () => emitter.emit('end'))
  jobEmitter.on('error', (err: Error) => emitter.emit('error', err))
  jobEmitter.on('job', (job: Job) => emitter.emit('job', job))

  return emitter
}

function makeJobEmitter(
  inputs: string[],
  {
    allowOutputCollisions,
    recursive,
    outputPlanProvider,
    singleAssembly,
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
        emitterFns.push(() => new SingleJobEmitter({ file: input, outputPlanProvider }))
        watcherFns.push(() => new NullJobEmitter())
      } else {
        const stats = await fsp.stat(input)
        if (stats.isDirectory()) {
          emitterFns.push(
            () =>
              new ReaddirJobEmitter({
                dir: input,
                recursive,
                outputPlanProvider,
              }),
          )
          watcherFns.push(
            () =>
              new WatchJobEmitter({
                file: input,
                recursive,
                outputPlanProvider,
              }),
          )
        } else {
          emitterFns.push(() => new SingleJobEmitter({ file: input, outputPlanProvider }))
          watcherFns.push(
            () =>
              new WatchJobEmitter({
                file: input,
                recursive,
                outputPlanProvider,
              }),
          )
        }
      }
    }

    if (inputs.length === 0) {
      emitterFns.push(() => new InputlessJobEmitter({ outputPlanProvider }))
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

  const conflictFilter = allowOutputCollisions ? passthroughJobs : detectConflicts
  const staleFilter = reprocessStale || singleAssembly ? passthroughJobs : dismissStaleJobs

  return staleFilter(conflictFilter(emitter))
}

export interface AssembliesCreateOptions {
  steps?: string
  stepsData?: StepsInput
  template?: string
  fields?: Record<string, string>
  outputMode?: 'directory' | 'file'
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
    stepsData,
    template,
    fields,
    outputMode,
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
  let effectiveStepsData = stepsData
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
    effectiveStepsData = parsed as StepsInput
  }

  // Determine output stat async before entering the Promise constructor
  let outstat: StatLike | undefined
  if (resolvedOutput != null) {
    const [err, stat] = await tryCatch(myStat(process.stdout, resolvedOutput))
    if (err && (!isErrnoException(err) || err.code !== 'ENOENT')) throw err
    outstat =
      stat ??
      ({
        isDirectory: () => outputMode === 'directory',
      } satisfies StatLike)

    if (outputMode === 'directory' && stat != null && !stat.isDirectory()) {
      const msg = 'Output must be a directory for this command'
      outputctl.error(msg)
      throw new Error(msg)
    }

    if (!outstat.isDirectory() && inputs.length !== 0 && !singleAssembly) {
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

  const inputStats = await Promise.all(
    inputs.map(async (input) => {
      if (input === '-') return null
      return await myStat(process.stdin, input)
    }),
  )
  const hasDirectoryInput = inputStats.some((stat) => stat?.isDirectory() === true)

  return new Promise((resolve, reject) => {
    const params: CreateAssemblyParams = (
      effectiveStepsData
        ? { steps: effectiveStepsData as CreateAssemblyParams['steps'] }
        : { template_id: template }
    ) as CreateAssemblyParams
    if (fields) {
      params.fields = fields
    }

    const outputPlanProvider: OutputPlanProvider =
      resolvedOutput == null
        ? nullProvider()
        : outstat?.isDirectory()
          ? dirProvider(resolvedOutput)
          : fileProvider(resolvedOutput)

    const emitter = makeJobEmitter(inputs, {
      allowOutputCollisions: singleAssembly,
      outputPlanProvider,
      recursive,
      watch: watchOption,
      singleAssembly,
      reprocessStale,
    })

    // Use p-queue for concurrency management
    const queue = new PQueue({ concurrency })
    const results: unknown[] = []
    let hasFailures = false
    // AbortController to cancel all in-flight createAssembly calls when an error occurs
    const abortController = new AbortController()
    const outputRootIsDirectory = Boolean(resolvedOutput != null && outstat?.isDirectory())

    function createAssemblyOptions(uploads?: Record<string, Readable>): CreateAssemblyOptions {
      const createOptions: CreateAssemblyOptions = {
        params,
        signal: abortController.signal,
      }
      if (uploads != null && Object.keys(uploads).length > 0) {
        createOptions.uploads = uploads
      }
      return createOptions
    }

    async function awaitCompletedAssembly(
      createOptions: CreateAssemblyOptions,
    ): Promise<Awaited<ReturnType<typeof client.awaitAssemblyCompletion>>> {
      const result = await client.createAssembly(createOptions)
      const assemblyId = result.assembly_id
      if (!assemblyId) throw new Error('No assembly_id in result')

      const assembly = await client.awaitAssemblyCompletion(assemblyId, {
        signal: abortController.signal,
        onPoll: () => true,
        onAssemblyProgress: (status) => {
          outputctl.debug(`Assembly status: ${status.ok}`)
        },
      })

      if (assembly.error || (assembly.ok && assembly.ok !== 'ASSEMBLY_COMPLETED')) {
        const msg = `Assembly failed: ${assembly.error || assembly.message} (Status: ${assembly.ok})`
        outputctl.error(msg)
        throw new Error(msg)
      }

      return assembly
    }

    async function executeAssemblyLifecycle({
      createOptions,
      inPath,
      inputPaths,
      outputPlan,
      singleAssemblyMode,
    }: {
      createOptions: CreateAssemblyOptions
      inPath: string | null
      inputPaths: string[]
      outputPlan: OutputPlan | null
      singleAssemblyMode?: boolean
    }): Promise<unknown> {
      outputctl.debug(`PROCESSING JOB ${inPath ?? 'null'} ${outputPlan?.path ?? 'null'}`)

      const assembly = await awaitCompletedAssembly(createOptions)
      if (!assembly.results) throw new Error('No results in assembly')

      if (
        !singleAssemblyMode &&
        outputPlan?.path != null &&
        !outputRootIsDirectory &&
        ((await tryCatch(fsp.stat(outputPlan.path)))[1]?.mtime ?? new Date(0)) > outputPlan.mtime
      ) {
        outputctl.debug(`SKIPPED STALE RESULT ${inPath ?? 'null'} ${outputPlan.path}`)
        return assembly
      }

      await materializeAssemblyResults({
        abortSignal: abortController.signal,
        hasDirectoryInput: singleAssemblyMode ? false : hasDirectoryInput,
        inPath,
        inputs: inputPaths,
        outputMode,
        outputPath: outputPlan?.path ?? null,
        outputRoot: resolvedOutput ?? null,
        outputRootIsDirectory,
        outputctl,
        results: assembly.results,
        singleAssembly: singleAssemblyMode,
      })

      outputctl.debug(`COMPLETED ${inPath ?? 'null'} ${outputPlan?.path ?? 'null'}`)

      if (del) {
        for (const inputPath of inputPaths) {
          if (inputPath === stdinWithPath.path) {
            continue
          }
          await fsp.unlink(inputPath)
        }
      }
      return assembly
    }

    async function shouldSkipSingleAssemblyRun(inputPaths: string[]): Promise<boolean> {
      if (reprocessStale || resolvedOutput == null || outputRootIsDirectory) {
        return false
      }

      if (inputPaths.some((inputPath) => inputPath === stdinWithPath.path)) {
        return false
      }

      const [outputErr, outputStat] = await tryCatch(fsp.stat(resolvedOutput))
      if (outputErr != null || outputStat == null) {
        return false
      }

      const inputStats = await Promise.all(
        inputPaths.map(async (inputPath) => {
          const [inputErr, inputStat] = await tryCatch(fsp.stat(inputPath))
          if (inputErr != null || inputStat == null) {
            return null
          }
          return inputStat
        }),
      )

      if (inputStats.some((inputStat) => inputStat == null)) {
        return false
      }

      return inputStats.every((inputStat) => {
        return inputStat != null && outputStat.mtime > inputStat.mtime
      })
    }

    // Helper to process a single assembly job
    async function processAssemblyJob(
      inPath: string | null,
      outputPlan: OutputPlan | null,
    ): Promise<unknown> {
      const inStream = inPath ? createInputUploadStream(inPath) : null

      return await executeAssemblyLifecycle({
        createOptions: createAssemblyOptions(inStream == null ? undefined : { in: inStream }),
        inPath,
        inputPaths: inPath == null ? [] : [inPath],
        outputPlan,
      })
    }

    if (singleAssembly) {
      // Single-assembly mode: collect file paths, then create one assembly with all inputs
      const collectedPaths: string[] = []

      emitter.on('job', (job: Job) => {
        if (job.inputPath != null) {
          const inPath = job.inputPath
          outputctl.debug(`COLLECTING JOB ${inPath}`)
          collectedPaths.push(inPath)
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

        if (await shouldSkipSingleAssemblyRun(collectedPaths)) {
          outputctl.debug(`SKIPPED STALE SINGLE ASSEMBLY ${resolvedOutput ?? 'null'}`)
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
          uploads[key] = createInputUploadStream(inPath)
          inputPaths.push(inPath)
        }

        outputctl.debug(`Creating single assembly with ${Object.keys(uploads).length} files`)

        try {
          const assembly = await queue.add(async () => {
            return await executeAssemblyLifecycle({
              createOptions: createAssemblyOptions(uploads),
              inPath: null,
              inputPaths,
              outputPlan:
                resolvedOutput == null ? null : createOutputPlan(resolvedOutput, new Date(0)),
              singleAssemblyMode: true,
            })
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
        const inPath = job.inputPath
        const outputPlan = job.out
        outputctl.debug(`GOT JOB ${inPath ?? 'null'} ${outputPlan?.path ?? 'null'}`)
        // Add job to queue - p-queue handles concurrency automatically
        queue
          .add(async () => {
            const result = await processAssemblyJob(inPath, outputPlan)
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

  inputs = inputPathsOption()

  outputPath = Option.String('--output,-o', {
    description: 'Specify an output file or directory',
  })

  fields = Option.Array('--field,-f', {
    description: 'Set a template field (KEY=VAL)',
  })

  watch = watchOption()

  recursive = recursiveOption()

  deleteAfterProcessing = deleteAfterProcessingOption()

  reprocessStale = reprocessStaleOption()

  singleAssembly = singleAssemblyOption()

  concurrency = concurrencyOption()

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

    const sharedValidationError = validateSharedFileProcessingOptions({
      explicitInputCount: this.inputs?.length ?? 0,
      singleAssembly: this.singleAssembly,
      watch: this.watch,
      watchRequiresInputsMessage: 'assemblies create --watch requires at least one input',
    })
    if (sharedValidationError != null) {
      this.output.error(sharedValidationError)
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
      concurrency: this.concurrency == null ? undefined : Number(this.concurrency),
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

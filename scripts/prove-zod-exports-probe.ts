/**
 * Runtime half of `prove-zod-exports.ts`. The proof copies this file into a materialized tree's
 * `packages/zod` directory and runs it there, so `zod/v4` and the built `dist` resolve exactly as
 * that tree's consumers would. It writes one JSON document with:
 *
 * - a structural fingerprint of every exported Zod 3 and Zod 4 value (kinds, checks, enum values,
 *   evaluated defaults, descriptions, unknown-key handling, function sources as hashes);
 * - a parse corpus: a synthesized sample per exported schema, then omitted / `undefined` / `null`
 *   at every optional site, parsed by both versions (success, output and issue paths and codes);
 * - digests of `z.toJSONSchema` for every Zod 4 export, input and output projections (the full
 *   documents go into a directory so the proof can show the ones that differ).
 */
import { createHash } from 'node:crypto'
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { relative, resolve, sep } from 'node:path'
import { pathToFileURL } from 'node:url'
import { parseArgs } from 'node:util'

import { z } from 'zod/v4'

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue }

interface ParseOutcome {
  success: boolean
  data?: JsonValue
  issues?: { path: string; code: string }[]
}

interface SafeParser {
  safeParse: (input: unknown) => unknown
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const hash = (text: string): string => createHash('sha256').update(text).digest('hex')

const read = (value: unknown, key: string): unknown => (isRecord(value) ? value[key] : undefined)

const isV4Schema = (value: unknown): boolean => isRecord(read(value, '_zod'))

const isV3Schema = (value: unknown): boolean =>
  isRecord(read(value, '_def')) && typeof read(value, 'safeParse') === 'function'

const hasSafeParse = (value: unknown): value is SafeParser =>
  isRecord(value) && typeof value.safeParse === 'function'

/** Serialize parse output, keeping `undefined` and non-JSON values visible. */
const toJson = (value: unknown, seen = new Set<unknown>()): JsonValue => {
  if (value === undefined) return { $undefined: true }
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value
  if (typeof value === 'number') return Number.isFinite(value) ? value : { $number: String(value) }
  if (typeof value === 'bigint') return { $bigint: String(value) }
  if (typeof value === 'function') return { $function: hash(String(value)) }
  if (typeof value === 'symbol') return { $symbol: String(value) }
  if (seen.has(value)) return { $cycle: true }
  seen.add(value)
  if (value instanceof RegExp) return { $regexp: String(value) }
  if (value instanceof Date) return { $date: value.toISOString() }
  if (Array.isArray(value)) return value.map((item) => toJson(item, seen))
  if (!isRecord(value)) return { $object: Object.prototype.toString.call(value) }
  const output: Record<string, JsonValue> = {}
  for (const key of Object.keys(value)) output[key] = toJson(value[key], seen)
  seen.delete(value)
  return output
}

// ---------------------------------------------------------------------------------------------
// Structural fingerprint
// ---------------------------------------------------------------------------------------------

class Fingerprinter {
  nodes: JsonValue[] = []
  #ids = new Map<unknown, number>()
  #isSchema: (value: unknown) => boolean
  #describe: (schema: unknown) => Record<string, JsonValue>

  constructor(
    isSchema: (value: unknown) => boolean,
    describe: (schema: unknown) => Record<string, JsonValue>,
  ) {
    this.#isSchema = isSchema
    this.#describe = describe
  }

  schema(value: unknown): JsonValue {
    const known = this.#ids.get(value)
    if (known !== undefined) return { $ref: known }
    const id = this.nodes.length
    this.#ids.set(value, id)
    this.nodes.push(null)
    this.nodes[id] = this.#describe(value)
    return { $ref: id }
  }

  value(value: unknown, depth = 0): JsonValue {
    if (this.#isSchema(value)) return this.schema(value)
    if (depth > 12) return { $depth: true }
    if (Array.isArray(value)) return value.map((item) => this.value(item, depth + 1))
    if (isRecord(value) && !(value instanceof RegExp)) {
      const output: Record<string, JsonValue> = {}
      for (const key of Object.keys(value)) output[key] = this.value(value[key], depth + 1)
      return output
    }
    return toJson(value)
  }
}

const v4Fingerprinter = (): Fingerprinter => {
  const fingerprinter: Fingerprinter = new Fingerprinter(isV4Schema, (schema) => {
    const internals = read(schema, '_zod')
    const def = read(internals, 'def')
    const output: Record<string, JsonValue> = {}
    if (isRecord(def)) {
      for (const key of Object.keys(def)) {
        if (key === 'getter') continue
        output[key] = fingerprinter.value(def[key])
      }
      // Getters that the own-key walk can miss.
      for (const key of ['shape', 'defaultValue']) {
        if (key in def && !(key in output)) output[key] = fingerprinter.value(def[key])
      }
      if (def.type === 'lazy') output.lazy = fingerprinter.value(read(internals, 'innerType'))
    }
    const traits = read(internals, 'traits')
    output.$traits = traits instanceof Set ? [...traits].map(String).sort() : null
    output.$optin = toJson(read(internals, 'optin'))
    output.$optout = toJson(read(internals, 'optout'))
    output.$description = toJson(read(schema, 'description'))
    return output
  })
  return fingerprinter
}

const v3Fingerprinter = (): Fingerprinter => {
  const fingerprinter: Fingerprinter = new Fingerprinter(isV3Schema, (schema) => {
    const def = read(schema, '_def')
    const output: Record<string, JsonValue> = {}
    const schemaClass = read(schema, 'constructor')
    output.$class = typeof schemaClass === 'function' ? schemaClass.name : null
    if (!isRecord(def)) return output
    for (const key of Object.keys(def)) {
      const value = def[key]
      // Zod 3 keeps object shapes, defaults and lazy schemas behind functions: evaluate them.
      if (typeof value === 'function' && ['shape', 'defaultValue', 'getter'].includes(key)) {
        output[key] = fingerprinter.value(value())
        continue
      }
      output[key] = fingerprinter.value(value)
    }
    output.$description = toJson(read(schema, 'description'))
    return output
  })
  return fingerprinter
}

// ---------------------------------------------------------------------------------------------
// Parse corpus
// ---------------------------------------------------------------------------------------------

const defOf = (schema: unknown): Record<string, unknown> => {
  const def = read(read(schema, '_zod'), 'def')
  return isRecord(def) ? def : {}
}

const parsesV4 = (schema: unknown, value: unknown): boolean =>
  hasSafeParse(schema) && read(schema.safeParse(value), 'success') === true

const stringCandidates = [
  ':original',
  'x',
  'https://example.com/file.jpg',
  '${file.name}',
  'someone@example.com',
  '1',
  'auto',
]
const numberCandidates = [1, 0, 100, 0.5, -1]

/** A deterministic, preferably valid, input for a Zod 4 schema. */
const synthesize = (schema: unknown, depth = 0): unknown => {
  if (depth > 10) return undefined
  const def = defOf(schema)
  const first = (candidates: unknown[]): unknown =>
    candidates.find((candidate) => parsesV4(schema, candidate)) ?? candidates[0]
  switch (def.type) {
    case 'string':
      return first(stringCandidates)
    case 'number':
    case 'int':
      return first(numberCandidates)
    case 'boolean':
      return true
    case 'null':
      return null
    case 'literal':
      return Array.isArray(def.values) ? def.values[0] : undefined
    case 'enum':
      return isRecord(def.entries) ? Object.values(def.entries)[0] : undefined
    case 'optional':
    case 'nullable':
    case 'default':
    case 'prefault':
    case 'readonly':
    case 'nonoptional':
    case 'catch':
      return synthesize(def.innerType, depth + 1)
    case 'pipe':
      return synthesize(def.in, depth + 1)
    case 'lazy':
      return synthesize(read(read(schema, '_zod'), 'innerType'), depth + 1)
    case 'array': {
      if (parsesV4(schema, [])) return []
      return [synthesize(def.element, depth + 1)]
    }
    case 'tuple':
      return Array.isArray(def.items) ? def.items.map((item) => synthesize(item, depth + 1)) : []
    case 'record':
      return {}
    case 'object': {
      const shape = def.shape
      if (!isRecord(shape)) return {}
      const output: Record<string, unknown> = {}
      for (const [key, child] of Object.entries(shape)) {
        if (read(read(child, '_zod'), 'optin') === 'optional') continue
        output[key] = synthesize(child, depth + 1)
      }
      return output
    }
    case 'union': {
      const options = Array.isArray(def.options) ? def.options : []
      const candidates = options.map((option) => synthesize(option, depth + 1))
      return first(candidates.length > 0 ? candidates : [undefined])
    }
    case 'intersection': {
      const left = synthesize(def.left, depth + 1)
      const right = synthesize(def.right, depth + 1)
      return isRecord(left) && isRecord(right) ? { ...left, ...right } : left
    }
    case 'any':
    case 'unknown':
      return 'x'
    default:
      return undefined
  }
}

const objectOf = (schema: unknown, depth = 0): Record<string, unknown> | undefined => {
  if (depth > 10) return undefined
  const def = defOf(schema)
  if (def.type === 'object') return isRecord(def.shape) ? def.shape : undefined
  if (['optional', 'nullable', 'default', 'prefault', 'readonly'].includes(String(def.type))) {
    return objectOf(def.innerType, depth + 1)
  }
  if (def.type === 'pipe') return objectOf(def.in, depth + 1)
  if (def.type === 'lazy') return objectOf(read(read(schema, '_zod'), 'innerType'), depth + 1)
  return undefined
}

const isOptionalSite = (schema: unknown): boolean => {
  const type = defOf(schema).type
  return (
    read(read(schema, '_zod'), 'optin') === 'optional' ||
    type === 'optional' ||
    type === 'default' ||
    type === 'prefault' ||
    type === 'nullable'
  )
}

interface Probe {
  label: string
  input: unknown
}

const setAt = (root: unknown, path: string[], mode: 'omit' | 'undefined' | 'null'): unknown => {
  const [head, ...rest] = path
  if (head === undefined || !isRecord(root)) return root
  const copy: Record<string, unknown> = { ...root }
  if (rest.length > 0) {
    copy[head] = setAt(root[head], rest, mode)
    return copy
  }
  if (mode === 'omit') delete copy[head]
  else copy[head] = mode === 'null' ? null : undefined
  return copy
}

const probesFor = (schema: unknown, sample: unknown): Probe[] => {
  const probes: Probe[] = [{ label: 'sample', input: sample }]
  const visit = (node: unknown, value: unknown, path: string[]): void => {
    const shape = objectOf(node)
    if (!shape || !isRecord(value) || path.length > 6 || probes.length > 600) return
    for (const [key, child] of Object.entries(shape)) {
      const childPath = [...path, key]
      // Omitting a required key is a probe too: Zod 3 and Zod 4 disagree on some required keys.
      const modes = isOptionalSite(child)
        ? (['omit', 'undefined', 'null'] as const)
        : (['omit'] as const)
      for (const mode of modes) {
        probes.push({
          label: `${childPath.join('.')}:${mode}`,
          input: setAt(sample, childPath, mode),
        })
      }
      visit(child, value[key], childPath)
    }
  }
  visit(schema, sample, [])
  return probes
}

const outcome = (parser: unknown, input: unknown): ParseOutcome => {
  if (!hasSafeParse(parser)) return { success: false, issues: [{ path: '', code: 'not-a-schema' }] }
  let result: unknown
  try {
    result = parser.safeParse(input)
  } catch (error) {
    // A throwing parse is a behavior worth recording, not a probe failure.
    if (!(error instanceof Error)) throw new Error(`Was thrown a non-error: ${error}`)
    return { success: false, issues: [{ path: '', code: `throws:${error.message}` }] }
  }
  if (read(result, 'success') === true) return { success: true, data: toJson(read(result, 'data')) }
  const issues = read(read(result, 'error'), 'issues')
  return {
    success: false,
    issues: (Array.isArray(issues) ? issues : []).map((issue) => ({
      path: JSON.stringify(toJson(read(issue, 'path'))),
      code: String(read(issue, 'code')),
    })),
  }
}

const undefinedMarker = '$undefined'

const encodeInput = (value: unknown): unknown => {
  if (value === undefined) return { [undefinedMarker]: true }
  if (Array.isArray(value)) return value.map(encodeInput)
  if (!isRecord(value)) return value
  return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, encodeInput(child)]))
}

const decodeInput = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(decodeInput)
  if (!isRecord(value)) return value
  const keys = Object.keys(value)
  if (keys.length === 1 && keys[0] === undefinedMarker && value[undefinedMarker] === true) {
    return undefined
  }
  return Object.fromEntries(keys.map((key) => [key, decodeInput(value[key])]))
}

const encodeProbes = (probes: Record<string, Probe[]>): unknown =>
  Object.fromEntries(
    Object.entries(probes).map(([key, list]) => [
      key,
      list.map((probe) => ({ label: probe.label, input: encodeInput(probe.input) })),
    ]),
  )

const decodeProbes = (document: unknown): Record<string, Probe[]> => {
  const result: Record<string, Probe[]> = {}
  if (!isRecord(document)) throw new Error('probe inputs must be an object')
  for (const [key, list] of Object.entries(document)) {
    result[key] = (Array.isArray(list) ? list : []).map((probe) => ({
      label: String(read(probe, 'label')),
      input: decodeInput(read(probe, 'input')),
    }))
  }
  return result
}

// ---------------------------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------------------------

const loadExports = async (root: string): Promise<Map<string, unknown>> => {
  const entries = await readdir(root, { recursive: true, withFileTypes: true })
  const modules = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.js'))
    .map((entry) => relative(root, resolve(entry.parentPath, entry.name)).split(sep).join('/'))
    .sort()
  const exports = new Map<string, unknown>()
  for (const module of modules) {
    const loaded: Record<string, unknown> = await import(pathToFileURL(resolve(root, module)).href)
    for (const name of Object.keys(loaded).sort()) exports.set(`${module}:${name}`, loaded[name])
  }
  return exports
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      out: { type: 'string' },
      'json-schema-dir': { type: 'string' },
      'inputs-in': { type: 'string' },
      'inputs-out': { type: 'string' },
    },
  })
  if (!values.out || !values['json-schema-dir']) {
    throw new Error('Usage: prove-zod-exports-probe.ts --out <file> --json-schema-dir <dir>')
  }
  const zodPackage = JSON.parse(
    await readFile(createRequire(import.meta.url).resolve('zod/package.json'), 'utf8'),
  )
  const v3Exports = await loadExports(resolve(import.meta.dirname, 'dist/v3'))
  const v4Exports = await loadExports(resolve(import.meta.dirname, 'dist/v4'))

  const fingerprints: Record<string, { roots: Record<string, JsonValue>; nodes: JsonValue[] }> = {}
  for (const [version, exports, fingerprinter] of [
    ['v3', v3Exports, v3Fingerprinter()],
    ['v4', v4Exports, v4Fingerprinter()],
  ] as const) {
    const roots: Record<string, JsonValue> = {}
    for (const [key, value] of exports) roots[key] = fingerprinter.value(value)
    fingerprints[version] = { roots, nodes: fingerprinter.nodes }
  }

  // Synthesis consults the installed Zod, so a comparison feeds both trees the same inputs.
  const sharedInputs = values['inputs-in']
    ? decodeProbes(JSON.parse(await readFile(resolve(values['inputs-in']), 'utf8')))
    : undefined
  const usedInputs: Record<string, Probe[]> = {}
  const corpus: Record<string, { label: string; v3: string; v4: string }[]> = {}
  const crossVersion: { export: string; probe: string; v3: ParseOutcome; v4: ParseOutcome }[] = []
  const outcomes = new Map<string, ParseOutcome>()
  for (const [key, v4Schema] of v4Exports) {
    if (!isV4Schema(v4Schema)) continue
    const v3Schema = v3Exports.get(key)
    const results: { label: string; v3: string; v4: string }[] = []
    const probes = sharedInputs
      ? (sharedInputs[key] ?? [])
      : probesFor(v4Schema, synthesize(v4Schema))
    usedInputs[key] = probes
    for (const probe of probes) {
      const v3 = outcome(v3Schema, probe.input)
      const v4 = outcome(v4Schema, probe.input)
      const v3Digest = hash(JSON.stringify(v3))
      const v4Digest = hash(JSON.stringify(v4))
      outcomes.set(v3Digest, v3)
      outcomes.set(v4Digest, v4)
      results.push({ label: probe.label, v3: v3Digest, v4: v4Digest })
      // Issue codes differ between the versions by design; compare acceptance and output.
      const sameOutput = v3.success === v4.success && (!v3.success || v3Digest === v4Digest)
      if (!sameOutput) crossVersion.push({ export: key, probe: probe.label, v3, v4 })
    }
    corpus[key] = results
  }

  if (values['inputs-out']) {
    await writeFile(resolve(values['inputs-out']), `${JSON.stringify(encodeProbes(usedInputs))}\n`)
  }

  const jsonSchemaDir = resolve(values['json-schema-dir'])
  await mkdir(jsonSchemaDir, { recursive: true })
  const jsonSchemas: Record<string, { input: string; output: string }> = {}
  for (const [key, schema] of v4Exports) {
    if (!(schema instanceof z.ZodType)) continue
    const digests = { input: '', output: '' }
    for (const io of ['input', 'output'] as const) {
      let document: unknown
      try {
        document = z.toJSONSchema(schema, { io, unrepresentable: 'any', cycles: 'ref' })
      } catch (error) {
        if (!(error instanceof Error)) throw new Error(`Was thrown a non-error: ${error}`)
        document = { $conversionError: error.message }
      }
      const text = `${JSON.stringify(document, null, 2)}\n`
      digests[io] = hash(text)
      await writeFile(resolve(jsonSchemaDir, `${key.replaceAll('/', '__')}.${io}.json`), text)
    }
    jsonSchemas[key] = digests
  }

  const document = {
    zodVersion: String(read(zodPackage, 'version')),
    fingerprints,
    corpus,
    crossVersion,
    outcomes: Object.fromEntries(outcomes),
    jsonSchemas,
  }
  await writeFile(resolve(values.out), `${JSON.stringify(document)}\n`)
  console.log(
    `probe: ${v3Exports.size} v3 / ${v4Exports.size} v4 exports, ${Object.values(corpus).reduce((sum, list) => sum + list.length, 0)} probes, ${crossVersion.length} v3/v4 differences`,
  )
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})

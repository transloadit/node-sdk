import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const filePath = fileURLToPath(import.meta.url)
const zodRoot = resolve(dirname(filePath), '..')
const packageJsonPath = resolve(zodRoot, 'package.json')
const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8')) as {
  scripts?: Record<string, string>
}

const scripts = packageJson.scripts ?? {}
const requiredScripts = ['sync:v3', 'sync:v4', 'test:unit']

for (const scriptName of requiredScripts) {
  const script = scripts[scriptName]
  assert.ok(script, `Missing ${scriptName} script in package.json`)
  assert.ok(
    script.includes('node '),
    `${scriptName} should invoke node directly for TypeScript scripts`,
  )
  assert.ok(
    !script.includes('--experimental-strip-types'),
    `${scriptName} should not use --experimental-strip-types (Node 22.18+ runs .ts directly)`,
  )
}

console.log('zod scripts config: ok')

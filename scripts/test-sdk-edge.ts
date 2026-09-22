import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import { cp, mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { setTimeout } from 'node:timers/promises'
import { parseArgs } from 'node:util'
import { brotliCompressSync, constants } from 'node:zlib'

import { execa } from 'execa'
import { z } from 'zod'

const repoRoot = resolve(import.meta.dirname, '..')
// Same ESZIP bundler and Deno runtime used by Supabase, pinned across local and CI runs.
const edgeImage =
  'public.ecr.aws/supabase/edge-runtime:v1.76.2@sha256:edd22bef4477b900d5c300e287ce9b18bff9b81a0291bee14ee0b7c7b71a2899'
const signedResponse = z.object({ signature: z.string(), params: z.string() })

async function waitForResponse(url: string): Promise<z.infer<typeof signedResponse>> {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const response = await fetch(url, { signal: AbortSignal.timeout(2_000) }).catch(() => undefined)
    if (response !== undefined) {
      assert(response.ok, `Edge function returned HTTP ${response.status}`)
      return signedResponse.parse(await response.json())
    }
    await setTimeout(250)
  }
  throw new Error('Supabase Edge function did not become ready')
}

async function main(): Promise<void> {
  const { values } = parseArgs({ options: { version: { type: 'string' } } })
  const output = resolve(repoRoot, 'test-results/sdk-edge', values.version ?? 'packed')
  await mkdir(output, { recursive: true })
  const temporary = await mkdtemp(join(tmpdir(), 'transloadit-sdk-edge-'))
  try {
    await execa('docker', ['pull', edgeImage], { stdio: 'inherit' })
    for (const name of ['@transloadit/node', 'transloadit']) {
      const label = name === 'transloadit' ? 'legacy' : 'node'
      const consumer = join(temporary, label)
      await mkdir(consumer)
      let source = `${name}@${values.version}`
      if (values.version === undefined) {
        source = join(temporary, `${label}.tgz`)
        await execa('corepack', ['yarn', 'workspace', name, 'pack', '--out', source], {
          cwd: repoRoot,
          stdio: 'inherit',
        })
      }
      await writeFile(join(consumer, 'package.json'), '{"private":true,"type":"module"}\n')
      // Do not omit optional dependencies: that would hide the original customer regression.
      await execa('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund', source], {
        cwd: consumer,
        stdio: 'inherit',
      })
      await cp(join(repoRoot, 'scripts/fixtures/sdk-edge/index.ts'), join(consumer, 'index.ts'))
      await writeFile(
        join(consumer, 'deno.json'),
        `${JSON.stringify({
          imports: { 'sdk-under-test': `./node_modules/${name}/dist/Transloadit.js` },
          nodeModulesDir: 'manual',
          lock: false,
        })}\n`,
      )
      const files = await readdir(join(consumer, 'node_modules'), { recursive: true })
      const nativeFiles = files.filter((file) =>
        /(^|[/\\])(sharp|@img)([/\\]|$)|\.node$/.test(file),
      )
      // Avoid requiring the temporary directory to be shared into Docker Desktop or Colima.
      const created = await execa('docker', [
        'create',
        '--workdir',
        '/work',
        edgeImage,
        'bundle',
        '--entrypoint',
        '/work/index.ts',
        '--output',
        '/work/function.eszip',
        '--timeout',
        '120',
      ])
      const bundler = created.stdout.trim()
      try {
        await execa('docker', ['cp', `${consumer}/.`, `${bundler}:/work`])
        await execa('docker', ['start', '--attach', bundler], { timeout: 150_000 })
        const bundleFile = join(output, `${label}.eszip`)
        await execa('docker', ['cp', `${bundler}:/work/function.eszip`, bundleFile])
        const bundle = await readFile(bundleFile)
        const bundleBytes = bundle.length
        // Supabase CLI uploads EZBR + Brotli quality 6, not the uncompressed ESZIP.
        const compressed = Buffer.concat([
          Buffer.from('EZBR'),
          brotliCompressSync(bundle, { params: { [constants.BROTLI_PARAM_QUALITY]: 6 } }),
        ])
        await writeFile(join(output, `${label}.ezbr`), compressed)
        console.log(
          JSON.stringify({
            package: name,
            version: values.version ?? 'packed',
            bundleBytes,
            uploadBytes: compressed.length,
            nativeFiles: nativeFiles.length,
          }),
        )
        await writeFile(
          join(output, `${label}.json`),
          `${JSON.stringify({ name, bundleBytes, uploadBytes: compressed.length, nativeFiles }, null, 2)}\n`,
        )
        assert.equal(
          nativeFiles.length,
          0,
          `${name} installed native image dependencies: ${nativeFiles.slice(0, 5).join(', ')}`,
        )
        // 4.12.0 baselines are ~27 MB raw / ~2.3 MB compressed, including packaged TS sources.
        // Budget below the 20 MB CLI upload limit so callers have room for their application.
        assert(
          bundleBytes < 32 * 1024 * 1024 && compressed.length < 5 * 1024 * 1024,
          `${name} exceeds the SDK budget (32 MiB raw / 5 MiB upload): ${bundleBytes} / ${compressed.length} bytes`,
        )
        assert(
          !bundle.includes(Buffer.from('sharp/lib/index')),
          'Sharp entered the Edge module graph',
        )
        const server = await execa('docker', [
          'create',
          '--publish',
          '127.0.0.1::9000',
          '--workdir',
          '/work',
          edgeImage,
          'start',
          '--main-service',
          '/function.eszip',
          '--main-entrypoint',
          '/work/index.ts',
        ])
        const runtime = server.stdout.trim()
        try {
          await execa('docker', ['cp', bundleFile, `${runtime}:/function.eszip`])
          await execa('docker', ['start', runtime])
          // The runner needs locally reachable Docker ports, as documented in CONTRIBUTING.
          const port = await execa('docker', ['port', runtime, '9000/tcp'])
          const response = await waitForResponse(`http://${port.stdout.trim()}`)
          const signature = createHmac('sha256', 'fixture-secret')
            .update(response.params)
            .digest('hex')
          assert.equal(response.signature, `sha256:${signature}`)
        } finally {
          try {
            const logs = await execa('docker', ['logs', runtime], { reject: false })
            await writeFile(
              join(output, `${label}-runtime.log`),
              `${logs.stdout}\n${logs.stderr}\n`,
            )
          } finally {
            await execa('docker', ['rm', '--force', runtime])
          }
        }
      } finally {
        try {
          // Keep native-runtime crash evidence even when the bundler never returns a bundle.
          const logs = await execa('docker', ['logs', bundler], { reject: false })
          await writeFile(join(output, `${label}-bundle.log`), `${logs.stdout}\n${logs.stderr}\n`)
          const state = await execa('docker', ['inspect', '--format', '{{json .State}}', bundler], {
            reject: false,
          })
          await writeFile(join(output, `${label}-container-state.json`), `${state.stdout}\n`)
        } finally {
          await execa('docker', ['rm', '--force', bundler])
        }
      }
    }
  } finally {
    await rm(temporary, { recursive: true, force: true })
  }
}

main().catch((error: unknown) => {
  console.error(error)
  process.exitCode = 1
})

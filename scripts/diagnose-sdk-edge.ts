// Temporary, credentials-free investigation for node-sdk#510. Not a replacement CI gate.
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

import { execa } from 'execa'

const repoRoot = resolve(import.meta.dirname, '..')
const output = join(repoRoot, 'test-results/sdk-edge-diagnosis')
const edgeImage =
  'public.ecr.aws/supabase/edge-runtime:v1.76.2@sha256:edd22bef4477b900d5c300e287ce9b18bff9b81a0291bee14ee0b7c7b71a2899'
const containers = new Set<string>()
const volumes = new Set<string>()
const probes: { label: string; exitCode: number | undefined; durationMs: number }[] = []

async function capture(
  label: string,
  command: string,
  args: string[],
): Promise<number | undefined> {
  const result = await execa(command, args, { reject: false, timeout: 240_000 })
  await writeFile(
    join(output, `${label}.log`),
    `${JSON.stringify({ command, args, exitCode: result.exitCode, durationMs: result.durationMs })}\n${result.stdout}\n${result.stderr}\n`,
  )
  console.log(`${label}: exit=${result.exitCode}, ms=${Math.round(result.durationMs)}`)
  return result.exitCode
}

async function createContainer(args: string[]): Promise<string> {
  const result = await execa('docker', ['create', '--label', 'transloadit.diagnosis=510', ...args])
  const id = result.stdout.trim()
  containers.add(id)
  return id
}

async function probe(
  label: string,
  args: string[],
  source: string | undefined,
  options: string[] = [],
): Promise<number | undefined> {
  const id = await createContainer(['--workdir', '/work', ...options, edgeImage, ...args])
  if (source !== undefined) {
    await execa('docker', ['cp', `${source}/.`, `${id}:/work`])
  }
  const result = await execa('docker', ['start', '--attach', id], {
    reject: false,
    timeout: 150_000,
  })
  probes.push({ label, exitCode: result.exitCode, durationMs: result.durationMs })
  await writeFile(join(output, `${label}.log`), `${result.stdout}\n${result.stderr}\n`)
  await capture(`${label}-state`, 'docker', [
    'inspect',
    '--format',
    '{{json .State}} {{.Image}} shm={{.HostConfig.ShmSize}}',
    id,
  ])
  console.log(JSON.stringify(probes.at(-1)))
  await execa('docker', ['rm', '--force', id])
  containers.delete(id)
  return result.exitCode
}

async function captureCrashDump(source: string, args: string[]): Promise<void> {
  // Only run this kernel-setting experiment on a disposable hosted x64 runner.
  if (
    process.env.GITHUB_ACTIONS !== 'true' ||
    process.platform !== 'linux' ||
    process.arch !== 'x64'
  ) {
    throw new Error('Crash dumps require the isolated GitHub x64 diagnostic job')
  }
  const previous = await execa('sysctl', ['-n', 'kernel.core_pattern'])
  await writeFile(join(output, 'core-pattern-before.log'), `${previous.stdout}\n`)
  const volume = (
    await execa('docker', ['volume', 'create', '--label', 'transloadit.diagnosis=510'])
  ).stdout.trim()
  volumes.add(volume)
  const mount = `type=volume,source=${volume},target=/work`
  await execa('sudo', ['-n', 'sysctl', '-w', 'kernel.core_pattern=edge.core'])
  try {
    let crashed = false
    for (let attempt = 1; attempt <= 30; attempt += 1) {
      const id = await createContainer([
        '--ulimit',
        'core=1073741824:1073741824',
        '--mount',
        mount,
        '--workdir',
        '/work',
        edgeImage,
        ...args,
      ])
      if (attempt === 1) await execa('docker', ['cp', `${source}/.`, `${id}:/work`])
      const result = await execa('docker', ['start', '--attach', id], {
        reject: false,
        timeout: 150_000,
      })
      const label = `core-attempt-${attempt}`
      probes.push({ label, exitCode: result.exitCode, durationMs: result.durationMs })
      await writeFile(join(output, `${label}.log`), `${result.stdout}\n${result.stderr}\n`)
      await capture(`${label}-state`, 'docker', ['inspect', '--format', '{{json .State}}', id])
      if (result.exitCode !== 0) {
        crashed = true
        break
      }
      await execa('docker', ['rm', id])
      containers.delete(id)
    }
    if (!crashed) return
    const debuggerId = await createContainer([
      '--entrypoint',
      '/bin/sleep',
      '--mount',
      mount,
      '--workdir',
      '/work',
      edgeImage,
      '900',
    ])
    await execa('docker', ['start', debuggerId])
    const core = await capture('core-file', 'docker', [
      'exec',
      debuggerId,
      'stat',
      '/work/edge.core',
    ])
    if (core !== 0) return
    await capture('core-packages-before', 'docker', ['exec', debuggerId, 'dpkg-query', '-W'])
    await capture('core-apt-update', 'docker', ['exec', debuggerId, 'apt-get', 'update'])
    const install = await capture('core-apt-install', 'docker', [
      'exec',
      debuggerId,
      'apt-get',
      'install',
      '-y',
      '--no-install-recommends',
      'gdb',
    ])
    if (install !== 0) return
    await capture('core-packages-after', 'docker', ['exec', debuggerId, 'dpkg-query', '-W'])
    await capture('core-backtrace', 'docker', [
      'exec',
      debuggerId,
      'gdb',
      '--batch',
      '-ex',
      'set pagination off',
      '-ex',
      'bt 40',
      '-ex',
      'thread apply all bt 12',
      '-ex',
      'info registers',
      '-ex',
      'p $_siginfo',
      '-ex',
      'x/12i $pc-24',
      '-ex',
      'info proc mappings',
      '/usr/local/bin/edge-runtime',
      '/work/edge.core',
    ])
    // Raw cores stay in this bounded disposable volume, not in CI artifacts.
  } finally {
    await execa('sudo', ['-n', 'sysctl', '-w', `kernel.core_pattern=${previous.stdout}`])
  }
}

async function main(): Promise<void> {
  await mkdir(output, { recursive: true })
  const temporary = await mkdtemp(join(tmpdir(), 'sdk-edge-diagnose-'))
  try {
    await capture('host-uname', 'uname', ['-a'])
    await capture('host-cpu', 'lscpu', [])
    await capture('host-memory', 'free', ['-m'])
    await capture('host-disk', 'df', ['-h', '/', '/dev/shm'])
    await capture('host-docker', 'docker', ['version'])
    await capture('host-kernel-before', 'sudo', ['-n', 'dmesg', '--level=err,warn'])
    await capture('host-limits', 'cat', ['/proc/self/limits', '/proc/sys/vm/mmap_rnd_bits'])
    await execa('docker', ['pull', edgeImage], { stdio: 'inherit' })
    await capture('image', 'docker', [
      'image',
      'inspect',
      '--format',
      '{{.Id}} {{.Architecture}} {{json .RepoDigests}}',
      edgeImage,
    ])
    const minimal = join(temporary, 'minimal')
    await mkdir(minimal)
    await writeFile(join(minimal, 'index.ts'), "Deno.serve(() => new Response('control'))\n")
    const bundleArgs = [
      'bundle',
      '--entrypoint',
      '/work/index.ts',
      '--output',
      '/work/function.eszip',
      '--timeout',
      '120',
    ]
    for (let attempt = 1; attempt <= 6; attempt += 1) {
      await probe(`version-${attempt}`, ['--version'], undefined)
      await probe(`minimal-${attempt}`, bundleArgs, minimal)
    }

    const consumer = join(temporary, 'consumer')
    await mkdir(consumer)
    const archive = join(temporary, 'sdk.tgz')
    await execa('corepack', ['yarn', 'workspace', '@transloadit/node', 'pack', '--out', archive], {
      cwd: repoRoot,
      stdio: 'inherit',
    })
    await writeFile(join(consumer, 'package.json'), '{"private":true,"type":"module"}\n')
    await execa('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund', archive], {
      cwd: consumer,
      stdio: 'inherit',
    })
    await cp(join(consumer, 'package-lock.json'), join(output, 'consumer-package-lock.json'))
    await cp(join(repoRoot, 'scripts/fixtures/sdk-edge/index.ts'), join(consumer, 'index.ts'))
    await writeFile(
      join(consumer, 'deno.json'),
      `${JSON.stringify({
        imports: { 'sdk-under-test': './node_modules/@transloadit/node/dist/Transloadit.js' },
        nodeModulesDir: 'manual',
        lock: false,
      })}\n`,
    )
    for (let attempt = 1; attempt <= 6; attempt += 1) {
      await probe(`sdk-${attempt}`, bundleArgs, consumer)
    }

    await captureCrashDump(consumer, bundleArgs)
    if (probes.some((result) => result.exitCode !== 0)) {
      // Diagnostics must never hide the original failure or make the old main run green.
      process.exitCode = 1
    }
    await capture('host-kernel-after', 'sudo', ['-n', 'dmesg', '--level=err,warn'])
    await writeFile(join(output, 'results.json'), `${JSON.stringify(probes, null, 2)}\n`)
    console.log(await readFile(join(output, 'results.json'), 'utf8'))
  } finally {
    for (const id of containers) {
      await execa('docker', ['rm', '--force', id], { reject: false })
    }
    for (const volume of volumes) {
      await execa('docker', ['volume', 'rm', volume], { reject: false })
    }
    await rm(temporary, { recursive: true, force: true })
  }
}

main().catch((error: unknown) => {
  console.error(error)
  process.exitCode = 1
})

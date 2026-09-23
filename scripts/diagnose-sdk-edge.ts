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

async function debug(source: string, args: string[]): Promise<void> {
  // Only this disposable container gains ptrace; no host mounts or credentials.
  const id = await createContainer([
    '--cap-add=SYS_PTRACE',
    '--entrypoint',
    '/bin/sleep',
    '--workdir',
    '/work',
    edgeImage,
    '900',
  ])
  await execa('docker', ['cp', `${source}/.`, `${id}:/work`])
  await execa('docker', ['start', id])
  await capture('debug-packages-before', 'docker', ['exec', id, 'dpkg-query', '-W'])
  await capture('debug-apt-update', 'docker', ['exec', id, 'apt-get', 'update'])
  const install = await capture('debug-apt-install', 'docker', [
    'exec',
    id,
    'apt-get',
    'install',
    '-y',
    '--no-install-recommends',
    'gdb',
    'strace',
  ])
  if (install !== 0) return
  await capture('debug-packages-after', 'docker', ['exec', id, 'dpkg-query', '-W'])
  await capture('debug-strace', 'docker', [
    'exec',
    id,
    'strace',
    '-f',
    '-o',
    '/tmp/edge.strace',
    '/usr/local/bin/edge-runtime',
    ...args,
  ])
  await execa('docker', ['cp', `${id}:/tmp/edge.strace`, join(output, 'edge.strace')])
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    await capture(`debug-gdb-${attempt}`, 'docker', [
      'exec',
      id,
      'gdb',
      '--batch',
      '-ex',
      'set pagination off',
      '-ex',
      'set disable-randomization off',
      '-ex',
      'handle SIGBUS stop print nopass',
      '-ex',
      'run',
      '-ex',
      'bt 30',
      '-ex',
      'info registers',
      '-ex',
      'p $_siginfo',
      '-ex',
      'x/12i $pc-24',
      '-ex',
      'info proc mappings',
      '--args',
      '/usr/local/bin/edge-runtime',
      ...args,
    ])
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

    const firstFailure = probes.find((result) => result.exitCode !== 0)
    if (firstFailure !== undefined) {
      const source = firstFailure.label.startsWith('sdk-') ? consumer : minimal
      const args = firstFailure.label.startsWith('version-') ? ['--version'] : bundleArgs
      for (let attempt = 1; attempt <= 3; attempt += 1) {
        await probe(`without-pku-${attempt}`, args, source, [
          '--env',
          'V8_FLAGS=--no-memory-protection-keys',
        ])
        await probe(`large-shm-${attempt}`, args, source, ['--shm-size=512m'])
        await probe(`control-after-${attempt}`, args, source)
      }
      await debug(source, args)
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
    await rm(temporary, { recursive: true, force: true })
  }
}

main().catch((error: unknown) => {
  console.error(error)
  process.exitCode = 1
})

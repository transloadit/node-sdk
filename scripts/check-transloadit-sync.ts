import { execFileSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const filePath = fileURLToPath(import.meta.url)
const repoRoot = resolve(dirname(filePath), '..')

function run(command: string, args: string[], cwd = repoRoot): string {
  return execFileSync(command, args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
}

function getTrackedTransloaditFiles(): string[] {
  const output = run('git', ['ls-files', '--', 'packages/transloadit'])
  return output
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '')
}

function getChangedFiles(files: string[]): string[] {
  if (files.length === 0) {
    return []
  }

  const output = run('git', ['diff', '--name-only', '--', ...files])
  return output
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '')
}

function main(): void {
  const trackedFiles = getTrackedTransloaditFiles()
  if (trackedFiles.length === 0) {
    return
  }

  run('node', [resolve(repoRoot, 'scripts/prepare-transloadit.ts')])

  const changedFiles = getChangedFiles(trackedFiles)
  if (changedFiles.length === 0) {
    return
  }

  console.error('The generated transloadit wrapper is out of sync with @transloadit/node.')
  console.error('')
  console.error('Changed tracked files:')
  for (const changedFile of changedFiles) {
    console.error(`- ${changedFile}`)
  }
  console.error('')
  console.error('To accept the generated wrapper updates:')
  console.error('  node scripts/prepare-transloadit.ts')
  console.error('  git add packages/transloadit')
  process.exit(1)
}

main()

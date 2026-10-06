import { resolve } from 'node:path'

import { expect, it, vi } from 'vitest'

const fixture = vi.hoisted(() => ({
  compile: vi.fn(() => ({ getSourceFile: () => ({}), emit: () => ({ diagnostics: [] }) })),
  files: new Map<string, string>(),
  remove: vi.fn(),
}))

vi.mock('typescript', () => ({
  createProgram: fixture.compile,
  formatDiagnostics: () => '',
  parseJsonConfigFileContent: () => ({ errors: [], options: {} }),
  readConfigFile: () => ({ config: {} }),
  sys: {},
}))
vi.mock('node:fs/promises', () => ({
  readFile: (file: string): Promise<string> => {
    const source = fixture.files.get(file)
    if (source === undefined) return Promise.reject(new Error(`Missing fixture file: ${file}`))
    return Promise.resolve(source)
  },
  rm: fixture.remove,
  writeFile: (file: string, source: string): Promise<void> => {
    fixture.files.set(file, source)
    return Promise.resolve()
  },
}))

it('only removes map references from existing compiler output, including on incremental builds', async () => {
  const directory = resolve(import.meta.dirname, '../packages/node/dist/generated-contract')
  const javascript = resolve(directory, 'client.js')
  const declaration = resolve(directory, 'client.d.ts')
  fixture.files.set(
    javascript,
    'export class ContractClient {}\n//# sourceMappingURL=client.js.map',
  )
  fixture.files.set(
    declaration,
    'export declare class ContractClient {}\n//# sourceMappingURL=client.d.ts.map\n',
  )

  await import('./prepare-contract-dist.ts')
  await vi.waitFor(() => expect(fixture.remove).toHaveBeenCalledTimes(2))
  expect(fixture.compile).not.toHaveBeenCalled()
  expect(fixture.files.get(javascript)).toBe('export class ContractClient {}\n')
  expect(fixture.files.get(declaration)).toBe('export declare class ContractClient {}\n')

  vi.resetModules()
  await import('./prepare-contract-dist.ts')
  await vi.waitFor(() => expect(fixture.remove).toHaveBeenCalledTimes(4))
  expect(fixture.compile).not.toHaveBeenCalled()
  expect(fixture.files.get(javascript)).toBe('export class ContractClient {}\n')
  expect(fixture.files.get(declaration)).toBe('export declare class ContractClient {}\n')
})

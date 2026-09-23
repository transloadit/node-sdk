import type { Node } from 'typescript'

import { readFile } from 'node:fs/promises'

import {
  createSourceFile,
  forEachChild,
  isArrayLiteralExpression,
  isCallExpression,
  isIdentifier,
  isStringLiteral,
  ScriptTarget,
} from 'typescript'
import { expect, test } from 'vitest'

test('the Edge bundler gets a bounded disposable cache without changing its command', async () => {
  const source = await readFile(new URL('./test-sdk-edge.ts', import.meta.url), 'utf8')
  const bundles: string[][] = []
  function visit(node: Node): void {
    if (
      isCallExpression(node) &&
      isIdentifier(node.expression) &&
      node.expression.text === 'execa'
    ) {
      const [command, args] = node.arguments
      if (
        command &&
        isStringLiteral(command) &&
        command.text === 'docker' &&
        args &&
        isArrayLiteralExpression(args)
      ) {
        const values = args.elements.filter(isStringLiteral).map((value) => value.text)
        if (values[0] === 'create' && values.includes('bundle')) bundles.push(values)
      }
    }
    forEachChild(node, visit)
  }
  visit(createSourceFile('test-sdk-edge.ts', source, ScriptTarget.Latest, true))
  // This protects the Docker invocation contract; the real fixture proves the packed SDK.
  expect(bundles).toHaveLength(1)
  expect(bundles[0]).toEqual([
    'create',
    '--workdir',
    '/work',
    '--tmpfs',
    '/root/.cache/deno:size=268435456',
    'bundle',
    '--entrypoint',
    '/work/index.ts',
    '--output',
    '/work/function.eszip',
    '--timeout',
    '120',
  ])
})

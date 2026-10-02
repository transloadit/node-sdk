import { readFile } from 'node:fs/promises'

import { describe, expect, it } from 'vitest'

import {
  AssemblyInstructionsCompileCommand,
  RunCommand,
} from '../../../src/cli/commands/assemblies.ts'
import { createCli } from '../../../src/cli/commands/index.ts'

async function documentedArguments(command: string): Promise<string[]> {
  const readme = await readFile(new URL('../../../README.md', import.meta.url), 'utf8')
  const example = readme.match(
    new RegExp(
      `^(?:npx(?: -y)? (?:@transloadit/node|transloadit) |transloadit )(${command} .+)$`,
      'm',
    ),
  )?.[1]
  if (example == null) {
    throw new Error(`README must include a command example for ${command}`)
  }

  // Shell redirection saves compile's stdout; it is not part of the CLI arguments.
  const invocation = example.split(' > ')[0]
  return [...invocation.matchAll(/"([^"]*)"|(\S+)/g)].map((match) => match[1] ?? match[2])
}

describe('README prompt commands', () => {
  it('documents a runnable run example with a prompt, input, and output', async () => {
    const command = createCli().process(await documentedArguments('run'))

    expect(command).toBeInstanceOf(RunCommand)
    expect(command).toMatchObject({
      prompt: expect.stringMatching(/\S/),
      inputs: [expect.stringMatching(/\S/)],
      outputPath: expect.stringMatching(/\S/),
    })
  })

  it('documents a runnable assembly-instructions compile example with a prompt', async () => {
    const command = createCli().process(await documentedArguments('assembly-instructions compile'))

    expect(command).toBeInstanceOf(AssemblyInstructionsCompileCommand)
    expect(command).toMatchObject({ prompt: expect.stringMatching(/\S/) })
  })
})

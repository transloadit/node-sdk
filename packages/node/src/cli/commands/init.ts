import { constants } from 'node:fs'
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'

import { Command, Option } from 'clipanion'
import { execa } from 'execa'

import packageJson from '../../../package.json' with { type: 'json' }
import { quoteCliArgument } from '../helpers.ts'
import { isErrnoException } from '../types.ts'
import { UnauthenticatedCommand } from './BaseCommand.ts'

/** Creates the shipped, tested example without uploading or changing an existing project. */
export class InitCommand extends UnauthenticatedCommand {
  static override paths = [['init']]
  static override usage = Command.Usage({
    category: 'Getting started',
    description: 'Create a runnable upload-once example in a new directory',
    examples: [['Create an example', 'transloadit init upload-once my-gallery']],
  })

  example = Option.String({ required: true })
  directory = Option.String({ required: true })
  install = Option.Boolean('--install', true, {
    description: 'Install dependencies with npm; --no-install only creates the files',
  })

  protected async run(): Promise<number | undefined> {
    if (this.example !== 'upload-once') {
      this.output.error(
        'Available example: upload-once. Run transloadit init upload-once my-gallery.',
      )
      return 1
    }
    const destination = resolve(this.directory)
    const example = new URL('../../../examples/upload-once/', import.meta.url)
    const manifest = {
      name: 'transloadit-upload-once',
      private: true,
      type: 'module',
      scripts: { demo: 'node demo.ts' },
      engines: { node: '^24.15.0 || >=26.0.0' },
      dependencies: {
        // The linked node/legacy release group has packed-fixture coverage for version parity.
        '@transloadit/node': packageJson.version,
        execa: packageJson.dependencies.execa,
        zod: packageJson.dependencies.zod,
      },
      devDependencies: { '@types/node': packageJson.devDependencies['@types/node'] },
    }

    try {
      // Read the release's example before creating anything. Never fetch mutable tutorial code.
      const files = await Promise.all(
        ['demo.ts', 'README.md'].map(async (name) => ({
          name,
          content: await readFile(new URL(name, example)),
        })),
      )
      await mkdir(destination)
      for (const { name, content } of files)
        await writeFile(join(destination, name), content, { flag: 'wx' })
      await copyFile(
        new URL('../fixtures/berkley.jpg', example),
        join(destination, 'photo.jpg'),
        constants.COPYFILE_EXCL,
      )
      await writeFile(join(destination, 'package.json'), `${JSON.stringify(manifest, null, 2)}\n`, {
        flag: 'wx',
      })
      await writeFile(
        join(destination, '.gitignore'),
        'node_modules/\n.env*\ngallery.html\ntransloadit.images.json\ntransloadit-images.d.ts\n',
        { flag: 'wx' },
      )
    } catch (error) {
      this.output.error(
        isErrnoException(error) && error.code === 'EEXIST'
          ? 'The destination already exists. Choose a new directory; existing files were not overwritten.'
          : 'Could not create the example. Check the parent directory and permissions; partial files are kept for inspection.',
      )
      return 1
    }

    // Manual recovery must keep the same workspace/lifecycle isolation as the automatic install.
    const manualInstall = 'npm install --prefix . --ignore-scripts'
    if (this.install) {
      const result = await execa(
        'npm',
        // An explicit prefix prevents npm from modifying an ancestor workspace's lockfile.
        ['install', '--prefix', destination, '--ignore-scripts', '--no-audit', '--no-fund'],
        {
          cwd: destination,
          stdin: 'ignore',
          stdout: this.json ? 'ignore' : 'inherit',
          stderr: 'inherit',
          timeout: 120_000,
          reject: false,
        },
      )
      if (result.failed) {
        this.output.error(
          `Dependency installation failed. The example is saved; run ${manualInstall} in its directory, then npm run demo.`,
        )
        return 1
      }
    }
    this.output.print(
      `Created ${destination}. No files were uploaded or published.\n\ncd ${quoteCliArgument(destination)}\n${this.install ? '' : `${manualInstall}\n`}npm run demo\n\nThe demo opens browser login when needed, then uploads one image. Storage must be enabled for your workspace.`,
      { directory: destination, example: this.example, installed: this.install },
    )
    return undefined
  }
}

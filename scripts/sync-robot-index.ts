import { execFileSync } from 'node:child_process'
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

import ts from 'typescript'

interface RobotModule {
  file: string
  metadataKey: string
  schema: string
  hiddenFieldsSchema: string
  types: string[]
}

// Instruction visibility differs from meta.isInternal, which controls runtime queueing in API2.
const hiddenRobotFiles = new Set(['file-watermark.ts', 'meta-read.ts', 'progress-simulate.ts'])
const runtimeOnlyRobotFile = 'assembly-savejson.ts'

function bindingNames(name: ts.BindingName): string[] {
  if (ts.isIdentifier(name)) return [name.text]
  return name.elements.flatMap((element) =>
    ts.isBindingElement(element) ? bindingNames(element.name) : [],
  )
}

function exportedNames(source: ts.SourceFile): string[] {
  return source.statements.flatMap((statement) => {
    if (
      !ts.canHaveModifiers(statement) ||
      !ts.getModifiers(statement)?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)
    )
      return []
    if (ts.isVariableStatement(statement)) {
      return statement.declarationList.declarations.flatMap((declaration) =>
        bindingNames(declaration.name),
      )
    }
    if (ts.isTypeAliasDeclaration(statement) || ts.isInterfaceDeclaration(statement)) {
      return [statement.name.text]
    }
    return []
  })
}

function instructionSchema(names: string[], file: string): string {
  const schemas = names.filter((name) => /^interpolatableRobot\w+InstructionsSchema$/.test(name))
  const [schema] = schemas
  if (schemas.length !== 1 || schema === undefined || !names.includes('meta')) {
    throw new Error(`Expected one interpolatable Robot schema and metadata in ${file}`)
  }
  return schema
}

function renderArray(name: string, values: string[]): string {
  return `const ${name}: RobotSchemaOptions = [\n${values.map((value) => `  ${value},`).join('\n')}\n]`
}

/** Regenerate SDK membership while retaining its declaration-compatible schema wrappers. */
export async function syncRobotIndex(directory: string): Promise<void> {
  const indexPath = resolve(directory, '_index.ts')
  const index = await readFile(indexPath, 'utf8')
  const source = ts.createSourceFile(indexPath, index, ts.ScriptTarget.Latest, true)
  const files = (await readdir(directory))
    .filter((file) => file.endsWith('.ts') && !file.startsWith('_') && !file.endsWith('.test.ts'))
    .sort()
  const modules: RobotModule[] = []
  for (const file of files) {
    const contents = await readFile(resolve(directory, file), 'utf8')
    const names = exportedNames(ts.createSourceFile(file, contents, ts.ScriptTarget.Latest, true))
    const schema = instructionSchema(names, file)
    const hiddenFieldsSchema = schema.replace(
      'InstructionsSchema',
      'InstructionsWithHiddenFieldsSchema',
    )
    modules.push({
      file,
      metadataKey: `${file.slice(0, -3).replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase())}Meta`,
      schema,
      hiddenFieldsSchema: names.includes(hiddenFieldsSchema) ? hiddenFieldsSchema : schema,
      types: names.filter(
        (name) => name.startsWith('InterpolatableRobot') && !name.endsWith('Schema'),
      ),
    })
  }

  const publicModules = modules.filter(
    (robot) => !hiddenRobotFiles.has(robot.file) && robot.file !== runtimeOnlyRobotFile,
  )
  const instructionModules = modules.filter((robot) => robot.file !== runtimeOnlyRobotFile)
  const imports = instructionModules
    .map((robot) => {
      const names = [...new Set([robot.schema, robot.hiddenFieldsSchema])]
      if (!hiddenRobotFiles.has(robot.file)) names.push(`meta as ${robot.metadataKey}`)
      return `import {\n${names.map((name) => `  ${name},`).join('\n')}\n} from './${robot.file}'`
    })
    .join('\n')
  // The legacy hidden-field editor view also accepts the private watermark Robot.
  const watermark = modules.find((robot) => robot.file === 'file-watermark.ts')
  const hiddenFieldsSchemas = publicModules.map((robot) => robot.hiddenFieldsSchema)
  if (watermark !== undefined) hiddenFieldsSchemas.push(watermark.hiddenFieldsSchema)
  const generatedStatements = new Map([
    [
      'robotStepsInstructions',
      renderArray(
        'robotStepsInstructions',
        publicModules.map((robot) => robot.schema),
      ),
    ],
    [
      'robotStepsInstructionsWithHiddenFields',
      renderArray('robotStepsInstructionsWithHiddenFields', hiddenFieldsSchemas),
    ],
    [
      'robotsMeta',
      `export const robotsMeta = {\n${publicModules.map((robot) => `  ${robot.metadataKey},`).join('\n')}\n}`,
    ],
  ])
  const typeExports = modules
    .map(
      (robot) =>
        `export type {\n${robot.types.map((name) => `  ${name},`).join('\n')}\n} from './${robot.file}'`,
    )
    .join('\n')
  const robotImports = source.statements.filter(
    (statement) =>
      ts.isImportDeclaration(statement) &&
      ts.isStringLiteral(statement.moduleSpecifier) &&
      /^\.\/(?!_).+\.ts$/.test(statement.moduleSpecifier.text),
  )
  const robotExports = source.statements.filter(
    (statement) =>
      ts.isExportDeclaration(statement) &&
      statement.isTypeOnly &&
      statement.moduleSpecifier !== undefined &&
      ts.isStringLiteral(statement.moduleSpecifier) &&
      /^\.\/(?!_).+\.ts$/.test(statement.moduleSpecifier.text),
  )
  const replacements: { start: number; end: number; text: string }[] = []
  for (const [statements, text] of [
    [robotImports, imports],
    [robotExports, typeExports],
  ] satisfies [ts.Statement[], string][]) {
    const first = statements[0]
    const last = statements.at(-1)
    if (first === undefined || last === undefined)
      throw new Error(`Missing Robot import/export section in ${indexPath}`)
    replacements.push({ start: first.getStart(source), end: last.end, text })
  }
  for (const statement of source.statements) {
    if (!ts.isVariableStatement(statement)) continue
    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name)) continue
      const text = generatedStatements.get(declaration.name.text)
      if (text === undefined) continue
      replacements.push({ start: statement.getStart(source), end: statement.end, text })
      generatedStatements.delete(declaration.name.text)
    }
  }
  if (generatedStatements.size > 0)
    throw new Error(`Missing Robot registry sections in ${indexPath}`)

  let generated = index
  for (const replacement of replacements.sort((left, right) => right.start - left.start)) {
    generated =
      generated.slice(0, replacement.start) + replacement.text + generated.slice(replacement.end)
  }
  // Use the repository formatter so a later build does not dirty the checked-in index again.
  const formatted = execFileSync(
    resolve(import.meta.dirname, '../node_modules/.bin/biome'),
    ['format', '--stdin-file-path', indexPath],
    { input: generated, encoding: 'utf8' },
  )
  if (formatted !== index) await writeFile(indexPath, formatted)
}

if (
  process.argv[1] !== undefined &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url
) {
  await syncRobotIndex(resolve(import.meta.dirname, '../packages/node/src/alphalib/types/robots'))
}

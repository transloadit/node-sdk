import { mkdir, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const filePath = fileURLToPath(import.meta.url)
const typesRoot = resolve(dirname(filePath), '..')
const schemaRoot = resolve(typesRoot, '../node/src/alphalib/types')
const outputRoot = resolve(typesRoot, 'src/generated')

const compilerOptions: ts.CompilerOptions = {
  module: ts.ModuleKind.NodeNext,
  target: ts.ScriptTarget.ES2022,
  moduleResolution: ts.ModuleResolutionKind.NodeNext,
  allowImportingTsExtensions: true,
  strict: true,
  noEmit: true,
}

const typeFormatFlags =
  ts.TypeFormatFlags.NoTruncation |
  ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope |
  ts.TypeFormatFlags.UseSingleQuotesForStringLiteralType

const zodTypeOperators = new Set(['infer', 'input', 'output', 'TypeOf'])
const zodPathToken = `${sep}node_modules${sep}zod${sep}`
const libPathToken = `${sep}node_modules${sep}typescript${sep}lib${sep}`

const isExported = (node: ts.Node): boolean => {
  const flags = ts.getCombinedModifierFlags(node)
  return (flags & ts.ModifierFlags.Export) !== 0
}

const collectFiles = async (dir: string, acc: string[] = []): Promise<string[]> => {
  const entries = await readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      await collectFiles(full, acc)
      continue
    }
    if (entry.isFile() && entry.name.endsWith('.ts')) {
      acc.push(full)
    }
  }
  return acc
}

const ensureDir = async (dir: string) => {
  await mkdir(dir, { recursive: true })
}

const isZodTypeNode = (node: ts.TypeNode): boolean => {
  let found = false
  const visit = (current: ts.Node) => {
    if (found) return
    if (ts.isTypeReferenceNode(current)) {
      const typeName = current.typeName
      if (
        ts.isQualifiedName(typeName) &&
        ts.isIdentifier(typeName.left) &&
        typeName.left.text === 'z' &&
        zodTypeOperators.has(typeName.right.text)
      ) {
        found = true
        return
      }
    }
    current.forEachChild(visit)
  }
  visit(node)
  return found
}

const isSymbolFromPath = (symbol: ts.Symbol | undefined, token: string): boolean => {
  if (!symbol?.declarations?.length) return false
  return symbol.declarations.some((decl) => decl.getSourceFile().fileName.includes(token))
}

const isZodSymbol = (symbol: ts.Symbol | undefined): boolean =>
  isSymbolFromPath(symbol, zodPathToken)
const isLibSymbol = (symbol: ts.Symbol | undefined): boolean =>
  isSymbolFromPath(symbol, libPathToken)

const isZodText = (value: string): boolean =>
  value.includes('Zod') || value.includes('objectOutputType') || value.includes('objectInputType')

const shouldUseTypeToString = (type: ts.Type, checker: ts.TypeChecker): boolean => {
  if (hasZodType(type, checker, new Set())) {
    return false
  }
  const text = checker.typeToString(type, undefined, typeFormatFlags)
  return !isZodText(text)
}

const hasZodType = (type: ts.Type, checker: ts.TypeChecker, seen: Set<ts.Type>): boolean => {
  if (seen.has(type)) return false
  seen.add(type)

  const symbol = type.aliasSymbol ?? type.symbol
  if (isZodSymbol(symbol)) return true

  if (type.isUnion()) {
    return type.types.some((entry) => hasZodType(entry, checker, seen))
  }

  if (type.isIntersection()) {
    return type.types.some((entry) => hasZodType(entry, checker, seen))
  }

  if (checker.isTupleType(type)) {
    const tupleType = type as ts.TupleTypeReference
    return checker.getTypeArguments(tupleType).some((entry) => hasZodType(entry, checker, seen))
  }

  if (checker.isArrayType(type)) {
    const elementType = checker.getElementTypeOfArrayType(type)
    return elementType ? hasZodType(elementType, checker, seen) : false
  }

  if (type.aliasTypeArguments?.length) {
    return type.aliasTypeArguments.some((entry) => hasZodType(entry, checker, seen))
  }

  const apparent = checker.getApparentType(type)
  const properties = checker.getPropertiesOfType(apparent)
  for (const prop of properties) {
    const propDecl = prop.valueDeclaration ?? prop.declarations?.[0]
    if (!propDecl) {
      continue
    }
    const propType = checker.getTypeOfSymbolAtLocation(prop, propDecl)
    if (propType && hasZodType(propType, checker, seen)) {
      return true
    }
  }

  const stringIndex = checker.getIndexTypeOfType(apparent, ts.IndexKind.String)
  if (stringIndex && hasZodType(stringIndex, checker, seen)) {
    return true
  }
  const numberIndex = checker.getIndexTypeOfType(apparent, ts.IndexKind.Number)
  if (numberIndex && hasZodType(numberIndex, checker, seen)) {
    return true
  }

  return false
}

export const escapeStringLiteral = (value: string): string =>
  value
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')
    .replace(/\t/g, '\\t')

const formatPropertyName = (name: string): string => {
  if (ts.isIdentifierText(name, ts.ScriptTarget.ES2022)) {
    return name
  }
  return `'${escapeStringLiteral(name)}'`
}

const compareByPropertyOrder = (a: ts.Symbol, b: ts.Symbol): number => {
  const aDecl = a.valueDeclaration ?? a.declarations?.[0]
  const bDecl = b.valueDeclaration ?? b.declarations?.[0]
  const aFile = aDecl?.getSourceFile().fileName ?? ''
  const bFile = bDecl?.getSourceFile().fileName ?? ''
  if (aFile !== bFile) {
    return aFile < bFile ? -1 : 1
  }
  const aPos = aDecl?.pos ?? Number.MAX_SAFE_INTEGER
  const bPos = bDecl?.pos ?? Number.MAX_SAFE_INTEGER
  if (aPos !== bPos) {
    return aPos - bPos
  }
  const aName = a.getName()
  const bName = b.getName()
  if (aName === bName) return 0
  return aName < bName ? -1 : 1
}

const TypePrecedence = {
  Union: 1,
  Intersection: 2,
  Primary: 3,
} as const

type TypePrecedence = (typeof TypePrecedence)[keyof typeof TypePrecedence]

const wrap = (value: string, precedence: TypePrecedence, parent: TypePrecedence): string =>
  precedence < parent ? `(${value})` : value

const renderType = (
  type: ts.Type,
  checker: ts.TypeChecker,
  fallbackNode: ts.Node,
  inProgress: Set<ts.Type>,
): { text: string; precedence: TypePrecedence } => {
  if (inProgress.has(type)) {
    return {
      text: checker.typeToString(type, undefined, typeFormatFlags),
      precedence: TypePrecedence.Primary,
    }
  }

  if (type.isUnion()) {
    const parts = type.types.map((subType) => {
      const rendered = renderType(subType, checker, fallbackNode, inProgress)
      return wrap(rendered.text, rendered.precedence, TypePrecedence.Union)
    })
    return { text: parts.join(' | '), precedence: TypePrecedence.Union }
  }

  if (type.isIntersection()) {
    const parts = type.types.map((subType) => {
      const rendered = renderType(subType, checker, fallbackNode, inProgress)
      return wrap(rendered.text, rendered.precedence, TypePrecedence.Intersection)
    })
    return { text: parts.join(' & '), precedence: TypePrecedence.Intersection }
  }

  if (type.isLiteral()) {
    if (typeof type.value === 'string') {
      return { text: `'${escapeStringLiteral(type.value)}'`, precedence: TypePrecedence.Primary }
    }
    return { text: String(type.value), precedence: TypePrecedence.Primary }
  }
  if (type.flags & ts.TypeFlags.BooleanLiteral) {
    return { text: type.intrinsicName, precedence: TypePrecedence.Primary }
  }

  if (type.flags & ts.TypeFlags.String) {
    return { text: 'string', precedence: TypePrecedence.Primary }
  }
  if (type.flags & ts.TypeFlags.Number) {
    return { text: 'number', precedence: TypePrecedence.Primary }
  }
  if (type.flags & ts.TypeFlags.Boolean) {
    return { text: 'boolean', precedence: TypePrecedence.Primary }
  }
  if (type.flags & ts.TypeFlags.BigInt) {
    return { text: 'bigint', precedence: TypePrecedence.Primary }
  }
  if (type.flags & ts.TypeFlags.Null) {
    return { text: 'null', precedence: TypePrecedence.Primary }
  }
  if (type.flags & ts.TypeFlags.Undefined) {
    return { text: 'undefined', precedence: TypePrecedence.Primary }
  }
  if (type.flags & ts.TypeFlags.Void) {
    return { text: 'void', precedence: TypePrecedence.Primary }
  }
  if (type.flags & ts.TypeFlags.Any) {
    return { text: 'any', precedence: TypePrecedence.Primary }
  }
  if (type.flags & ts.TypeFlags.Unknown) {
    return { text: 'unknown', precedence: TypePrecedence.Primary }
  }
  if (type.flags & ts.TypeFlags.Never) {
    return { text: 'never', precedence: TypePrecedence.Primary }
  }

  if (checker.isTupleType(type)) {
    const tupleType = type as ts.TupleTypeReference
    const elements = checker.getTypeArguments(tupleType)
    const rendered = elements.map((entry) => renderType(entry, checker, fallbackNode, inProgress))
    const text = `[${rendered.map((entry) => entry.text).join(', ')}]`
    return { text, precedence: TypePrecedence.Primary }
  }

  if (checker.isArrayType(type)) {
    const elementType = checker.getElementTypeOfArrayType(type)
    if (elementType) {
      const rendered = renderType(elementType, checker, fallbackNode, inProgress)
      return { text: `Array<${rendered.text}>`, precedence: TypePrecedence.Primary }
    }
  }

  const callSignatures = type.getCallSignatures()
  if (callSignatures.length > 0) {
    const signatureText = checker.signatureToString(
      callSignatures[0],
      undefined,
      typeFormatFlags,
      ts.SignatureKind.Call,
    )
    return { text: signatureText, precedence: TypePrecedence.Primary }
  }

  const aliasSymbol = type.aliasSymbol
  const symbol = type.symbol ?? type.aliasSymbol
  if (aliasSymbol && !isZodSymbol(aliasSymbol) && shouldUseTypeToString(type, checker)) {
    return {
      text: checker.typeToString(type, undefined, typeFormatFlags),
      precedence: TypePrecedence.Primary,
    }
  }

  if (symbol && isLibSymbol(symbol) && shouldUseTypeToString(type, checker)) {
    return {
      text: checker.typeToString(type, undefined, typeFormatFlags),
      precedence: TypePrecedence.Primary,
    }
  }

  const apparent = checker.getApparentType(type)
  const properties = checker.getPropertiesOfType(apparent).sort(compareByPropertyOrder)
  const stringIndex = checker.getIndexTypeOfType(apparent, ts.IndexKind.String)
  const numberIndex = checker.getIndexTypeOfType(apparent, ts.IndexKind.Number)

  if (properties.length > 0 || stringIndex || numberIndex) {
    const entries: string[] = []
    if (stringIndex) {
      const rendered = renderType(stringIndex, checker, fallbackNode, inProgress)
      entries.push(`[key: string]: ${rendered.text}`)
    }
    if (numberIndex) {
      const rendered = renderType(numberIndex, checker, fallbackNode, inProgress)
      entries.push(`[key: number]: ${rendered.text}`)
    }
    inProgress.add(type)
    try {
      for (const prop of properties) {
        const propDecl = prop.valueDeclaration ?? prop.declarations?.[0]
        const propType = checker.getTypeOfSymbolAtLocation(prop, propDecl ?? fallbackNode)
        const rendered = renderType(propType, checker, fallbackNode, inProgress)
        const optional = prop.flags & ts.SymbolFlags.Optional ? '?' : ''
        entries.push(`${formatPropertyName(prop.getName())}${optional}: ${rendered.text}`)
      }
      const text = `{ ${entries.join('; ')} }`
      return { text, precedence: TypePrecedence.Primary }
    } finally {
      inProgress.delete(type)
    }
  }

  return {
    text: checker.typeToString(type, undefined, typeFormatFlags),
    precedence: TypePrecedence.Primary,
  }
}

const generateFile = (sourceFile: ts.SourceFile, checker: ts.TypeChecker): string => {
  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed })
  const lines: string[] = ['// This file is generated. Do not edit.']

  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement)) continue
    if (!statement.importClause?.isTypeOnly) continue
    lines.push(printer.printNode(ts.EmitHint.Unspecified, statement, sourceFile))
  }

  if (lines.length > 1) {
    lines.push('')
  }

  for (const statement of sourceFile.statements) {
    if (ts.isTypeAliasDeclaration(statement) && isExported(statement)) {
      if (isZodTypeNode(statement.type)) {
        const type = checker.getTypeFromTypeNode(statement.type)
        const rendered = renderType(type, checker, sourceFile, new Set())
        lines.push(`export type ${statement.name.text} = ${rendered.text}`)
      } else {
        lines.push(printer.printNode(ts.EmitHint.Unspecified, statement, sourceFile))
      }
      continue
    }

    if (ts.isInterfaceDeclaration(statement) && isExported(statement)) {
      lines.push(printer.printNode(ts.EmitHint.Unspecified, statement, sourceFile))
      continue
    }

    if (ts.isEnumDeclaration(statement) && isExported(statement)) {
      lines.push(printer.printNode(ts.EmitHint.Unspecified, statement, sourceFile))
      continue
    }

    if (ts.isExportDeclaration(statement) && statement.isTypeOnly) {
      lines.push(printer.printNode(ts.EmitHint.Unspecified, statement, sourceFile))
    }
  }

  return `${lines.join('\n')}\n`
}

export const normalizeExportPath = (relPath: string): string => {
  const trimmed = relPath.endsWith('.ts') ? relPath.slice(0, -3) : relPath
  return trimmed.replace(/\\/g, '/')
}

const main = async () => {
  const schemaStats = await stat(schemaRoot).catch(() => null)
  if (!schemaStats?.isDirectory()) {
    throw new Error(`Missing Zod schemas at ${schemaRoot}.`)
  }

  const schemaFiles = await collectFiles(schemaRoot)
  if (schemaFiles.length === 0) {
    throw new Error(`No schema files found under ${schemaRoot}`)
  }

  await rm(outputRoot, { recursive: true, force: true })
  await ensureDir(outputRoot)

  const program = ts.createProgram(schemaFiles, compilerOptions)
  const checker = program.getTypeChecker()

  const indexExports: string[] = ['// This file is generated. Do not edit.']

  for (const file of schemaFiles) {
    const sourceFile = program.getSourceFile(file)
    if (!sourceFile) continue
    const rel = relative(schemaRoot, file)
    const outFile = join(outputRoot, rel)
    await ensureDir(dirname(outFile))
    const content = generateFile(sourceFile, checker)
    await writeFile(outFile, content, 'utf8')

    const exportPath = normalizeExportPath(rel)
    if (exportPath.endsWith('/index')) {
      continue
    }
    indexExports.push(`export * from './${exportPath}.js'`)
  }

  await writeFile(join(outputRoot, 'index.ts'), `${indexExports.join('\n')}\n`, 'utf8')
}

await main()

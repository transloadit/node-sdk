import type { IOutputCtl } from './OutputCtl.ts'
import type { NormalizedAssemblyResults } from './resultFiles.ts'
import { normalizeAssemblyResults } from './resultFiles.ts'

export interface ResultUrlRow {
  assemblyId: string
  name: string
  step: string
  url: string
}

export function collectResultUrlRows({
  assemblyId,
  results,
}: {
  assemblyId: string
  results: unknown
}): ResultUrlRow[] {
  return collectNormalizedResultUrlRows({
    assemblyId,
    normalizedResults: normalizeAssemblyResults(results),
  })
}

export function collectNormalizedResultUrlRows({
  assemblyId,
  normalizedResults,
}: {
  assemblyId: string
  normalizedResults: NormalizedAssemblyResults
}): ResultUrlRow[] {
  return normalizedResults.allFiles.map((file) => ({
    assemblyId,
    step: file.stepName,
    name: file.name,
    url: file.url,
  }))
}

export function formatResultUrlRows(rows: readonly ResultUrlRow[]): string {
  if (rows.length === 0) {
    return ''
  }

  const includeAssembly = new Set(rows.map((row) => row.assemblyId)).size > 1
  const headers = includeAssembly ? ['ASSEMBLY', 'STEP', 'NAME', 'URL'] : ['STEP', 'NAME', 'URL']
  const tableRows = rows.map((row) =>
    includeAssembly ? [row.assemblyId, row.step, row.name, row.url] : [row.step, row.name, row.url],
  )

  const widths = headers.map((header, index) =>
    Math.max(header.length, ...tableRows.map((row) => row[index]?.length ?? 0)),
  )

  return [headers, ...tableRows]
    .map((row) =>
      row
        .map((value, index) =>
          index === row.length - 1 ? value : value.padEnd(widths[index] ?? value.length),
        )
        .join('  '),
    )
    .join('\n')
}

export function printResultUrls(output: IOutputCtl, rows: readonly ResultUrlRow[]): void {
  if (rows.length === 0) {
    return
  }

  output.print(formatResultUrlRows(rows), { urls: rows })
}

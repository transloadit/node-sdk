import type { IOutputCtl } from './OutputCtl.ts'

export interface ResultUrlRow {
  assemblyId: string
  name: string
  step: string
  url: string
}

interface ResultFileLike {
  basename?: unknown
  name?: unknown
  ssl_url?: unknown
  url?: unknown
}

function isResultFileLike(value: unknown): value is ResultFileLike {
  return value != null && typeof value === 'object'
}

export function collectResultUrlRows({
  assemblyId,
  results,
}: {
  assemblyId: string
  results: unknown
}): ResultUrlRow[] {
  if (results == null || typeof results !== 'object' || Array.isArray(results)) {
    return []
  }

  const rows: ResultUrlRow[] = []

  for (const [step, files] of Object.entries(results)) {
    if (!Array.isArray(files)) {
      continue
    }

    for (const file of files) {
      if (!isResultFileLike(file)) {
        continue
      }

      const url =
        typeof file.ssl_url === 'string'
          ? file.ssl_url
          : typeof file.url === 'string'
            ? file.url
            : null
      const name =
        typeof file.name === 'string'
          ? file.name
          : typeof file.basename === 'string'
            ? file.basename
            : null

      if (url == null || name == null) {
        continue
      }

      rows.push({
        assemblyId,
        step,
        name,
        url,
      })
    }
  }

  return rows
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

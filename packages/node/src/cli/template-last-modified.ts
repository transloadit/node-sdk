import type { Transloadit } from '../Transloadit.ts'
import { ensureError } from './types.ts'

interface TemplateItem {
  id: string
  modified: string
}

type FetchCallback<T> = (err: Error | null, result?: T) => void
type PageFetcher<T> = (page: number, pagesize: number, cb: FetchCallback<T[]>) => void

class MemoizedPagination<T> {
  private pagesize: number
  private fetch: PageFetcher<T>
  private cache: (T | undefined)[]

  constructor(pagesize: number, fetch: PageFetcher<T>) {
    this.pagesize = pagesize
    this.fetch = fetch
    this.cache = []
  }

  get(i: number, cb: FetchCallback<T>): void {
    const cached = this.cache[i]
    if (cached !== undefined) {
      process.nextTick(() => cb(null, cached))
      return
    }

    const page = Math.floor(i / this.pagesize) + 1
    const start = (page - 1) * this.pagesize

    this.fetch(page, this.pagesize, (err, result) => {
      if (err) {
        cb(err)
        return
      }
      if (!result) {
        cb(new Error('No result returned from fetch'))
        return
      }
      for (let j = 0; j < this.pagesize; j++) {
        this.cache[start + j] = result[j]
      }
      cb(null, this.cache[i])
    })
  }
}

export default class ModifiedLookup {
  private byOrdinal: MemoizedPagination<TemplateItem>

  constructor(client: Transloadit, pagesize = 50) {
    this.byOrdinal = new MemoizedPagination<TemplateItem>(pagesize, (page, pagesize, cb) => {
      const params = {
        sort: 'id' as const,
        order: 'asc' as const,
        fields: ['id', 'modified'] as ('id' | 'modified')[],
        page,
        pagesize,
      }

      client
        .listTemplates(params)
        .then((result) => {
          const items: TemplateItem[] = new Array(pagesize)
          // Fill with sentinel value larger than any hex ID
          items.fill({ id: 'gggggggggggggggggggggggggggggggg', modified: '' })
          for (let i = 0; i < result.items.length; i++) {
            const item = result.items[i]
            if (item) {
              const modified = typeof item.modified === 'string' ? item.modified : ''
              items[i] = { id: item.id, modified }
            }
          }
          cb(null, items)
        })
        .catch((err: unknown) => {
          cb(ensureError(err))
        })
    })
  }

  private idByOrd(ord: number, cb: FetchCallback<string>): void {
    this.byOrdinal.get(ord, (err, result) => {
      if (err) {
        cb(err)
        return
      }
      if (!result) {
        cb(new Error('No result found'))
        return
      }
      cb(null, result.id)
    })
  }

  byId(id: string, cb: FetchCallback<Date>): void {
    const findUpperBound = (bound: number): void => {
      this.idByOrd(bound, (err, idAtBound) => {
        if (err) {
          cb(err)
          return
        }
        if (idAtBound === id) {
          complete(bound)
          return
        }
        if (idAtBound && idAtBound > id) {
          refine(Math.floor(bound / 2), bound)
          return
        }
        findUpperBound(bound * 2)
      })
    }

    const refine = (lower: number, upper: number): void => {
      if (lower >= upper - 1) {
        cb(new Error(`Template ID ${id} not found in ModifiedLookup`))
        return
      }

      const middle = Math.floor((lower + upper) / 2)
      this.idByOrd(middle, (err, idAtMiddle) => {
        if (err) {
          cb(err)
          return
        }
        if (idAtMiddle === id) {
          complete(middle)
          return
        }
        if (idAtMiddle && idAtMiddle < id) {
          refine(middle, upper)
          return
        }
        refine(lower, middle)
      })
    }

    const complete = (ord: number): void => {
      this.byOrdinal.get(ord, (err, result) => {
        if (err) {
          cb(err)
          return
        }
        if (!result) {
          cb(new Error('No result found'))
          return
        }
        cb(null, new Date(result.modified))
      })
    }

    findUpperBound(1)
  }
}

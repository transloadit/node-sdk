// Run this file as:
//
//   env TRANSLOADIT_KEY=xxx TRANSLOADIT_SECRET=yyy node fetch_costs_of_all_assemblies_in_timeframe.js
//
// You may need to build the project first using:
//
//   yarn prepack
//
import pMap from 'p-map'
import { Transloadit } from 'transloadit'

const fromdate = '2020-12-31 15:30:00'
const todate = '2020-12-31 15:30:01'

const params = {
  fromdate,
  todate,
  page: 1,
}

const transloadit = new Transloadit({
  authKey: process.env.TRANSLOADIT_KEY!,
  authSecret: process.env.TRANSLOADIT_SECRET!,
})

let totalBytes = 0

let lastCount
do {
  console.log('Processing page', params.page)
  const { count, items } = await transloadit.listAssemblies(params)
  lastCount = count
  params.page++

  await pMap(
    items,
    // eslint-disable-next-line no-loop-func
    async (assembly) => {
      const assemblyFull = await transloadit.getAssembly(assembly.id)
      // console.log(assemblyFull.assembly_id)

      const { bytes_usage: bytesUsage } = assemblyFull

      totalBytes += bytesUsage || 0
    },
    { concurrency: 20 },
  )
} while (lastCount > 0)

console.log('Total GB:', (totalBytes / (1024 * 1024 * 1024)).toFixed(2))

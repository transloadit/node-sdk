// Run this file as:
//
//   env TRANSLOADIT_KEY=xxx TRANSLOADIT_SECRET=yyy node fetch_costs_of_all_assemblies_in_timeframe.js
//
// make sure to "npm install p-map" for this demo
const pMap = require('p-map')

// You'll likely just want to `require('transloadit')`, but we're requiring the local
// variant here for easier testing:
const Transloadit = require('../src/Transloadit')

const fromdate = '2020-12-31 15:30:00'
const todate = '2020-12-31 15:30:01';

(async () => {
  try {
    const params = {
      fromdate,
      todate,
      page: 1,
    }

    const transloadit = new Transloadit({
      authKey   : process.env.TRANSLOADIT_KEY,
      authSecret: process.env.TRANSLOADIT_SECRET,
    })

    let totalBytes = 0

    let lastCount
    do {
      console.log('Processing page', params.page)
      const { count, items } = await transloadit.listAssemblies(params)
      lastCount = count
      params.page++

      // eslint-disable-next-line no-loop-func
      await pMap(items, async (assembly) => {
        const assemblyFull = await transloadit.getAssembly(assembly.id)
        // console.log(assemblyFull.assembly_id)

        const { bytes_usage: bytesUsage } = assemblyFull

        totalBytes += bytesUsage || 0
      }, { concurrency: 20 })
    } while (lastCount > 0)

    console.log('Total GB:', (totalBytes / (1024 * 1024 * 1024)).toFixed(2))
  } catch (err) {
    console.error(err)
  }
})()

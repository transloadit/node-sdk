/* eslint-disable no-unused-expressions */
/* eslint-disable camelcase */
require('./gently-preamble')
const chai = require('chai')
var chaiAsPromised = require('chai-as-promised')
const TransloaditClient = require('../src/TransloaditClient')
const request = require('request')
const localtunnel = require('localtunnel')
const http = require('http')
const querystring = require('querystring')
const temp = require('temp')
const fs = require('fs')
const _ = require('lodash')
const { join } = require('path')
const { promisify } = require('util')
const { pipeline: streamPipeline } = require('stream')
const got = require('got')
const pipeline = promisify(streamPipeline)

const { expect } = chai
chai.use(chaiAsPromised)

const authKey = process.env.TRANSLOADIT_KEY
const authSecret = process.env.TRANSLOADIT_SECRET
if (authKey == null || authSecret == null) {
  let msg = 'specify environment variables TRANSLOADIT_KEY and TRANSLOADIT_SECRET'
  msg += ' to enable integration tests.'
  console.warn(msg)
} else {
  const startServerAsync = async (handler) => new Promise((resolve, reject) => {
    const server = http.createServer(handler)

    // Find a port to use
    let port = 8000
    server.on('error', err => {
      if (err.code === 'EADDRINUSE') {
        if (++port >= 65535) {
          server.close()
          reject(new Error('Failed to bind to port'))
        }
        return server.listen(port, '127.0.0.1')
      } else {
        return reject(err)
      }
    })

    server.listen(port, '127.0.0.1')

    // Once a port has been found and the server is ready, setup the
    // localtunnel
    return server.on('listening', async () => {
      try {
        const tunnel = await localtunnel(port)
        // console.log('localtunnel', tunnel.url)

        tunnel.on('error', console.error)
        tunnel.on('close', () => {
          // console.log('tunnel closed')
          server.close()
        })

        return resolve({
          url: tunnel.url,
          close () {
            tunnel.close()
          },
        })
      } catch (err) {
        if (err != null) {
          server.close()
          return reject(err)
        }
      }
    })
  })

  const startServer = (handler, cb) => startServerAsync(handler).then((server) => cb(null, server)).catch(cb)

  // https://transloadit.com/demos/importing-files/import-a-file-over-http
  const genericImg = 'https://demos.transloadit.com/inputs/chameleon.jpg'
  const genericParams = {
    params: {
      steps: {
        import: {
          robot: '/http/import',
          url  : genericImg,
        },
        resize: {
          robot : '/image/resize',
          use   : 'import',
          result: true,
          width : 130,
          height: 130,
        },
      },
    },
    waitForCompletion: true,
  }

  describe('API integration', function () {
    this.timeout(100000)
    describe('assembly creation', () => {
      it('should create a retrievable assembly on the server', done => {
        const client = new TransloaditClient({ authKey, authSecret })

        return client.createAssembly(genericParams, (err, result) => {
          expect(err).to.not.exist
          expect(result).to.not.have.property('error')
          expect(result).to.have.property('ok')
          expect(result).to.have.property('assembly_id') // Since we're using it

          const id = result.assembly_id

          return client.getAssembly(id, (err, result) => {
            expect(err).to.not.exist
            expect(result).to.not.have.property('error')
            expect(result).to.have.property('ok')
            expect(result.assembly_id).to.equal(id)
            return done()
          })
        })
      })

      it('should get a full assembly status reliably', function (done) {
        this.timeout(0)

        const client = new TransloaditClient({ authKey, authSecret })

        const nbranches = 5
        let ndone = 0
        const branchDone = () => {
          if (++ndone === nbranches) {
            return done()
          }
        }

        const reproduce = nattempts => {
          if (nattempts === 0) {
            return branchDone()
          }

          client.createAssembly(genericParams, (err, { error, assembly_id } = {}) => {
            if (err != null || error != null) {
              return reproduce(nattempts - 1)
            }

            client.getAssembly(assembly_id, (err, result) => {
              if (err != null || result.error != null) {
                reproduce(nattempts - 1)
              }

              expect(result).to.have.property('assembly_url').that.exist
              reproduce(nattempts - 1)
            })
          })
        }

        // attempt to reproduce the incomplete status response 100 times
        for (let i = 0; i < nbranches; i++) reproduce(100 / nbranches)
      })

      it("should signal an error if a file selected for upload doesn't exist", async () => {
        const client = new TransloaditClient({ authKey, authSecret })

        const params = {
          params: {
            steps: {
              resize: {
                robot : '/image/resize',
                use   : ':original',
                result: true,
                width : 130,
                height: 130,
              },
            },
          },
        }

        client.addFile('original', temp.path({ suffix: '.transloadit.jpg' })) // Non-existing path

        const promise = client.createAssemblyAsync(params)
        await expect(promise).to.eventually.be.rejectedWith(Error).and.have.property('code').that.equals('ENOENT')
      })

      it('should allow uploading files that do exist', done => {
        const client = new TransloaditClient({ authKey, authSecret })

        const params = {
          params: {
            steps: {
              resize: {
                robot : '/image/resize',
                use   : ':original',
                result: true,
                width : 130,
                height: 130,
              },
            },
          },
        }

        return temp.open('transloadit', (err, { path } = {}) => {
          expect(err).to.not.exist
          const dl = request(genericImg)
          dl.pipe(fs.createWriteStream(path))
          dl.on('error', err => expect(err).to.not.exist)
          dl.on('end', () => {
            client.addFile('original', path)
            client.createAssembly(params, (err, result) => {
              expect(err).to.not.exist
              done()
            })
          })
        })
      })

      async function testUploadProgress (isResumable) {
        const client = new TransloaditClient({ authKey, authSecret })

        const params = {
          isResumable,
          params: {
            steps: {
              resize: {
                robot : '/image/resize',
                use   : ':original',
                result: true,
                width : 130,
                height: 130,
              },
            },
          },
        }

        const { path } = await temp.open('transloadit')

        await pipeline(got.stream(genericImg), fs.createWriteStream(path))
            client.addFile('original', path)
            let progressCalled = false
        function onProgress (progress) {
          // console.log(progress)
          expect(progress.uploadProgress.uploadedBytes).to.exist
              progressCalled = true
            }
        await client.createAssemblyAsync(params, onProgress)
        expect(progressCalled).to.be.true
              }

      it('should trigger progress callbacks when uploading files, resumable', async () => {
        await testUploadProgress(true)
          })

      it('should trigger progress callbacks when uploading files, nonresumable', async () => {
        await testUploadProgress(false)
        })

      it('should trigger the callback when waitForComplete is false', done => {
        const client = new TransloaditClient({ authKey, authSecret })
        const params = Object.assign({}, genericParams, { waitForCompletion: false })

        return client.createAssembly(params, (err, result) => {
          expect(err).to.not.exist
          expect(result).to.not.have.property('error')
          expect(result).to.have.property('ok')
          return done()
        })
      })

      it('should exit fast when assembly has failed', async () => {
        // An old bug caused it to continuously retry until timeout when errors such as INVALID_FILE_META_DATA
        const client = new TransloaditClient({ authKey, authSecret })
        const opts = {
          params: {
            steps: {
              resize: {
                use   : ':original',
                robot : '/image/resize',
                result: true,
                width : 130,
                height: 130,
              },
            },
          },
          waitForCompletion: true,
        }
        client.addFile('file', join(__dirname, './fixtures/zerobytes.jpg'))

        const promise = client.createAssemblyAsync(opts)
        await promise.catch((err) => {
          expect(err.error).to.eq('INVALID_FILE_META_DATA')
          expect(err.assembly_id).to.exist
        })
        await expect(promise).to.eventually.be.rejectedWith(Error)
      }).timeout(7000)
    })

    describe('assembly cancelation', () => {
      it('should stop the assembly from reaching completion', async () => {
        const client = new TransloaditClient({ authKey, authSecret })
        // const opts = {
        //   params: {
        //     steps: {
        //       resize: {
        //         robot : '/image/resize',
        //         use   : ':original',
        //         result: true,
        //         width : 130,
        //         height: 130,
        //       },
        //     },
        //   },
        // }

        // We need to ensure that the assembly doesn't complete before it can be
        // canceled, so we start an http server for the assembly to import from,
        // and delay transmission of data until we've already sent the cancel
        // request

        // Async book-keeping for delaying the response
        let sendServerResponse

        const promise = new Promise((resolve) => {
          sendServerResponse = resolve
        })

        const handler = async (req, res) => {
          // console.log('handler', req.url)

          expect(req.url).to.equal('/')

          await promise

          res.setHeader('Content-type', 'image/jpeg')
          res.writeHead(200)
          request.get(genericImg).pipe(res)
        }

        const server = await startServerAsync(handler)

        try {
          const params = {
            params: {
              steps: {
                import: {
                  robot: '/http/import',
                  url  : server.url,
                },
                resize: {
                  robot : '/image/resize',
                  use   : 'import',
                  result: true,
                  width : 130,
                  height: 130,
                },
              },
            },
          }

          // Finally send the createAssembly request
          const { assembly_id: id } = await client.createAssemblyAsync(params)

          // Now delete it
          const resp = await client.deleteAssemblyAsync(id)

          // Allow the upload to finish
          sendServerResponse()

          expect(resp.ok).to.equal('ASSEMBLY_CANCELED')

          // Successful cancel requests get ASSEMBLY_CANCELED even when it
          // completed, so we now request the assembly status to check the
          // *actual* status.
          const resp2 = await client.getAssemblyAsync(id)
          expect(resp2.ok).to.equal('ASSEMBLY_CANCELED')
        } finally {
          server.close()
        }
      })
    })

    describe('replaying assemblies', () => {
      it('should replay an assembly after it has completed', done => {
        const client = new TransloaditClient({ authKey, authSecret })

        client.createAssembly(genericParams, (err, { assembly_id } = {}) => {
          expect(err).to.not.exist

          const originalId = assembly_id // eslint-disable-line camelcase

          // ensure that the assembly has completed
          const ensureCompletion = cb =>
            client.getAssembly(originalId, (err, result) => {
              expect(err).to.not.exist
              const ok = result.ok

              if (ok === 'ASSEMBLY_UPLOADING' || ok === 'ASSEMBLY_EXECUTING') {
                setTimeout(() => ensureCompletion(cb), 1000)
              } else {
                cb()
              }
            })

          // Start an asynchonous loop
          ensureCompletion(() =>
            client.replayAssembly({ assembly_id: originalId }, (err, { ok } = {}) => {
              expect(err).to.not.exist
              expect(ok).to.equal('ASSEMBLY_REPLAYING')
              done()
            }),
          )
        })
      })
    })

    describe('assembly list retrieval', () => {
      it('should retrieve a list of assemblies', done => {
        const client = new TransloaditClient({ authKey, authSecret })

        client.listAssemblies({}, (err, result) => {
          expect(err).to.not.exist
          expect(result).to.have.property('count')
          expect(result)
            .to.have.property('items')
            .that.is.instanceof(Array)
          done()
        })
      })

      it('should be able to handle pagination with a stream', done => {
        const client = new TransloaditClient({ authKey, authSecret })
        const assemblies = client.streamAssemblies({ pagesize: 2 })
        let n = 0
        let isDone = false

        assemblies.on('readable', () => {
          const assembly = assemblies.read()

          if (isDone) return

          if (assembly == null) {
            return done()
          }

          if (n === 5) {
            isDone = true
            return done()
          }

          expect(assembly).to.have.property('id')
          n++
        })
      })
    })

    describe('assembly notification', () => {
      // helper function
      const streamToString = (stream, cb) => {
        const chunks = []
        stream.on('data', chunk => chunks.push(chunk))
        stream.on('error', err => cb(err))
        stream.on('end', () => cb(null, chunks.join('')))
      }

      const testCase = (desc, endBehavior) =>
        it(desc, done => {
          const client = new TransloaditClient({ authKey, authSecret })

          // listens for notifications
          const handler = (req, res) => {
            expect(req.url).to.equal('/')

            expect(req.method).to.equal('POST')
            streamToString(req, (err, body) => {
              if (err) {
                console.error(err)
              }
              const result = JSON.parse(querystring.parse(body).transloadit)
              expect(result).to.have.property('ok')
              res.writeHead(200)
              res.end()
              if (result.ok !== 'ASSEMBLY_COMPLETED') return
              endBehavior(client, result.assembly_id, done)
            })
          }

          startServer(handler, (err, server) => {
            expect(err).to.not.exist

            const params = { params: _.extend({}, genericParams.params, { notify_url: server.url }) }

            client.createAssembly(params, (err, result) => expect(err).to.not.exist)
          })
        })

      testCase('should send a notification upon assembly completion', (client, id, done) => done())

      let notificationsRecvd = 0
      testCase('should replay the notification when requested', (client, id, done) => {
        if (notificationsRecvd++ === 0) {
          setTimeout(() => {
            client.replayAssemblyNotification({ assembly_id: id }, err => expect(err).to.not.exist)
          }, 2000)
        } else {
          done()
        }
      })
    })

    describe('template methods', () => {
      // can contain only lowercase latin letters, numbers, and dashes.
      const templName = `node-sdk-test-${new Date().toISOString().toLocaleLowerCase('en-US').replace(/[^0-9a-z-]/g, '-')}`
      let templId = null
      const client = new TransloaditClient({ authKey, authSecret })

      it('should allow creating a template', async () => {
        const { id } = await client.createTemplateAsync({ name: templName, template: genericParams.params })
        templId = id
      })

      it("should be able to fetch a template's definition", async () => {
        expect(templId).to.exist

        const { name, content } = await client.getTemplateAsync(templId)
        expect(name).to.equal(templName)
        expect(content).to.deep.equal(genericParams.params)
      })

      it('should delete the template successfully', done => {
        expect(templId).to.exist

        client.deleteTemplate(templId, (err, { ok } = {}) => {
          expect(err).to.not.exist
          expect(ok).to.equal('TEMPLATE_DELETED')
          client.getTemplate(templId, (err, result) => {
            expect(result).to.not.exist
            expect(err).to.exist
            expect(err.error).to.equal('TEMPLATE_NOT_FOUND')
            done()
          })
        })
      })
    })
  })
}

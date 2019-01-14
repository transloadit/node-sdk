const gently = require('./gently-preamble')
// const should            = require('chai').should()
const { expect } = require('chai')
const TransloaditClient = require('../src/TransloaditClient')
const packageVersion = require('../package.json').version

describe('TransloaditClient', () => {
  describe('constructor', () => {
    it('should set some default properties', () => {
      const opts = {
        authKey   : 'foo_key',
        authSecret: 'foo_secret',
      }
      const client = new TransloaditClient(opts)
      expect(client._authKey).to.equal('foo_key')
      expect(client._authSecret).to.equal('foo_secret')
      expect(client._service).to.equal('api2.transloadit.com')
      expect(client._protocol).to.equal('https://')
    })

    it('should allow overwriting some properties', () => {
      const opts = {
        authKey   : 'foo_key',
        authSecret: 'foo_secret',
        service   : 'foo_service',
      }

      const client = new TransloaditClient(opts)
      expect(client._authKey).to.equal('foo_key')
      expect(client._authSecret).to.equal('foo_secret')
      expect(client._service).to.equal('foo_service')
    })
  })

  describe('addStream', () => {
    it('should properly add a stream', () => {
      const client = new TransloaditClient({ authKey: 'foo_key', authSecret: 'foo_secret' })

      const NAME = 'foo_name'
      const STREAM = {}

      expect(client._streams[NAME]).to.equal(undefined)
      gently.expect(STREAM, 'pause')
      client.addStream(NAME, STREAM)
      expect(client._streams[NAME]).to.equal(STREAM)
    })
  })

  describe('addFile', () => {
    it('should properly add a stream', () => {
      const client = new TransloaditClient({ authKey: 'foo_key', authSecret: 'foo_secret' })

      const NAME = 'foo_name'
      const PATH = 'foo_path'
      const STREAM = {
        on () {},
      }

      gently.expect(GENTLY.hijacked.fs, 'createReadStream', thePath => {
        expect(thePath).to.equal(PATH)
        return STREAM
      })

      gently.expect(client, 'addStream', (name, stream) => {
        expect(name).to.equal(NAME)
        return expect(stream).to.equal(STREAM)
      })

      return client.addFile(NAME, PATH)
    })
  })

  describe('_appendForm', () => {
    it('should append all required fields to the request form', () => {
      const client = new TransloaditClient({ authKey: 'foo_key', authSecret: 'foo_secret' })

      client._streams = {
        stream1: 'foo_stream',
        stream2: 'foo_stream2',
      }

      const FORM = {}
      const REQ = {}
      const PARAMS = {}
      const JSON_PARAMS = {}
      const FIELDS = {
        foo : 'shizzle',
        foo2: {
          bar: 'baz',
        },
      }
      const SIGNATURE = {
        signature: 'foo_signature',
        params   : JSON_PARAMS,
      }

      gently.expect(client, 'calcSignature', params => {
        expect(params).to.eql(PARAMS)
        return SIGNATURE
      })

      gently.expect(REQ, 'form', () => FORM)

      gently.expect(FORM, 'append', (key, val) => {
        expect(key).to.equal('params')
        return expect(val).to.equal(JSON_PARAMS)
      })

      gently.expect(FORM, 'append', (key, val) => {
        expect(key).to.equal('foo')
        return expect(val).to.equal('shizzle')
      })

      gently.expect(FORM, 'append', (key, val) => {
        expect(key).to.equal('foo2')
        return expect(val).to.equal(JSON.stringify({ bar: 'baz' }))
      })

      gently.expect(FORM, 'append', (key, val) => {
        expect(key).to.equal('signature')
        return expect(val).to.equal(SIGNATURE.signature)
      })

      gently.expect(FORM, 'append', (key, val) => {
        expect(key).to.equal('stream1')
        return expect(val).to.equal('foo_stream')
      })

      gently.expect(FORM, 'append', (key, val) => {
        expect(key).to.equal('stream2')
        return expect(val).to.equal('foo_stream2')
      })

      return client._appendForm(REQ, PARAMS, FIELDS)
    })
  })

  describe('_appendParamsToUrl', () => {
    it('should append params and signature to the given url', () => {
      const client = new TransloaditClient({ authKey: 'foo_key', authSecret: 'foo_secret' })

      const URL = 'foo_url'
      const PARAMS = { foo: 'bar' }
      const JSON_PARAMS = '{foo:"bar"}'
      const SIGNATURE = {
        signature: 'foo_sig',
        params   : JSON_PARAMS,
      }

      gently.expect(client, 'calcSignature', params => {
        expect(params).to.eql(PARAMS)
        return SIGNATURE
      })

      const ENCODED_PARAMS = encodeURIComponent(JSON_PARAMS)
      const url = client._appendParamsToUrl(URL, PARAMS)

      const expected = `${URL}?signature=${SIGNATURE.signature}&params=${ENCODED_PARAMS}`
      return expect(url).to.equal(expected)
    })
  })

  describe('_prepareParams', () => {
    it('should add the auth key, secret and expires parameters', () => {
      let client = new TransloaditClient({ authKey: 'foo_key', authSecret: 'foo_secret' })

      let r = JSON.parse(client._prepareParams())
      expect(r.auth.key).to.equal('foo_key')
      expect(r.auth.expires).not.to.equal(null)

      const opts = {
        authKey   : 'foo',
        authSecret: 'foo_secret',
      }
      client = new TransloaditClient(opts)

      r = JSON.parse(client._prepareParams())
      expect(r.auth.key).to.equal('foo')
      return expect(r.auth.expires).not.to.equal(null)
    })

    it('should not add anything if the params are already present', () => {
      const client = new TransloaditClient({ authKey: 'foo_key', authSecret: 'foo_secret' })

      const PARAMS = {
        auth: {
          key    : 'foo_key',
          expires: 'foo_expires',
        },
      }

      const r = JSON.parse(client._prepareParams(PARAMS))
      expect(r.auth.key).to.equal('foo_key')
      return expect(r.auth.expires).to.equal('foo_expires')
    })
  })

  describe('calcSignature', () => {
    it('should calc _prepareParams and _calcSignature', () => {
      const client = new TransloaditClient({ authKey: 'foo_key', authSecret: 'foo_secret' })

      client._authSecret = '13123123123'

      const PARAMS = { foo: 'bar' }
      const JSON_PARAMS = 'my_json_params'
      const SIGNATURE = 'my_signature'

      gently.expect(client, '_prepareParams', params => {
        expect(params).to.eql(PARAMS)
        return JSON_PARAMS
      })

      gently.expect(client, '_calcSignature', toSign => {
        expect(toSign).to.equal(JSON_PARAMS)
        return SIGNATURE
      })

      const r = client.calcSignature(PARAMS)
      expect(r.params).to.equal(JSON_PARAMS)
      return expect(r.signature).to.equal(SIGNATURE)
    })
  })

  describe('_calcSignature', () => {
    it('should calculate the signature properly', () => {
      const client = new TransloaditClient({ authKey: 'foo_key', authSecret: 'foo_secret' })

      client._authSecret = '13123123123'

      let expected = '57ddad5dbba538590e60f0938f364c7179316eba'
      expect(client._calcSignature('foo')).to.equal(expected)

      expected = 'b8110452b4ba46a9ecf438271bbd79f25d2a5400'
      expect(client._calcSignature('akjdkadskjads')).to.equal(expected)

      client._authSecret = '90191902390123'

      expected = 'd393c38de2cbc993bea52f8ecdf56c7ede8b920d'
      expect(client._calcSignature('foo')).to.equal(expected)

      expected = '8fd625190e1955eb47a9984d3e8308e3afc9049e'
      return expect(client._calcSignature('akjdkadskjads')).to.equal(expected)
    })
  })

  describe('_serviceUrl', () => {
    it('should return the service url', () => {
      const client = new TransloaditClient({ authKey: 'foo_key', authSecret: 'foo_secret' })

      client._protocol = 'foo_protocol'
      client._service = 'foo_service'

      return expect(client._serviceUrl()).to.equal(client._protocol + client._service)
    })
  })

  return describe('__remoteJson', () => {
    it('should make proper remote GET calls', () => {
      return new TransloaditClient({ authKey: 'foo_key', authSecret: 'foo_secret' })
    })
    // @todo figure out how to test direct calls to request

    it('should append params to the request form for POST requests', () => {
      return new TransloaditClient({ authKey: 'foo_key', authSecret: 'foo_secret' })
    })

    it('should add "Transloadit-Client" header to requests', () => {
      const client = new TransloaditClient({ authKey: 'foo_key', authSecret: 'foo_secret' })

      gently.expect(gently.hijacked.request, 'get', (opts) => {
        expect(opts.headers).to.eql({'Transloadit-Client': 'node-sdk:' + packageVersion})
        return {}
      })

      client.__remoteJson({url: '/some-url', method: 'get'}, () => {})
    })
  })
})

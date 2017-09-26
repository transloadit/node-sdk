const _createClass = (() => {
  function defineProperties (target, props) {
    for (let i = 0; i < props.length; i++) {
      const descriptor = props[i]
      descriptor.enumerable = descriptor.enumerable || false
      descriptor.configurable = true
      if ('value' in descriptor) descriptor.writable = true
      Object.defineProperty(target, descriptor.key, descriptor)
    }
  }
  return (Constructor, protoProps, staticProps) => {
    if (protoProps) defineProperties(Constructor.prototype, protoProps)
    if (staticProps) defineProperties(Constructor, staticProps)
    return Constructor
  }
})()

function _classCallCheck (instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError('Cannot call a class as a function')
  }
}

function _possibleConstructorReturn (self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called")
  }
  return call && (typeof call === 'object' || typeof call === 'function') ? call : self
}

function _inherits (subClass, superClass) {
  if (typeof superClass !== 'function' && superClass !== null) {
    throw new TypeError(`Super expression must either be null or a function, not ${typeof superClass}`)
  }
  subClass.prototype = Object.create(superClass && superClass.prototype, {
    constructor: { value: subClass, enumerable: false, writable: true, configurable: true },
  })
  if (superClass) { Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : (subClass.__proto__ = superClass) }
}

const reqr = global.GENTLY ? GENTLY.hijack(require) : require
// const TransloaditClient = reqr('./TransloaditClient')
const stream = reqr('stream')

const PaginationStream = (_stream$Readable => {
  _inherits(PaginationStream, _stream$Readable)

  function PaginationStream (_fetchPage) {
    _classCallCheck(this, PaginationStream)

    const _this = _possibleConstructorReturn(
      this,
      (PaginationStream.__proto__ || Object.getPrototypeOf(PaginationStream)).call(this, { objectMode: true })
    )

    _this._fetchPage = _fetchPage
    _this._pageno = 0
    _this._items = []
    _this._itemsRead = 0
    return _this
  }

  _createClass(PaginationStream, [
    {
      key  : '_read',
      value: function _read () {
        const _this2 = this

        if (this._items.length > 0) {
          this._itemsRead++
          return process.nextTick(() => _this2.push(_this2._items.pop()))
        }

        if (this._nitems != null && this._itemsRead >= this._nitems) {
          return process.nextTick(() => _this2.push(null))
        }

        return this._fetchPage(++this._pageno, (err, _ref) => {
          const count = _ref.count
          const items = _ref.items

          if (err != null) {
            return _this2.emit('error', err)
          }

          _this2._nitems = count

          _this2._items = Array.from(items)
          _this2._items.reverse()

          return _this2._read()
        })
      },
    },
  ])

  return PaginationStream
})(stream.Readable)

module.exports = PaginationStream
// # sourceMappingURL=PaginationStream.js.map

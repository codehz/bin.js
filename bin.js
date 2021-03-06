import {genStr} from './utils.js'
import {render, renderSvg} from './bin.render.js'
import genMonad from './GenMonad.js'
import {parseFilter} from './parser.js'
import * as sym from './bin.symbol.js'

const filterParser = genMonad(parseFilter)

function makeElement (input) {
  if (input.svg) return renderSvg(input.name)
  else if (input === 'text') return document.createTextNode('ERROR')
  else if (typeof input === 'string') return render(input)
  else if (input[hidden]) return input[hidden]
  else return input
}

const staticArrayMethods = [
  'concat',
  'every',
  'filter',
  'find',
  'findIndex',
  'flatMap',
  'flatten',
  'forEach',
  'includes',
  'indexOf',
  'join',
  'keys',
  'lastIndexOf',
  'map',
  'reduce',
  'reduceRight',
  'reverse',
  'slice',
  'some',
  'toLocaleString',
  'toString',
  'values'
]
const altArrayMethods = {
  map (handler, self) {
    return (callback, thisArg) => {
      const result = new Array(this.length)
      for (let i = 0; i < this.length; i++) {
        result[i] = callback(self[i], i, self)
      }
      console.log('map!')
      return result
    }
  },
  copyWithin (handler, self) {
    return (...params) => {
      this.copyWithin(...params)
      handler({event: {type: 'exchange'}, path: []})
      return self
    }
  },
  fill (handler) {
    return (value, start, end) => {
      const ret = observeObject(this, handler)
      if (this.length <= 0) return ret
      while (start < 0) start += this.length
      while (end < 0) end += this.length
      if (start >= this.length) return ret
      if (end > this.length || end === 0) end = this.length
      for (let i = start; i < end; i++) ret[i] = value
    }
  },
  pop (handler) {
    return () => {
      if (this.length === 0) return undefined
      const value = this.pop()
      handler({event: {type: 'remove', values: [value]}, path: [this.length]})
      return value
    }
  },
  push (handler, self) {
    return (...els) => {
      const start = this.length
      this.push(...els)
      handler({event: {type: 'add', values: els.map((_, i) => self[i + start])}, path: [start]})
      return this.length
    }
  },
  shift (handler) {
    return () => {
      if (this.length === 0) return undefined
      const value = this.shift()
      handler({event: {type: 'remove', values: [value]}, path: [0]})
      return value
    }
  },
  sort (handler, self) {
    return () => {
      this.sort()
      handler({event: {type: 'exchange'}, path: []})
      return self
    }
  },
  splice (handler, self) {
    return (start, deleteCount = 1, ...items) => {
      start = start > this.length ? this.length : start
      if (start < 0) start = 0
      const removed = this.splice(start, deleteCount, ...items)
      if (removed.length > 0) handler({event: {type: 'remove', values: removed}, path: [start]})
      if (items.length > 0) handler({event: {type: 'add', values: items.map((_, i) => self[i + start])}, path: [start]})
    }
  },
  unshift (handler, self) {
    return (...els) => {
      this.unshift(...els)
      handler({event: {type: 'add', values: els.map((_, i) => self[i])}, path: [0]})
      return this.length
    }
  }
}

const hidden = Symbol('hidden')
const trojan = Symbol('trojan')

function observeObject (object, handler, tracer = null) {
  if (object !== null && typeof object === 'object') {
    let base = {
      get (_, prop) {
        if (prop === hidden) return object
        if (prop === trojan) return handler
        if (prop in object) return observeObject(object[prop], ({event, path}) => handler({event, path: [prop, ...path]}), prop)
        return undefined
      },
      set (_, prop, value) {
        const src = object[prop]
        object[prop] = value
        handler({event: {type: 'set', src, value}, path: [prop]})
        return true
      }
    }
    if (Array.isArray(object)) {
      base = {
        get (_, prop) {
          if (prop === hidden) return object
          if (prop === trojan) return handler
          if (prop === Symbol.iterator) return object[Symbol.iterator]
          if (!isNaN(prop) && Number.isInteger(+prop) && prop < object.length) return observeObject(object[prop], ({event, path}) => handler({event, path: [prop, ...path]}), prop)
          else if (prop === 'length') return object.length
          else if (staticArrayMethods.includes(prop)) return object[prop]
          else if (prop in altArrayMethods) return altArrayMethods[prop].call(object, handler, observeObject(object, handler, tracer))
          return undefined
        },
        set (_, prop, value) {
          if (isNaN(prop) && Number.isInteger(+prop) && prop < object.length) {
            const src = object[prop]
            object[prop] = value
            handler({event: {type: 'set', src, value}, path: [prop]})
          }
          return true
        }
      }
    }
    return new Proxy(object, base)
  }
  return object
}

const register = Symbol('register')
const unregister = Symbol('unregister')
const connected = Symbol('connect')
const disconnected = Symbol('disconnect')

function testEvent (a, b) {
  const min = Math.min(a.length, b.length)
  for (let i = 0; i < min; i++) {
    if (a[i].toString() !== b[i].toString()) return false
  }
  return true
}

export default function bin (props = {}) {
  const {
    [sym.element]: $el = 'div',
    [sym.components]: $components = [],
    [sym.style]: $style = {},
    [sym.classList]: $classList = [],
    [sym.value]: $value = null,
    [sym.data]: $data = {},
    [sym.attr]: $attr = {},
    [sym.events]: $events = {},
    [sym.context]: $context = {},
    [sym.methods]: $methods = {},
    [sym.updated]: $updated = [],
    [sym.created]: $created = null
  } = props
  const element = makeElement($el)
  while (element.firstChild) {
    if (element.firstChild[disconnected]) setTimeout(element.firstChild[disconnected])
    element.removeChild(element.firstChild)
  }
  if (element.appendChild) {
    $components.forEach(comp => {
      const child = bin(comp)
      element.appendChild(child)
      setTimeout(child[connected])
    })
  }
  if (element.style) Object.entries($style).forEach(([k, v]) => (element.style[k] = v))
  if (element.classList) $classList.forEach(c => element.classList.add(c))
  if (element.nodeValue && $value) element.nodeValue = $value
  if (element.dataset) Object.entries($data).forEach(([k, v]) => (element.dataset[k] = v))
  if (element.attributes) Object.entries($attr).forEach(([k, v]) => element.setAttribute(k.replace(/([A-Z])/g, `-$1`).toLowerCase(), v))
  if (element.addEventListener) Object.entries($events).forEach(([k, v]) => element.addEventListener(k, v.bind(element)))
  const registry = new Set()
  const defer = []
  element[register] = function (name, handler) {
    if (name in $context) {
      registry.add(handler)
      return true
    } else if (element.parentElement && element.parentElement[register]) {
      const ret = element.parentElement[register].call(this, name, handler)
      if (ret && this === element) defer.push(() => element.parentElement[unregister](handler))
      return ret
    }
    return false
  }
  element[unregister] = function (handler) {
    if (register.has(handler)) return register.delete(handler)
    else if (element.parentElement && element.parentElement[unregister]) return element.parentElement[unregister](handler)
    return false
  }
  const selfContext = observeObject($context, ({event, path}) => {
    [...registry].filter(([testPath]) => testPath.some(tar => testEvent(path, tar))).forEach(([, handler]) => handler({event, path}))
  })
  element[sym.context] = new Proxy($context, {
    get (_, prop) {
      if (prop in $context) return selfContext[prop]
      if (element.parentElement[sym.context]) return element.parentElement[sym.context][prop]
    },
    set (_, prop, value) {
      if (prop in $context) selfContext[prop] = value
      else if (element.parentElement[sym.context]) element.parentElement[sym.context][prop] = value
      return true
    }
  })
  Object.entries($methods).forEach(([k, v]) => ($context[k] = v.bind(element)))
  element[disconnected] = function () {
    defer.forEach(x => x())
  }
  element[connected] = function () {
    $updated.forEach(([pathGroup, handler]) => {
      pathGroup.forEach(([name]) => element[register](name, [pathGroup, handler.bind(element)], element))
    })
    if ($created) $created.call(element)
  }
  element[sym.components] = observeObject($components, ({event: {type, values, ...params}, path}) => {
    if (path.length === 0) {
      while (element.firstChild) {
        if (element.firstChild[disconnected]) setTimeout(element.firstChild[disconnected])
        element.removeChild(element.firstChild)
      }
      if (element.appendChild) {
        $components.forEach(comp => {
          const child = bin(comp)
          element.appendChild(child)
          setTimeout(child[connected])
        })
      }
    } else if (path.length === 1 && type === 'remove') {
      for (let i = 0; i < values.length; i++) {
        const target = element.children[path[0]]
        element.removeChild(target)
        setTimeout(target[disconnected])
      }
    } else if (path.length === 1 && type === 'add') {
      for (let value of values) {
        const target = element.children[path[0]]
        const child = bin(value)
        element.insertBefore(child, target ? target.nextSibling : null)
        setTimeout(child[connected])
      }
    } else if (path.length === 1 && type === 'set') {
      const target = element.children[path[0]]
      const child = bin(params.value)
      target.replaceWith(child)
      setTimeout(target[disconnected])
      setTimeout(child[connected])
    }
  })
  return element
}

export function force (element) {
  element[connected]()
}

export function el (...params) {
  return rest => Object.assign(rest, {
    [sym.element]: render(...params)
  })
}

export function svg (...params) {
  return rest => Object.assign(rest, {
    [sym.element]: renderSvg(...params)
  })
}

export function watch (str, ...params) {
  const pathGroup = genStr([...str], [...params]).split(';').map(x => x.split('.'))
  return handler => [
    pathGroup,
    handler
  ]
}

export function access (object, path) {
  const xpath = [...path]
  while (xpath.length > 0) object = object[xpath.shift()]
  return object
}

export function domap (str, ...params) {
  const target = genStr([...str], [...params]).split('.')
  const purge = target.length
  return fn => [
    [target],
    function ({event: {type, values, ...params}, path}) {
      const arr = access(this[sym.context], target)
      if (path.length === purge) this[sym.components].splice(0, this[sym.components].length, ...arr.map(fn))
      else if (path.length === purge + 1) {
        if (type === 'add') {
          const added = new Array(values.length)
          for (let i = 0; i < values.length; i++) {
            added[i] = fn(values[i], i + path[purge])
          }
          this[sym.components].splice(path[purge], 0, ...added)
        } else if (type === 'remove') this[sym.components].splice(path[purge], values.length)
        else if (type === 'set') this[sym.components][path[purge]] = fn(arr[path[purge]], +path[purge])
      }
    }
  ]
}

export function filterBy (str, ...params) {
  const {path: srcPath, filter: filterPath} = filterParser(genStr([...str], [...params]))
  const pathPurge = srcPath.length
  function fullUpgrade (targetPath) {
    const targetArr = access(this[sym.context], targetPath)
    const srcArr = access(this[sym.context], srcPath)
    const filterFn = access(this[sym.context], filterPath)
    const queue = []
    for (let i = 0; i < srcArr.length; i++) {
      if (filterFn(srcArr[i])) {
        queue.push({
          index: i,
          value: Reflect.get(srcArr, i)
        })
      }
    }
    targetArr.splice(0, targetArr.length, ...queue)
  }
  function getIndex (arr, pos) {
    const ret = arr.findIndex(({index}) => index >= pos)
    return ret === -1 ? arr.length : ret
  }
  return target => [
    [srcPath, filterPath],
    function ({event: {type, values, value}, path}) {
      const targetPath = target.split('.')
      if (testEvent(path, filterPath)) {
        // filter changed (or all changed)
        fullUpgrade.call(this, targetPath)
      } else {
        // source changed
        if (path.length === pathPurge) {
          fullUpgrade.call(this, targetPath)
        } else if (path.length === pathPurge + 1) {
          const srcIndex = path[pathPurge]
          const srcArr = access(this[sym.context], srcPath)
          const targetArr = access(this[sym.context], targetPath)
          const filterFn = access(this[sym.context], filterPath)
          const targetIndex = getIndex(targetArr, srcIndex)
          const queue = []
          if (type === 'add') {
            for (let i = srcIndex; i < srcIndex + values.length; i++) {
              if (filterFn(srcArr[i])) {
                queue.push({
                  index: i,
                  value: srcArr[i]
                })
              }
            }
            const offset = queue.length
            if (offset) {
              targetArr.splice(targetIndex, 0, ...queue)
            }
            for (let i = targetIndex + offset; i < targetArr.length; i++) {
              targetArr[i].index += values.length
            }
          } else if (type === 'remove') {
            let targetIndexEnd = getIndex(targetArr, srcIndex + values.length)
            const offset = targetIndexEnd - targetIndex
            if (offset > 0) {
              targetArr.splice(targetIndex, offset)
            }
            for (let i = targetIndex; i < targetArr.length; i++) {
              targetArr[i].index -= values.length
            }
          } else if (type === 'set') {
            if (targetIndex !== targetArr.length) {
              if (!filterFn(targetArr[targetIndex])) targetArr.splice(targetIndex, 1)
            } else if (filterFn(value)) {
              targetArr.splice(targetIndex, 0, {
                index: srcIndex,
                value
              })
            }
          }
        }
      }
    }
  ]
}

export function simulate (base, data) {
  base[trojan](data)
}

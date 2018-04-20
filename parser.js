import tool from './ParserTool.js'

export function * parseElement () {
  const tagName = (yield tool.one(/^([a-zA-Z][a-zA-Z\d-]*)/)) || 'div'
  const id = yield tool.one(/^#([a-zA-Z][a-zA-Z\d-]*)/)
  const clazz = yield tool.more(/^\.([a-zA-Z][a-zA-Z\d-]*)/)
  const props = yield tool.more(/^(?:\[(([a-zA-Z][a-zA-Z\d-]*)=(.+?)|([a-zA-Z][a-zA-Z\d-]*))\])/,
    ([src, glob, key, value, flag]) => (typeof flag === 'undefined') ? [key, JSON.parse(value)] : flag)
  yield tool.eof()
  return { tagName, id, clazz, props }
}

export function * parseFilter () {
  const head = yield tool.one(/^([a-zA-Z][a-zA-Z\d-]*)/)
  const tail = yield tool.more(/^\.([a-zA-Z][a-zA-Z\d-]*)/)
  if (yield tool.excepted('|')) {
    const filterHead = yield tool.one(/^([a-zA-Z][a-zA-Z\d-]*)/)
    const filterTail = yield tool.more(/^\.([a-zA-Z][a-zA-Z\d-]*)/)
    return {path: [head, ...tail], filter: [filterHead, ...filterTail]}
  }
  return {path: [head, ...tail]}
}

import tool from './ParserTool.js'

export default function * () {
  const tagName = (yield tool.one(/^([a-zA-Z][a-zA-Z\d-]*)/)) || 'div'
  const id = yield tool.one(/^#([a-zA-Z][a-zA-Z\d-]*)/)
  const clazz = yield tool.more(/^\.([a-zA-Z][a-zA-Z\d-]*)/)
  const props = yield tool.more(/^(?:\[(([a-zA-Z][a-zA-Z\d-]*)=(.+?)|([a-zA-Z][a-zA-Z\d-]*))\])/,
    ([src, glob, key, value, flag]) => (typeof flag === 'undefined') ? [key, JSON.parse(value)] : flag)
  yield tool.eof()
  return { tagName, id, clazz, props }
}

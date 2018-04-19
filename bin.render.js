import genMonad from './GenMonad.js'
import parser from './parser.js'
import {genStr} from './utils.js'

export const parse = genMonad(parser)

function camelCase (str) {
  return str.replace(/-(\w)/g, (all, letter) => letter.toUpperCase())
}

const genRender = createElement => (str, ...param) => {
  const {tagName, id, clazz, props} = parse(genStr([...str], param))
  const el = createElement(tagName)
  if (id) el.id = id
  for (const c of clazz) el.classList.add(c)
  for (const prop of props) {
    if (typeof prop === 'string') {
      if (prop.startsWith('data-')) {
        el.dataset[camelCase(prop.slice(5))] = ''
      } else el[prop] = true
    } else {
      const [k, v] = prop
      if (k.startsWith('data-')) {
        el.dataset[camelCase(k.slice(5))] = v
      } else el[k] = v
    }
  }
  return el
}

export const render = genRender(name => document.createElement(name))

export const renderSvg = genRender(name => document.createElementNS('http://www.w3.org/2000/svg', name))

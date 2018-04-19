
export function genStr (str, param) {
  const result = []
  while (str.length > 0) {
    result.push(str.shift())
    result.push(JSON.stringify(param.shift()))
  }
  return result.join('')
}

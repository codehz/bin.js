export default function genMonad (gen) {
  return function (input) {
    const it = gen()
    let last
    while (true) {
      const {done, value} = it.next(last)
      if (done) return value
      const ret = value(input)
      if (typeof ret === 'undefined') return undefined
      const { next, result } = ret
      input = next
      last = result
    }
  }
}

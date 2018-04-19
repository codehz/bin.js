const defaultTransform = ([, target]) => target

export default {
  one (regex, fn = defaultTransform) {
    return input => {
      const result = regex.exec(input)
      if (!result || result.index !== 0) {
        return { next: input, result: undefined }
      }
      const next = input.slice(result[0].length)
      return { next, result: fn(result) }
    }
  },
  more (regex, fn = defaultTransform) {
    return input => {
      const ret = []
      while (true) {
        const result = regex.exec(input)
        if (!result || result.index !== 0) {
          return { next: input, result: ret }
        }
        input = input.slice(result[0].length)
        ret.push(fn(result))
      }
    }
  },
  eof () {
    return input => {
      return input.length === 0 ? { next: '', result: true } : undefined
    }
  }
}

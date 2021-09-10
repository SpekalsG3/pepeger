export const createIdByTemplateFactory = (range: string, template: string): () => string => {
  const availableChars = range.match(/.{1,3}/g).reduce((acc, range) => {
    const [start, finish] = range.split('-')
    let offset = 0
    while (start.charCodeAt(0) + offset <= finish.charCodeAt(0)) {
      acc.push(String.fromCharCode(start.charCodeAt(0) + (offset++)))
    }
    return acc
  }, [])

  return (): string => {
    let key = ''
    for (let i = 0; i < template.length; i++) {
      switch (template[i]) {
        case '\\':
          if (i + 2 < template.length) throw new Error(`Invalid character '\\' at position ${i}`)
          key = `${key}${template[i]}${template[++i]}`
          break
        case '*':
          key = `${key}${availableChars[Math.floor(Math.random() * availableChars.length)]}`
          break
        default:
          key = `${key}${template[i]}`
          break
      }
    }
    return key
  }
}

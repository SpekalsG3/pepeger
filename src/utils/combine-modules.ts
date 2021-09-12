type Constructor = new (...args: any[]) => any
type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends ((k: infer I) => void) ? I : never

export function combineModules<Modules extends Constructor[]> (modules: Modules): UnionToIntersection<Modules[number]> {
  return <any>modules.reduce((combined, module) => {
    return class extends module {
      constructor (...args: any[]) {
        super(args)
      }
    }
    // eslint-disable-next-line @typescript-eslint/no-extraneous-class
  }, class {})
}

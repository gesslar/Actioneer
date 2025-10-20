declare type DebugFn = (message: string, level?: number, ...args: Array<unknown>) => void

declare class Piper {
  constructor(config?: { debug?: DebugFn })
  addStep(
    fn: (context: unknown) => Promise<unknown> | unknown,
    options?: { name?: string, required?: boolean },
    newThis?: unknown
  ): this
  addSetup(fn: () => Promise<void> | void, thisArg?: unknown): this
  addCleanup(fn: () => Promise<void> | void, thisArg?: unknown): this
  pipe(items: Array<unknown> | unknown, maxConcurrent?: number): Promise<Array<unknown>>
}

export default Piper

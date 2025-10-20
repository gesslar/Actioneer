declare type DebugFn = (message: string, level?: number, ...args: Array<unknown>) => void

declare class ActionHooks {
  constructor(config: {
    actionKind: unknown,
    hooksFile: unknown,
    hooks?: unknown,
    hookTimeout?: number,
    debug?: DebugFn
  })
  static new(
    config: { actionKind: unknown, hooksFile: unknown, timeOut?: number },
    debug?: DebugFn
  ): Promise<ActionHooks | null>
  callHook(kind: string, activityName: string, context: unknown): Promise<void>
  get actionKind(): unknown
  get hooksFile(): unknown
  get hooks(): unknown | null
  get timeout(): number
  get setup(): ((args: object) => unknown) | null
  get cleanup(): ((args: object) => unknown) | null
}

export default ActionHooks

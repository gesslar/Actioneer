import Piper from './Piper'

declare type DebugFn = (message: string, level?: number, ...args: Array<unknown>) => void

declare class ActionRunner extends Piper {
  constructor(wrappedAction?: unknown, config?: { hooks?: unknown, debug?: DebugFn })

  /**
   * Execute the pipeline. When asIs is true, the context is not wrapped in {value}.
   */
  run(context: unknown, asIs?: boolean): Promise<unknown>

  setHooks(hooksPath: string, className: string): this

  toString(): string
}

export default ActionRunner

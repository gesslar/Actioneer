import type ActionWrapper from './ActionWrapper'

declare type DebugFn = (message: string, level?: number, ...args: Array<unknown>) => void
import type { ActionFunction } from './ActionWrapper'

declare class ActionBuilder {
  /**
   * @param action An object with a `setup(builder)` method or undefined for an empty builder
   */
  constructor(
    action?: { setup?: (builder: ActionBuilder) => void } | unknown,
    config?: { tag?: symbol, debug?: DebugFn }
  )

  // Overload: once-off activity
  do(name: string | symbol, op: ActionFunction): this

  // Overload: controlled activity with kind, predicate and op (function or nested ActionWrapper)
  do(
    name: string | symbol,
    kind: number,
    pred: (context: unknown) => Promise<boolean>,
    op: ActionFunction | ActionWrapper
  ): this

  // Generic fallback
  do(name: string | symbol, ...args: Array<unknown>): this

  build(): ActionWrapper
}

export default ActionBuilder

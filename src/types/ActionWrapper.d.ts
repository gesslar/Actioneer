import type Activity from './Activity'

/** Operation function signature used by activities */
export type ActionFunction = (context: unknown) => unknown | Promise<unknown>

import type { ActionFunction as _AF } from './ActionBuilder'

declare type DebugFn = (message: string, level?: number, ...args: Array<unknown>) => void

declare class ActionWrapper {
  constructor(config: {
    activities: Map<unknown, {
      name: string,
      /** operation: either a function(context) or a nested ActionWrapper */
      op: ActionFunction | ActionWrapper,
      kind?: number,
      /** predicate used for WHILE/UNTIL, returns Promise<boolean> */
      pred?: (context: unknown) => Promise<boolean>,
      action?: unknown,
      debug?: DebugFn
    }>,
    debug?: DebugFn
  })
  get activities(): IterableIterator<Activity>
}

export default ActionWrapper

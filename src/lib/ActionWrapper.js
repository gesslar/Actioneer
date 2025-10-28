import Activity from "./Activity.js"

/**
 * @typedef {object} WrappedActivityConfig
 * @property {string|symbol} name Activity identifier used by hooks/logs.
 * @property {(context: unknown) => unknown|Promise<unknown>|ActionWrapper} op Operation or nested wrapper to execute.
 * @property {number} [kind] Optional loop semantic flags.
 * @property {(context: unknown) => boolean|Promise<boolean>} [pred] Predicate tied to WHILE/UNTIL semantics.
 * @property {unknown} [action] Parent action instance supplied when invoking the op.
 * @property {(message: string, level?: number, ...args: Array<unknown>) => void} [debug] Optional logger reference.
 */

/**
 * @typedef {Generator<Activity, void, unknown>} ActivityIterator
 */

/**
 * Thin wrapper that materialises {@link Activity} instances on demand.
 */
export default class ActionWrapper {
  /**
   * Registry of activities supplied by the builder.
   *
   * @type {Map<string|symbol, WrappedActivityConfig>}
   */
  #activities = new Map()
  /**
   * Logger invoked for wrapper lifecycle events.
   *
   * @type {(message: string, level?: number, ...args: Array<unknown>) => void}
   */
  #debug = () => {}

  #hooks = null

  /**
   * Create a wrapper from the builder payload.
   *
   * @param {{activities: Map<string|symbol, WrappedActivityConfig>, debug: (message: string, level?: number, ...args: Array<unknown>) => void}} init Builder payload containing activities + logger.
   */
  constructor({activities,hooks,debug}) {
    this.#debug = debug
    this.#hooks = hooks
    this.#activities = activities
    this.#debug(
      "Instantiating ActionWrapper with %o activities.",
      2,
      activities.size,
    )
  }

  *#_activities() {
    for(const [,activity] of this.#activities)
      yield new Activity({...activity, hooks: this.#hooks})
  }

  /**
   * Iterator over the registered activities.
   *
   * @returns {ActivityIterator} Lazy iterator yielding Activity instances.
   */
  get activities() {
    return this.#_activities()
  }
}

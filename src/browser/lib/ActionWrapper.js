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
 * @typedef {import("@gesslar/toolkit").Generator<Activity, void, unknown>} ActivityIterator
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

  /** @type {import("./ActionHooks.js").default|null} */
  #hooks = null
  /** @type {((context: unknown) => unknown|Promise<unknown>)|null} */
  #done = null
  /** @type {unknown} */
  #action = null
  /** @type {symbol} */
  #id = Symbol(performance.now())

  /**
   * Create a wrapper from the builder payload.
   *
   * @param {{activities: Map<string|symbol, WrappedActivityConfig>, debug: (message: string, level?: number, ...args: Array<unknown>) => void}} init Builder payload containing activities + logger.
   */
  constructor({activities,hooks,debug,done: doneCallback,action}) {
    this.#debug = debug
    this.#hooks = hooks
    this.#done = doneCallback
    this.#action = action

    for(const [key, value] of activities) {
      this.#activities.set(
        key,
        new Activity({
          ...value,
          hooks: this.#hooks,
          wrapper: this
        })
      )
    }

    this.#debug(
      "Instantiating ActionWrapper with %o activities.",
      2,
      activities.size,
    )
  }

  /**
   * Unique identifier for this wrapper instance.
   * Used by BREAK/CONTINUE to match events to the correct loop.
   *
   * @returns {symbol} Unique symbol identifier
   */
  get id() {
    return this.#id
  }

  /**
   * Iterator over the registered activities.
   *
   * @returns {Iterator<Activity>} Iterator yielding Activity instances.
   */
  get activities() {
    return this.#activities.values()
  }

  /**
   * Get the done callback if registered.
   *
   * @returns {((context: unknown) => unknown|Promise<unknown>)|null} Done callback or null.
   */
  get done() {
    return this.#done
  }

  /**
   * Get the action instance.
   *
   * @returns {unknown|null} Action instance or null.
   */
  get action() {
    return this.#action
  }
}

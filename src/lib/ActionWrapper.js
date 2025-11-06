import Activity from "./Activity.js"

/**
 * @typedef {object} WrappedActivityConfig
 * @property {string|symbol} name Activity identifier used by hooks/logs.
 * @property {(context: unknown) => unknown|Promise<unknown>|import("./ActionBuilder.js").default} op Operation or nested ActionBuilder to execute.
 * @property {number} [kind] Optional loop semantic flags.
 * @property {(context: unknown) => boolean|Promise<boolean>} [pred] Predicate tied to WHILE/UNTIL semantics.
 * @property {(context: unknown) => unknown} [splitter] Splitter function for SPLIT activities.
 * @property {(originalContext: unknown, splitResults: unknown) => unknown} [rejoiner] Rejoiner function for SPLIT activities.
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

  /**
   * ActionHooks instance shared across all activities.
   *
   * @type {import("./ActionHooks.js").default|null}
   */
  #hooks = null

  /**
   * Create a wrapper from the builder payload.
   *
   * @param {object} config Builder payload containing activities + logger
   * @param {Map<string|symbol, WrappedActivityConfig>} config.activities Activities map
   * @param {(message: string, level?: number, ...args: Array<unknown>) => void} config.debug Debug function
   * @param {object} config.hooks Hooks object
   */
  constructor(config) {
    this.#debug = config.debug
    this.#hooks = config.hooks
    this.#activities = config.activities
    this.#debug(
      "Instantiating ActionWrapper with %o activities.",
      2,
      this.#activities.size,
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

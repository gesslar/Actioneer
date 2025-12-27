import {Data} from "@gesslar/toolkit"

/** @typedef {import("./ActionHooks.js").default} ActionHooks */

/**
 * Activity bit flags recognised by the builder. The flag decides
 * loop semantics for an activity.
 *
 * @readonly
 * @enum {number}
 * @property {number} WHILE - Execute activity while predicate returns true (2)
 * @property {number} UNTIL - Execute activity until predicate returns true (4)
 * @property {number} SPLIT - Execute activity with split/rejoin pattern for parallel execution (8)
 */
export const ACTIVITY = Object.freeze({
  WHILE: 1<<1,
  UNTIL: 1<<2,
  SPLIT: 1<<3,
})

export default class Activity {
  /** @type {unknown} */
  #action = null
  /** @type {unknown} */
  #context = null
  /** @type {ActionHooks|null} */
  #hooks = null
  /** @type {number|null} */
  #kind = null
  /** @type {string|symbol} */
  #name = null
  /** @type {((context: unknown) => unknown|Promise<unknown>)|import("./ActionBuilder.js").default} */
  #op = null
  /** @type {((context: unknown) => boolean|Promise<boolean>)|null} */
  #pred = null
  /** @type {((originalContext: unknown, splitResults: unknown) => unknown)|null} */
  #rejoiner = null
  /** @type {((context: unknown) => unknown)|null} */
  #splitter = null

  /**
   * Construct an Activity definition wrapper.
   *
   * @param {object} init - Initial properties describing the activity operation, loop semantics, and predicate
   * @param {unknown} init.action - Parent action instance
   * @param {string|symbol} init.name - Activity identifier
   * @param {(context: unknown) => unknown|Promise<unknown>|import("./ActionBuilder.js").default} init.op - Operation to execute
   * @param {number} [init.kind] - Optional loop semantics flags
   * @param {(context: unknown) => boolean|Promise<boolean>} [init.pred] - Optional predicate for WHILE/UNTIL
   * @param {ActionHooks} [init.hooks] - Optional hooks instance
   * @param {(context: unknown) => unknown} [init.splitter] - Optional splitter function for SPLIT activities
   * @param {(originalContext: unknown, splitResults: unknown) => unknown} [init.rejoiner] - Optional rejoiner function for SPLIT activities
   */
  constructor({action,name,op,kind,pred,hooks,splitter,rejoiner}) {
    this.#action = action
    this.#hooks = hooks
    this.#kind = kind
    this.#name = name
    this.#op = op
    this.#pred = pred
    this.#rejoiner = rejoiner
    this.#splitter = splitter
  }

  /**
   * The activity name.
   *
   * @returns {string} - Activity identifier
   */
  get name() {
    return this.#name
  }

  /**
   * Bitflag kind for loop semantics.
   *
   * @returns {number|null} - Combined flags (e.g., WHILE or UNTIL)
   */
  get kind() {
    return this.#kind
  }

  /**
   * The predicate function for WHILE/UNTIL flows.
   *
   * @returns {(context: unknown) => boolean|Promise<boolean>|undefined} - Predicate used to continue/stop loops
   */
  get pred() {
    return this.#pred
  }

  /**
   * The current context (if set).
   *
   * @returns {unknown} Current context value
   */
  get context() {
    return this.#context
  }

  /**
   * The operator kind name (Function or ActionBuilder).
   *
   * @returns {string} - Kind name extracted via Data.typeOf
   */
  get opKind() {
    return Data.typeOf(this.#op)
  }

  /**
   * The operator to execute (function or nested ActionBuilder).
   *
   * @returns {(context: unknown) => unknown|Promise<unknown>|import("./ActionBuilder.js").default} - Activity operation
   */
  get op() {
    return this.#op
  }

  /**
   * The splitter function for SPLIT activities.
   *
   * @returns {((context: unknown) => unknown)|null} Splitter function or null
   */
  get splitter() {
    return this.#splitter
  }

  /**
   * The rejoiner function for SPLIT activities.
   *
   * @returns {((originalContext: unknown, splitResults: unknown) => unknown)|null} Rejoiner function or null
   */
  get rejoiner() {
    return this.#rejoiner
  }

  /**
   * The action instance this activity belongs to.
   *
   * @returns {unknown} - Bound action instance
   */
  get action() {
    return this.#action
  }

  /**
   * Execute the activity with before/after hooks.
   *
   * @param {unknown} context - Mutable context flowing through the pipeline
   * @returns {Promise<unknown>} - Activity result
   */
  async run(context) {
    // before hook
    await this.#hooks?.callHook("before", this.#name, context)

    // not a hook
    const result = await this.#op.call(this.#action, context)

    // after hook
    await this.#hooks?.callHook("after", this.#name, context)

    return result
  }

  /**
   * Attach hooks to this activity instance.
   *
   * @param {ActionHooks} hooks - Hooks instance with optional before$/after$ methods
   * @returns {this} - This activity for chaining
   */
  setActionHooks(hooks) {
    if(hooks)
      this.#hooks = hooks

    return this
  }

  /**
   * Get the hooks instance attached to this activity.
   *
   * @returns {ActionHooks|null} The hooks instance or null
   */
  get hooks() {
    return this.#hooks
  }
}

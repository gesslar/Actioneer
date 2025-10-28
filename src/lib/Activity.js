import {Data} from "@gesslar/toolkit"

/**
 * Activity bit flags recognised by the builder. The flag decides
 * loop semantics for an activity.
 *
 * @readonly
 * @enum {number}
 */
export const ACTIVITY = Object.freeze({
  WHILE: 1<<1,
  UNTIL: 1<<2,
})

export default class Activity {
  #action = null
  #name = null
  #op = null
  #kind = null
  #pred = null
  #hooks = null

  /**
   * Construct an Activity definition wrapper.
   *
   * @param {{action: unknown, name: string, op: (context: unknown) => unknown|Promise<unknown>|unknown, kind?: number, pred?: (context: unknown) => boolean|Promise<boolean>, hooks?: ActionHooks}} init - Initial properties describing the activity operation, loop semantics, and predicate
   */
  constructor({action,name,op,kind,pred,hooks}) {
    this.#name = name
    this.#op = op
    this.#kind = kind
    this.#action = action
    this.#pred = pred
    this.#hooks = hooks
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
   * The operator kind name (Function or ActionWrapper).
   *
   * @returns {string} - Kind name extracted via Data.typeOf
   */
  get opKind() {
    return Data.typeOf(this.#op)
  }

  /**
   * The operator to execute (function or nested wrapper).
   *
   * @returns {unknown} - Activity operation
   */
  get op() {
    return this.#op
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
   * @returns {Promise<{activityResult: unknown}>} - Activity result wrapper with new context
   */
  async run(context) {
    // before hook
    await this.#hooks?.callHook("before", this.#name, context)

    // not a hook
    const result = await this.#op.call(this.#action,context)

    // after hook
    await this.#hooks?.callHook("after", this.#name, context)

    return result
  }

  /**
   * Attach hooks to this activity instance.
   *
   * @param {unknown} hooks - Hooks instance with optional before$/after$ methods
   * @returns {this} - This activity for chaining
   */
  setActionHooks(hooks) {
    if(hooks)
      this.#hooks = hooks

    return this
  }
}

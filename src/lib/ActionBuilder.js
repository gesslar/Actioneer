import {Data, Sass, Valid} from "@gesslar/toolkit"

import ActionWrapper from "./ActionWrapper.js"
import ActionHooks from "./ActionHooks.js"

/** @typedef {import("./ActionRunner.js").default} ActionRunner */
/** @typedef {typeof import("./Activity.js").ACTIVITY} ActivityFlags */

/**
 * @typedef {(message: string, level?: number, ...args: Array<unknown>) => void} DebugFn
 */

/**
 * @typedef {object} ActionBuilderAction
 * @property {(builder: ActionBuilder) => void} setup Function invoked during {@link ActionBuilder#build} to register activities.
 * @property {symbol} [tag] Optional tag to reuse when reconstructing builders.
 */

/**
 * @typedef {object} ActionBuilderConfig
 * @property {symbol} [tag] Optional tag for the builder instance.
 * @property {DebugFn} [debug] Logger used by the pipeline internals.
 */

/**
 * @typedef {object} ActivityDefinition
 * @property {ActionBuilderAction|null} action Parent action instance when available.
 * @property {DebugFn|null} debug Logger function.
 * @property {string|symbol} name Activity identifier.
 * @property {ActionFunction|import("./ActionWrapper.js").default} op Operation to execute.
 * @property {number} [kind] Optional kind flags from {@link ActivityFlags}.
 * @property {(context: unknown) => boolean|Promise<boolean>} [pred] Loop predicate.
 * @property {(context: unknown) => unknown} [splitter] Function to split context for parallel execution (SPLIT activities).
 * @property {(originalContext: unknown, splitResults: unknown) => unknown} [rejoiner] Function to rejoin split results (SPLIT activities).
 */

/**
 * @typedef {(context: unknown) => unknown|Promise<unknown>} ActionFunction
 */

/**
 * Fluent builder for describing how an action should process the context that
 * flows through the {@link ActionRunner}. Consumers register named activities,
 * and nested parallel pipelines before handing the builder back to the runner
 * for execution.
 *
 * Typical usage:
 *
 * ```js
 * const pipeline = new ActionBuilder(myAction)
 *   .act("prepare", ACTIVITY.ONCE, ctx => ctx.initialise())
 *   .parallel(parallel => parallel
 *     .act("step", ACTIVITY.MANY, ctx => ctx.consume())
 *   )
 *   .act("finalise", ACTIVITY.ONCE, ctx => ctx.complete())
 *   .build()
 * ```
 *
 * @class ActionBuilder
 */
export default class ActionBuilder {
  /** @type {ActionBuilderAction|null} */
  #action = null
  /** @type {Map<string|symbol, ActivityDefinition>} */
  #activities = new Map([])
  /** @type {DebugFn|null} */
  #debug = null
  /** @type {symbol|null} */
  #tag = null
  /** @type {string|null} */
  #hooksFile = null
  /** @type {string|null} */
  #hooksKind = null
  /** @type {unknown|null} */
  #hooks = null
  /** @type {import("./ActionHooks.js").default|null} */
  #actionHooks = null

  /**
   * Get the builder's tag symbol.
   *
   * @returns {symbol|null} The tag symbol for this builder instance
   */
  get tag() {
    return this.#tag
  }

  /**
   * Creates a new ActionBuilder instance with the provided action callback.
   *
   * @param {ActionBuilderAction} [action] - Base action invoked by the runner when a block satisfies the configured structure.
   * @param {ActionBuilderConfig} [config] - Options
   */
  constructor(
    action,
    {tag = action?.tag ?? Symbol(performance.now()), debug = () => {}} = {},
  ) {
    this.#debug = debug
    this.#tag = this.#tag || tag

    if(action) {
      if(Data.typeOf(action.setup) !== "Function")
        throw Sass.new("Setup must be a function.")

      this.#action = action
    }
  }

  /**
   * Register an activity that the runner can execute.
   *
   * Overloads:
   * - do(name, op)
   * - do(name, kind, pred, opOrWrapper)
   *
   * @overload
   * @param {string|symbol} name Activity name
   * @param {ActionFunction} op Operation to execute once.
   * @returns {ActionBuilder}
   */

  /**
   * @overload
   * @param {string|symbol} name Activity name
   * @param {number} kind Kind bitfield from {@link ActivityFlags}.
   * @param {(context: unknown) => boolean|Promise<boolean>} pred Predicate executed before/after the op.
   * @param {ActionFunction|import("./ActionWrapper.js").default} op Operation or nested wrapper to execute.
   * @returns {ActionBuilder}
   */

  /**
   * @overload
   * @param {string|symbol} name Activity name
   * @param {number} kind Kind bitfield (ACTIVITY.SPLIT).
   * @param {(context: unknown) => unknown} splitter Function to split context for parallel execution.
   * @param {(originalContext: unknown, splitResults: unknown) => unknown} rejoiner Function to rejoin split results with original context.
   * @param {ActionFunction|ActionBuilder} op Operation or nested ActionBuilder to execute on split context.
   * @returns {ActionBuilder}
   */

  /**
   * Handles runtime dispatch across the documented overloads.
   *
   * @param {string|symbol} name Activity name
   * @param {...unknown} args See overloads
   * @returns {ActionBuilder} The builder instance for chaining
   */
  do(name, ...args) {
    this.#dupeActivityCheck(name)

    // signatures
    // name, [function] => once
    // name, [number,function,function] => some kind of control operation
    // name, [number,function,ActionBuilder] => some kind of branch

    const action = this.#action
    const debug = this.#debug
    const activityDefinition = {name,action,debug}

    if(args.length === 1) {
      const [op,kind] = args
      Valid.type(kind, "Number|undefined")
      Valid.type(op, "Function")

      Object.assign(activityDefinition, {op,kind})
    } else if(args.length === 3) {
      const [kind,pred,op] = args

      Valid.type(kind, "Number")
      Valid.type(pred, "Function")
      Valid.type(op, "Function|ActionBuilder")

      Object.assign(activityDefinition, {kind,pred,op})
    } else if(args.length === 4) {
      const [kind,splitter,rejoiner,op] = args

      Valid.type(kind, "Number")
      Valid.type(splitter, "Function")
      Valid.type(rejoiner, "Function")
      Valid.type(op, "Function|ActionBuilder")

      Object.assign(activityDefinition, {kind,splitter,rejoiner,op})

    } else {
      throw Sass.new("Invalid number of arguments passed to 'do'")
    }

    this.#activities.set(name, activityDefinition)

    return this
  }

  /**
   * Configure hooks to be loaded from a file when the action is built.
   *
   * @param {string} hooksFile Path to the hooks module file.
   * @param {string} hooksKind Name of the exported hooks class to instantiate.
   * @returns {ActionBuilder} The builder instance for chaining.
   * @throws {Sass} If hooks have already been configured.
   */
  withHooksFile(hooksFile, hooksKind) {
    Valid.assert(this.#exclusiveHooksCheck(), "Hooks have already been configured.")

    this.#hooksFile = hooksFile
    this.#hooksKind = hooksKind

    return this
  }

  /**
   * Configure hooks using a pre-instantiated hooks object.
   *
   * @param {import("./ActionHooks.js").default} hooks An already-instantiated hooks instance.
   * @returns {ActionBuilder} The builder instance for chaining.
   * @throws {Sass} If hooks have already been configured.
   */
  withHooks(hooks) {
    Valid.assert(this.#exclusiveHooksCheck(), "Hooks have already been configured.")

    this.#hooks = hooks

    return this
  }

  /**
   * Configure hooks using an ActionHooks instance directly (typically used internally).
   *
   * @param {import("./ActionHooks.js").default} actionHooks Pre-configured ActionHooks instance.
   * @returns {ActionBuilder} The builder instance for chaining.
   * @throws {Sass} If hooks have already been configured.
   */
  withActionHooks(actionHooks) {
    Valid.assert(this.#exclusiveHooksCheck(), "Hooks have already been configured.")

    this.#actionHooks = actionHooks

    return this
  }

  /**
   * Ensures only one hooks configuration method is used at a time.
   *
   * @returns {boolean} True if no hooks have been configured yet, false otherwise.
   * @private
   */
  #exclusiveHooksCheck() {
    return !!(this.#hooksFile && this.#hooksKind) +
           !!(this.#hooks) +
           !!(this.#actionHooks) === 0
  }

  /**
   * Validates that an activity name has not been reused.
   *
   * @private
   * @param {string | symbol} name Activity identifier.
   */
  #dupeActivityCheck(name) {
    Valid.assert(
      !this.#activities.has(name),
      `Activity '${String(name)}' has already been registered.`,
    )
  }

  /**
   * Finalises the builder and returns a payload that can be consumed by the
   * runner.
   *
   * @returns {Promise<import("./ActionWrapper.js").default>} Payload consumed by the {@link ActionRunner} constructor.
   */
  async build() {
    const action = this.#action
    const activities = this.#activities
    const debug = this.#debug

    if(!action.tag) {
      action.tag = this.#tag

      action.setup.call(action, this)
    }

    // All children in a branch also get the same hooks.
    const hooks = await this.#getHooks()

    return new ActionWrapper({activities,hooks,debug})
  }

  /**
   * Check if this builder has ActionHooks configured.
   *
   * @returns {boolean} True if ActionHooks have been configured.
   */
  get hasActionHooks() {
    return this.#actionHooks !== null
  }

  /**
   * Internal method to retrieve or create ActionHooks instance.
   * Caches the hooks instance to avoid redundant instantiation.
   *
   * @returns {Promise<import("./ActionHooks.js").default|undefined>} The ActionHooks instance if configured.
   * @private
   */
  async #getHooks() {
    if(this.#actionHooks) {
      return this.#actionHooks
    }

    const newHooks = ActionHooks.new

    const hooks = this.#hooks

    if(hooks) {
      this.#actionHooks = await newHooks({hooks}, this.#debug)

      return this.#actionHooks
    }

    const hooksFile = this.#hooksFile
    const hooksKind = this.#hooksKind

    if(hooksFile && hooksKind) {
      this.#actionHooks = await newHooks({hooksFile,hooksKind}, this.#debug)

      return this.#actionHooks
    }
  }
}

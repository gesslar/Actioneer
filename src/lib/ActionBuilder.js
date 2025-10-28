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
  #hooksFile = null
  #hooksKind = null
  #hooks = null

  /**
   * Creates a new ActionBuilder instance with the provided action callback.
   *
   * @param {ActionBuilderAction} [action] Base action invoked by the runner when a block satisfies the configured structure.
   * @param {ActionBuilderConfig} [config] Options
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
    const activityDefinition = {name, action, debug}

    if(args.length === 1) {
      const [op, kind] = args
      Valid.type(kind, "Number|undefined")
      Valid.type(op, "Function")

      Object.assign(activityDefinition, {op, kind})
    } else if(args.length === 3) {
      const [kind, pred, op] = args

      Valid.type(kind, "Number")
      Valid.type(pred, "Function")
      Valid.type(op, "Function|ActionBuilder")

      Object.assign(activityDefinition, {kind, pred, op})
    } else {
      throw Sass.new("Invalid number of arguments passed to 'do'")
    }

    this.#activities.set(name, activityDefinition)

    return this
  }

  withHooksFile(hooksFile, hooksKind) {
    Valid.assert(this.#hooksFile === null, "Hooks have already been configured.")
    Valid.assert(this.#hooksKind === null, "Hooks have already been configured.")
    Valid.assert(this.#hooks === null, "Hooks have already been configured.")

    this.#hooksFile = hooksFile
    this.#hooksKind = hooksKind

    return this
  }

  withHooks(hooks) {
    Valid.assert(this.#hooksFile === null, "Hooks have already been configured.")
    Valid.assert(this.#hooksKind === null, "Hooks have already been configured.")
    Valid.assert(this.#hooks === null, "Hooks have already been configured.")

    this.#hooks = hooks

    return this
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

    if(!action.tag) {
      action.tag = this.#tag

      action.setup.call(action, this)
    }

    // All children in a branch also get the same hooks.
    const hooks = await this.#getHooks()

    return new ActionWrapper({
      activities: this.#activities,
      debug: this.#debug,
      hooks,
    })
  }

  async #getHooks() {
    const newHooks = ActionHooks.new

    const hooks = this.#hooks
    if(hooks)
      return await newHooks({hooks}, this.#debug)

    const hooksFile = this.#hooksFile
    const hooksKind = this.#hooksKind

    if(hooksFile && hooksKind)
      return await newHooks({hooksFile,hooksKind}, this.#debug)
  }
}

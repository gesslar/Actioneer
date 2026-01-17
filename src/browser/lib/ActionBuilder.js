import {Data, Sass, Valid} from "@gesslar/toolkit"

import ActionWrapper from "./ActionWrapper.js"
import ActionHooks from "./ActionHooks.js"
import {ACTIVITY} from "./Activity.js"

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
  #done = null

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

  get tag() {
    return this.#tag
  }

  /**
   * Register an activity that the runner can execute.
   *
   * Overloads:
   * - do(name, op)
   * - do(name, kind, pred, opOrWrapper)
   * - do(name, kind, splitter, rejoiner, opOrWrapper)
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
   * @param {number} kind ACTIVITY.SPLIT flag.
   * @param {(context: unknown) => unknown} splitter Splitter function for SPLIT mode.
   * @param {(originalContext: unknown, splitResults: unknown) => unknown} rejoiner Rejoiner function for SPLIT mode.
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
    // name, [number,function,function] => some kind of control operation (WHILE/UNTIL)
    // name, [number,function,function,function] => SPLIT operation with splitter/rejoiner
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
    } else if(args.length === 4) {
      const [kind, splitter, rejoiner, op] = args

      Valid.type(kind, "Number")
      Valid.type(splitter, "Function")
      Valid.type(rejoiner, "Function")
      Valid.type(op, "Function|ActionBuilder")

      // Validate that kind is SPLIT
      if((kind & ACTIVITY.SPLIT) !== ACTIVITY.SPLIT)
        throw Sass.new("4-argument form of 'do' is only valid for ACTIVITY.SPLIT")

      Object.assign(activityDefinition, {kind, splitter, rejoiner, op})
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
    Valid.assert(this.#hooksFile === null, "Hooks have already been configured.")
    Valid.assert(this.#hooksKind === null, "Hooks have already been configured.")
    Valid.assert(this.#hooks === null, "Hooks have already been configured.")

    this.#hooksFile = hooksFile
    this.#hooksKind = hooksKind

    return this
  }

  /**
   * Configure hooks using a pre-instantiated hooks object.
   *
   * @param {import("./ActionHooks.js").default} hooks An already-instantiated hooks instance.
   * @returns {ActionBuilder} The builder instance for chaining.
   * @throws {Sass} If hooks have already been configured with a different instance.
   */
  withHooks(hooks) {
    // If the same hooks instance is already set, this is idempotent - just return
    if(this.#hooks === hooks) {
      return this
    }

    Valid.assert(this.#hooksFile === null, "Hooks have already been configured.")
    Valid.assert(this.#hooksKind === null, "Hooks have already been configured.")
    Valid.assert(this.#hooks === null, "Hooks have already been configured.")

    this.#hooks = hooks

    return this
  }

  /**
   * Configure the action instance if not already set.
   * Used to propagate parent action context to nested builders.
   *
   * @param {ActionBuilderAction} action The action instance to inherit.
   * @returns {ActionBuilder} The builder instance for chaining.
   */
  withAction(action) {
    if(!this.#action && action) {
      this.#action = action

      // Update all existing activity definitions that don't have an action
      for(const [, def] of this.#activities) {
        if(!def.action)
          def.action = action
      }
    }

    return this
  }

  /**
   * Register a callback to be executed after all activities complete.
   *
   * @param {ActionFunction} callback Function to execute at the end of the pipeline.
   * @returns {ActionBuilder} The builder instance for chaining.
   */
  done(callback) {
    Valid.type(callback, "Function")
    this.#done = callback

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

    if(action && !action.tag) {
      action.tag = this.#tag

      await Promise.resolve(action.setup.call(action, this))
    }

    // All children in a branch also get the same hooks.
    const hooks = await this.#getHooks()

    return new ActionWrapper({
      activities: this.#activities,
      debug: this.#debug,
      hooks,
      done: this.#done,
    })
  }

  async #getHooks() {
    const newHooks = ActionHooks.new

    const hooks = this.#hooks
    if(hooks) {
      // If hooks is already an ActionHooks instance, use it directly
      if(hooks instanceof ActionHooks)
        return hooks

      // Otherwise, wrap it in a new ActionHooks instance
      return await newHooks({hooks}, this.#debug)
    }

    const hooksFile = this.#hooksFile
    const hooksKind = this.#hooksKind

    if(hooksFile && hooksKind)
      return await newHooks({hooksFile,hooksKind}, this.#debug)
  }
}

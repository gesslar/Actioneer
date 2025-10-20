import {Data, Sass, Valid} from "@gesslar/toolkit"

import ActionWrapper from "./ActionWrapper.js"

/** @typedef {import("./ActionRunner.js").default} ActionRunner */

/**
 * Fluent builder for describing how an action should process the context that
 * flows through the {@link ActionRunner}. Consumers register named activities,
 * optional hook pairs, and nested parallel pipelines before handing the
 * builder back to the runner for execution.
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
  #action = null
  #activities = new Map([])
  #debug = null
  #tag = null

  /**
   * Creates a new ActionBuilder instance with the provided action callback.
   *
   * @param {(ctx: unknown) => unknown} action Base action invoked by the runner when a block satisfies the configured structure.
   * @param {{tag?: symbol, debug?: (message: string, level?: number, ...args: Array<unknown>) => void}} [config] Options
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
   * Register an activity.
   *
   * Overloads:
   * - do(name, op)
   * - do(name, kind, pred, opOrWrapper)
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
      Valid.type(op, "Function|ActionWrapper")

      Object.assign(activityDefinition, {kind, pred, op})
    } else {
      throw Sass.new("Invalid number of arguments passed to 'do'")
    }

    this.#activities.set(name, activityDefinition)

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
   * @returns {{action: (context: unknown) => unknown, build: ActionBuilder}} Payload consumed by the {@link ActionRunner} constructor.
   */
  build() {
    const action = this.#action

    if(!action.tag) {
      action.tag = this.#tag

      action.setup.call(action, this)
    }

    return new ActionWrapper({
      activities: this.#activities,
      debug: this.#debug,
    })
  }
}

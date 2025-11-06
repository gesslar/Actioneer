import {Data, Sass, Valid} from "@gesslar/toolkit"

import ActionBuilder from "./ActionBuilder.js"
import {ACTIVITY} from "./Activity.js"
import Piper from "./Piper.js"

/**
 * @typedef {(message: string, level?: number, ...args: Array<unknown>) => void} DebugFn
 */

/**
 * @typedef {object} ActionRunnerOptions
 * @property {DebugFn} [debug] Logger function.
 */
/**
 * Orchestrates execution of {@link ActionBuilder}-produced pipelines.
 *
 * Activities run in insertion order, with support for once-off work, repeated
 * loops, and nested parallel pipelines. Each activity receives a mutable
 * context object under `result.value` that can be replaced or enriched.
 */
export default class ActionRunner extends Piper {
  /** @type {import("./ActionBuilder.js").default|null} */
  #actionBuilder = null
  /** @type {import("./ActionWrapper.js").default|null} */
  #actionWrapper = null

  /**
   * Logger invoked for diagnostics.
   *
   * @type {DebugFn}
   */
  #debug = () => {}

  /**
   * Instantiate a runner over an optional action wrapper.
   *
   * @param {import("./ActionBuilder.js").default|null} actionBuilder ActionBuilder to build.
   * @param {ActionRunnerOptions} [options] Optional debug overrides.
   */
  constructor(actionBuilder, {debug=(() => {})} = {}) {
    super({debug})

    this.#debug = debug

    if(!actionBuilder)
      return this

    if(actionBuilder?.constructor?.name !== "ActionBuilder")
      throw Sass.new("ActionRunner takes an instance of an ActionBuilder")

    this.#actionBuilder = actionBuilder

    this.addStep(this.run, {
      name: `ActionRunner for ${actionBuilder.tag.description}`
    })
  }

  /**
   * Executes the configured action pipeline.
   * Builds the ActionWrapper on first run and caches it for subsequent calls.
   * Supports WHILE, UNTIL, and SPLIT activity kinds.
   *
   * @param {unknown} context - Seed value passed to the first activity.
   * @returns {Promise<unknown>} Final value produced by the pipeline.
   * @throws {Sass} When no activities are registered, conflicting activity kinds are used, or execution fails.
   */
  async run(context) {
    if(!this.#actionWrapper)
      this.#actionWrapper = await this.#actionBuilder.build()

    const actionWrapper = this.#actionWrapper
    const activities = actionWrapper.activities

    for(const activity of activities) {
      // await timeout(500)

      const kind = activity.kind

      // If we have no kind, then it's just a once.
      // Get it over and done with!
      if(!kind) {
        context = await this.#executeActivity(activity, context)
      } else {
        if((kind & (kind - 1)) !== 0 && kind === 0)
          throw Sass.new(
            "For Kathy Griffin's sake! You can't do something while AND " +
            "until. Pick one! Also, forget about splitting. Not. Happening."
          )

        const {WHILE,UNTIL,SPLIT} = ACTIVITY
        const kindWhile = kind & WHILE
        const kindUntil = kind & UNTIL
        const kindSplit = kind & SPLIT

        if(kindWhile || kindUntil) {
          const activityPredicate = activity.pred

          for(;;) {

            if(kindWhile) {
              const shouldContinue = await this.#predicateCheck(
                activity,
                activityPredicate,
                context,
              )

              if(!shouldContinue) {
                break
              }
            }

            context = await this.#executeActivity(activity,context)

            if(kindUntil) {
              const shouldContinue = await this.#predicateCheck(
                activity,
                activityPredicate,
                context,
              )

              if(!shouldContinue) {
                break
              }
            }
          }
        } else if(kindSplit && activity.opKind === "ActionBuilder") {
          // Split activity: execute with split/rejoin pattern for parallel processing
          const splitter = activity.splitter
          const rejoiner = activity.rejoiner

          const originalContext = context
          const splitContext = splitter.call(activity.action,context)
          const recontexted = await this.#executeActivity(
            activity,
            splitContext,
            true,
          )
          const rejoined = rejoiner.call(
            activity.action,
            originalContext,
            recontexted,
          )

          context = rejoined
        } else {
          context = await this.#executeActivity(activity, context)
        }
      }

    }

    return context
  }

  /**
   * Execute a single activity, recursing into nested ActionBuilders when needed.
   * Handles both function-based activities and ActionBuilder-based nested pipelines.
   * Automatically propagates hooks to nested builders and handles dynamic ActionBuilder returns.
   *
   * @param {import("./Activity.js").default} activity Pipeline activity descriptor.
   * @param {unknown} context Current pipeline context.
   * @param {boolean} [parallel] Whether to use parallel execution (via pipe() instead of run()).
   * @returns {Promise<unknown>} Resolved activity result.
   * @throws {Sass} If the operation kind is invalid.
   * @private
   */
  async #executeActivity(activity, context, parallel = false) {
    // What kind of op are we looking at? Is it a function?
    // Or a class instance of type ActionBuilder?
    const opKind = activity.opKind

    if(opKind === "ActionBuilder") {
      if(activity.hooks && !activity.op.hasActionHooks) {
        activity.op.withActionHooks(activity.hooks)
      }

      const runner = new this.constructor(
        activity.op,
        {debug: this.#debug, name: activity.name},
      )
      if(parallel)
        return await runner.pipe(context)
      else
        return await runner.run(context)
    } else if(opKind === "Function") {
      const result = await activity.run(context)

      if(Data.isType(result, "ActionBuilder")) {
        if(activity.hooks)
          result.withActionHooks(activity.hooks)

        const runner = new this.constructor(result, {
          debug: this.#debug, name: result.name
        })

        if(parallel)
          return await runner.pipe(context)
        else
          return await runner.run(context)
      } else {
        return result
      }
    }

    throw Sass.new("We buy Functions and ActionBuilders. Only. Not whatever that was.")
  }

  /**
   * Evaluate the predicate for WHILE/UNTIL activity kinds.
   *
   * @param {import("./Activity.js").default} activity Activity currently executing.
   * @param {(context: unknown) => boolean|Promise<boolean>} predicate Predicate to evaluate.
   * @param {unknown} context Current pipeline context.
   * @returns {Promise<boolean>} True when the predicate allows another iteration.
   * @private
   */
  async #predicateCheck(activity,predicate,context) {
    Valid.type(predicate, "Function")

    return !!(await predicate.call(activity.action, context))
  }

  toString() {
    return `[object ${this.constructor.name}]`
  }
}

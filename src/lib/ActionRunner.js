import {Sass, Valid} from "@gesslar/toolkit"

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
  #actionBuilder = null

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

    this.addStep(this.run)
  }

  /**
   * Executes the configured action pipeline.
   *
   * @param {unknown} context - Seed value passed to the first activity.
   * @returns {Promise<unknown>} Final value produced by the pipeline, or null when a parallel stage reports failures.
   * @throws {Sass} When no activities are registered or required parallel builders are missing.
   */
  async run(context) {
    const actionWrapper = await this.#actionBuilder.build()
    const activities = actionWrapper.activities

    for(const activity of activities) {
      const kind = activity.kind

      // If we have no kind, then it's just a once.
      // Get it over and done with!
      if(!kind) {
        context = await this.#executeActivity(activity, context)
      } else {
        const {WHILE,UNTIL} = ACTIVITY
        const pred = activity.pred
        const kindWhile = kind & WHILE
        const kindUntil = kind & UNTIL

        if(kindWhile && kindUntil)
          throw Sass.new(
            "For Kathy Griffin's sake! You can't do something while AND " +
            "until. Pick one!"
          )

        if(kindWhile || kindUntil) {
          for(;;) {

            if(kindWhile)
              if(!await this.#predicateCheck(activity,pred,context))
                break

            context = await this.#executeActivity(activity,context)

            if(kindUntil)
              if(!await this.#predicateCheck(activity,pred,context))
                break
          }
        } else {
          context = await this.#executeActivity(activity, context)
        }
      }

    }

    return context
  }

  /**
   * Execute a single activity, recursing into nested action wrappers when needed.
   *
   * @param {import("./Activity.js").default} activity Pipeline activity descriptor.
   * @param {unknown} context Current pipeline context.
   * @returns {Promise<unknown>} Resolved activity result.
   * @private
   */
  async #executeActivity(activity, context) {
    // What kind of op are we looking at? Is it a function?
    // Or a class instance of type ActionBuilder?
    const opKind = activity.opKind
    if(opKind === "ActionBuilder") {
      const runner = new this.constructor(activity.op, {debug: this.#debug})

      return await runner.run(context, true)
    } else if(opKind === "Function") {
      return await activity.run(context)
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

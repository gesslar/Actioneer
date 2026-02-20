import {Promised, Data, Sass, Tantrum, Valid} from "@gesslar/toolkit"

import {ACTIVITY} from "./Activity.js"
import Piper from "./Piper.js"

/**
 * Types
 *
 * @import {default as ActionBuilder} from "./ActionBuilder.js"
 * @import {default as ActionWrapper} from "./ActionWrapper.js"
 */
/**
 * @typedef {(message: string, level?: number, ...args: Array<unknown>) => void} DebugFn
 *
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
  /** @type {ActionBuilder?} */
  #actionBuilder = null
  /** @type {ActionWrapper?} */
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

    this.addSetup(this.#setupHooks)
    this.addStep(this.run, {
      name: `ActionRunner for ${actionBuilder.tag.description}`
    })
    this.addCleanup(this.#cleanupHooks)
  }

  /**
   * Invokes the `setup` lifecycle hook on the raw hooks object, if defined.
   * Registered as a Piper setup step so it fires before any items are processed.
   *
   * @param {unknown} ctx - Value passed by {@link Piper#pipe} (the items array).
   * @returns {Promise<void>}
   * @private
   */
  async #setupHooks(ctx) {
    const ab = this.#actionBuilder
    const ah = ab?.hooks
    const setup = ah?.setup

    if(setup)
      await setup.call(ah, ctx)
  }

  /**
   * Invokes the `cleanup` lifecycle hook on the raw hooks object, if defined.
   * Registered as a Piper teardown step so it fires after all items are processed.
   *
   * @param {unknown} ctx - Value passed by {@link Piper#pipe} (the items array).
   * @returns {Promise<void>}
   * @private
   */
  async #cleanupHooks(ctx) {
    const ab = this.#actionBuilder
    const ah = ab?.hooks
    const cleanup = ah?.cleanup

    if(cleanup)
      await cleanup.call(ah, ctx)
  }

  /**
   * Executes the configured action pipeline.
   * Builds the ActionWrapper on first run and caches it for subsequent calls.
   * Supports WHILE, UNTIL, IF, SPLIT, BREAK, and CONTINUE activity kinds.
   *
   * @param {unknown} context - Seed value passed to the first activity.
   * @param {import("./ActionWrapper.js").default|null} [parentWrapper] - Parent wrapper for BREAK/CONTINUE signaling.
   * @returns {Promise<unknown>} Final value produced by the pipeline.
   * @throws {Sass} When no activities are registered, conflicting activity kinds are used, or execution fails.
   * @throws {Tantrum} When both an activity and the done callback fail.
   */
  async run(context, parentWrapper=null) {
    if(!this.#actionWrapper)
      this.#actionWrapper = await this.#actionBuilder.build(this)

    const actionWrapper = this.#actionWrapper
    const activities = Array.from(actionWrapper.activities)

    let caughtError = null

    try {
      for(
        let cursor = 0, max = activities.length;
        cursor < max && cursor !== -1;
        cursor++
      ) {
        const activity = activities[cursor]

        try {
          const kind = activity.kind

          // If we have no kind, then it's just a once.
          // Get it over and done with!
          if(!kind) {
            context = await this.#execute(activity, context)
          } else {
            const {UNTIL, WHILE, IF, SPLIT, BREAK, CONTINUE} = ACTIVITY
            const kindUntil = kind === UNTIL
            const kindWhile = kind === WHILE
            const kindIf = kind === IF
            const kindSplit = kind === SPLIT
            const kindBreak = kind === BREAK
            const kindContinue = kind === CONTINUE

            if(kindBreak || kindContinue) {
              if(!parentWrapper)
                throw Sass.new(`Invalid use of control flow outside of context.`)

              if(await this.#evalPredicate(activity, context)) {
                if(kindBreak) {
                  this.emit("loop.break", parentWrapper)
                  break
                }

                if(kindContinue)
                  cursor = max
              }
            } else if(kindIf) {
              if(await this.#evalPredicate(activity, context))
                context = await this.#execute(activity, context)
            } else if(kindWhile || kindUntil) {
              // Simple if, no loop, only gainz.
              for(;;) {
                if(kindWhile)
                  if(!await this.#evalPredicate(activity, context))
                    break

                let weWereOnABreak = false
                const breakReceiver = this.on("loop.break", wrapper => {
                  if(wrapper.id === actionWrapper.id) {
                    weWereOnABreak = true
                  }
                })
                context = await this.#execute(activity, context)
                breakReceiver()
                if(weWereOnABreak)
                  break

                if(kindUntil)
                  if(await this.#evalPredicate(activity, context))
                    break
              }
            } else if(kindSplit) {
              // SPLIT activity: parallel execution with splitter/rejoiner
              // pattern
              const {splitter, rejoiner} = activity

              if(!splitter || !rejoiner)
                throw Sass.new(
                  `SPLIT activity "${String(activity.name)}" requires both ` +
                  `splitter and rejoiner functions.`
                )

              const original = context
              const splitContexts = await splitter.call(activity.action,context)

              let settled

              if(activity.opKind === "ActionBuilder") {
                if(activity.action)
                  activity.op.withAction(activity.action)

                if(activity.hooks)
                  activity.op.withHooks(activity.hooks)

                const runner = new this.constructor(activity.op, {
                  debug: this.#debug, name: activity.name
                })

                settled = await runner.pipe(splitContexts)
              } else {
                // For plain functions, process each split context
                settled = await Promised.settle(
                  splitContexts.map(ctx => this.#execute(activity, ctx))
                )
              }

              const rejoined = await rejoiner.call(
                activity.action,
                original,
                settled
              )

              context = rejoined
            } else {
              context = await this.#execute(activity, context)
            }
          }
        } catch(error) {
          throw Sass.new("ActionRunner running activity", error)
        }
      }
    } catch(err) {
      caughtError = err
    }

    // Execute done callback if registered - always runs, even on error
    // Only run for top-level pipelines, not nested builders (inside loops)
    if(actionWrapper.done && !parentWrapper) {
      try {
        context = await actionWrapper.done.call(
          actionWrapper.action, caughtError ?? context
        )
      } catch(error) {
        if(caughtError)
          caughtError = new Tantrum("ActionRunner running done callback", [caughtError, error])
        else
          caughtError = Sass.new("ActionRunner running done callback", error)
      }
    }

    if(caughtError)
      throw caughtError

    return context
  }

  /**
   * Execute a single activity, recursing into nested ActionBuilders when needed.
   * Handles both function-based activities and ActionBuilder-based nested pipelines.
   * Automatically propagates hooks to nested builders and handles dynamic ActionBuilder returns.
   *
   * When parallel=true, uses Piper.pipe() for concurrent execution with worker pool pattern.
   * This is triggered by SPLIT activities where context is divided for parallel processing.
   * Results from parallel execution are returned directly as an array from Piper.pipe().
   *
   * @param {import("./Activity.js").default} activity Pipeline activity descriptor.
   * @param {unknown} context Current pipeline context.
   * @param {boolean} [parallel] Whether to use parallel execution (via pipe() instead of run()). Default: false.
   * @returns {Promise<unknown>} Resolved activity result.
   * @throws {Sass} If the operation kind is invalid, or if SPLIT activity lacks splitter/rejoiner.
   * @private
   */
  async #execute(activity, context, parallel=false) {
    // What kind of op are we looking at? Is it a function?
    // Or a class instance of type ActionBuilder?
    const opKind = activity.opKind

    if(opKind === "ActionBuilder") {
      if(activity.action)
        activity.op.withAction(activity.action)

      if(activity.hooks)
        activity.op.withHooks(activity.hooks)

      const runner = new this.constructor(activity.op, {
        debug: this.#debug, name: activity.name
      })

      // Forward loop.break events from nested runner to this runner
      // so that parent WHILE/UNTIL loops can receive break signals.
      const forwarder = runner.on("loop.break",
        wrapper => this.emit("loop.break", wrapper)
      )

      try {
        if(parallel) {
          return await runner.pipe(context)
        } else {
          return await runner.run(context, activity.wrapper)
        }
      } finally {
        forwarder()
      }
    } else if(opKind === "Function") {
      try {
        const result = await activity.run(context, activity.wrapper)

        if(Data.isType(result, "ActionBuilder")) {
          if(activity.action)
            result.withAction(activity.action)

          if(activity.hooks)
            result.withHooks(activity.hooks)

          const runner = new this.constructor(result, {
            debug: this.#debug, name: result.name
          })

          if(parallel) {
            return await runner.pipe(context)
          } else {
            return await runner.run(context, activity.wrapper)
          }
        } else {
          return result
        }
      } catch(error) {
        throw Sass.new("Executing activity", error)
      }
    }

    throw Sass.new("We buy Functions and ActionBuilders. Only. Not whatever that was.")
  }

  /**
   * Evaluate the predicate for WHILE/UNTIL/IF/BREAK/CONTINUE activity kinds.
   *
   * @param {import("./Activity.js").default} activity Activity currently executing.
   * @param {unknown} context Current pipeline context.
   * @returns {Promise<boolean>} True when the predicate condition is met.
   * @private
   */
  async #evalPredicate(activity, context) {
    Valid.type(activity?.pred, "Function")

    return !!(await activity.pred.call(activity.action, context))
  }

  toString() {
    return `[object ${this.constructor.name}]`
  }
}

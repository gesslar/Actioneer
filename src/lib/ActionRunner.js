import {FileObject, Sass, Valid} from "@gesslar/toolkit"

import ActionBuilder from "./ActionBuilder.js"
import {ACTIVITY} from "./Activity.js"
import Piper from "./Piper.js"
/**
 * Orchestrates execution of {@link ActionBuilder}-produced pipelines.
 *
 * Activities run in insertion order, with support for once-off work, repeated
 * loops, and nested parallel pipelines. Each activity receives a mutable
 * context object under `result.value` that can be replaced or enriched.
 */
export default class ActionRunner extends Piper {
  #actionWrapper = null
  #debug = null
  #hooksPath = null
  #hooksClassName = null
  #hooks = null
  #tag = null

  constructor(wrappedAction, {hooks,debug=(() => {})} = {}) {
    super({debug})

    this.#tag = Symbol(performance.now())

    this.#debug = debug

    if(!wrappedAction)
      return this

    if(wrappedAction?.constructor?.name !== "ActionWrapper")
      throw Sass.new("ActionRunner takes an instance of an ActionWrapper")

    this.#actionWrapper = wrappedAction

    if(hooks)
      this.#hooks = hooks
    else
      this.addSetup(this.#loadHooks)

    this.addStep(this.run)
  }

  /**
   * Executes the configured action pipeline.
   *
   * @param {unknown} context - Seed value passed to the first activity.
   * @param {boolean} asIs - When true, do not wrap context in {value} (internal nested runners)
   * @returns {Promise<unknown>} Final value produced by the pipeline, or null when a parallel stage reports failures.
   * @throws {Sass} When no activities are registered or required parallel builders are missing.
   */
  async run(context, asIs=false) {
    this.#debug(this.#tag.description)
    const actionWrapper = this.#actionWrapper
    const activities = actionWrapper.activities

    if(!asIs)
      context = {value: context}

    context

    for(const activity of activities) {
      activity.setActionHooks(this.#hooks)

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
            context

            if(kindUntil)
              if(!await this.#predicateCheck(activity,pred,context))
                break
          }
        } else {
          context = await this.#executeActivity(activity, context)
          context
        }
      }

    }

    return context
  }

  async #executeActivity(activity, context) {
    // What kind of op are we looking at? Is it a function?
    // Or a class instance of type ActionWrapper?
    const opKind = activity.opKind
    if(opKind === "ActionWrapper") {
      const runner = new this.constructor(activity.op, {
        debug: this.#debug,
        hooks: this.#hooks,
      })
        .setHooks(this.#hooksPath, this.#hooksClassName)

      return await runner.run(context, true)
    } else if(opKind === "Function") {
      return (await activity.run(context)).activityResult
    }

    throw Sass.new("We buy Functions and ActionWrappers. Only. Not whatever that was.")
  }

  async #predicateCheck(activity,predicate,context) {
    Valid.type(predicate, "Function")

    return !!(await predicate.call(activity.action, context))
  }

  toString() {
    return `[object ${this.constructor.name}]`
  }

  setHooks(hooksPath, className) {
    this.#hooksPath = hooksPath
    this.#hooksClassName = className

    this.addSetup(() => this.#loadHooks())

    return this
  }

  async #loadHooks() {
    if(!this.#hooksPath)
      return null

    const file = new FileObject(this.#hooksPath)
    if(!await file.exists)
      throw Sass.new(`File '${file.uri} does not exist.`)

    const module = await file.import()
    const hooksClassName = this.#hooksClassName

    Valid.type(module[hooksClassName], "Function")

    const loaded = new module[hooksClassName]({
      debug: this.#debug
    })

    this.#hooks = loaded
  }
}

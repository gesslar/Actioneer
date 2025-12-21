import {setTimeout as timeout} from "timers/promises"
import {Data, FileObject, Sass, Util, Valid} from "@gesslar/toolkit"

/**
 * @typedef {(message: string, level?: number, ...args: Array<unknown>) => void} DebugFn
 */

/**
 * @typedef {object} ActionHooksConfig
 * @property {string} actionKind Action identifier shared between runner and hooks.
 * @property {FileObject} hooksFile File handle used to import the hooks module.
 * @property {unknown} [hooks] Already-instantiated hooks implementation (skips loading).
 * @property {number} [hookTimeout] Timeout applied to hook execution in milliseconds.
 * @property {DebugFn} debug Logger to emit diagnostics.
 */

/**
 * @typedef {Record<string, (context: unknown) => Promise<unknown>|unknown>} HookModule
 */

/**
 * Generic base class for managing hooks with configurable event types.
 * Provides common functionality for hook registration, execution, and lifecycle management.
 * Designed to be extended by specific implementations.
 */
export default class ActionHooks {
  /** @type {FileObject|null} */
  #hooksFile = null
  /** @type {HookModule|null} */
  #hooks = null
  /** @type {string|null} */
  #actionKind = null
  /** @type {number} */
  #timeout = 1_000 // Default 1 second timeout
  /** @type {DebugFn|null} */
  #debug = null

  /**
   * Creates a new ActionHook instance.
   *
   * @param {ActionHooksConfig} config Configuration values describing how to load the hooks.
   */
  constructor({actionKind, hooksFile, hooks, hookTimeout = 1_000, debug}) {
    this.#actionKind = actionKind
    this.#hooksFile = hooksFile
    this.#hooks = hooks
    this.#timeout = hookTimeout
    this.#debug = debug
  }

  /**
   * Gets the action identifier.
   *
   * @returns {string} Action identifier or instance
   */
  get actionKind() {
    return this.#actionKind
  }

  /**
   * Gets the hooks file object.
   *
   * @returns {FileObject} File object containing hooks
   */
  get hooksFile() {
    return this.#hooksFile
  }

  /**
   * Gets the loaded hooks object.
   *
   * @returns {object|null} Hooks object or null if not loaded
   */
  get hooks() {
    return this.#hooks
  }

  /**
   * Gets the hook execution timeout in milliseconds.
   *
   * @returns {number} Timeout in milliseconds
   */
  get timeout() {
    return this.#timeout
  }

  /**
   * Gets the setup hook function if available.
   *
   * @returns {(args: object) => unknown|null} Setup hook function or null
   */
  get setup() {
    return this.hooks?.setup || null
  }

  /**
   * Gets the cleanup hook function if available.
   *
   * @returns {(args: object) => unknown|null} Cleanup hook function or null
   */
  get cleanup() {
    return this.hooks?.cleanup || null
  }

  /**
   * Static factory method to create and initialize a hook manager.
   * Loads hooks from the specified file and returns an initialized instance.
   * Override loadHooks() in subclasses to customize hook loading logic.
   *
   * @param {ActionHooksConfig} config Same configuration object as constructor
   * @param {DebugFn} debug The debug function.
   * @returns {Promise<ActionHooks|null>} Initialized hook manager or null if no hooks found
   */
  static async new(config, debug) {
    debug("Creating new HookManager instance with args: %o", 2, config)

    const instance = new ActionHooks({...config, debug}, debug)
    if(!instance.#hooks) {
      const hooksFile = new FileObject(instance.#hooksFile)

      debug("Loading hooks from %o", 2, hooksFile.uri)

      debug("Checking hooks file exists: %o", 2, hooksFile.uri)
      if(!await hooksFile.exists)
        throw Sass.new(`No such hooks file, ${hooksFile.uri}`)

      try {
        const hooksImport = await hooksFile.import()

        if(!hooksImport)
          return null

        debug("Hooks file imported successfully as a module", 2)

        const actionKind = instance.actionKind
        if(!hooksImport[actionKind])
          return null

        const hooks = new hooksImport[actionKind]({debug})

        debug(hooks.constructor.name, 4)

        instance.#hooks = hooks
        debug("Hooks %o loaded successfully for %o", 2, hooksFile.uri, instance.actionKind)

        return instance
      } catch(error) {
        debug("Failed to load hooks %o: %o", 1, hooksFile.uri, error.message)

        return null
      }
    }

    return instance
  }

  /**
   * Invoke a dynamically-named hook such as `before$foo`.
   *
   * @param {'before'|'after'|'setup'|'cleanup'|string} kind Hook namespace.
   * @param {string|symbol} activityName Activity identifier.
   * @param {unknown} context Pipeline context supplied to the hook.
   * @returns {Promise<void>}
   */
  async callHook(kind, activityName, context) {
    try {
      const debug = this.#debug
      const hooks = this.#hooks

      if(!hooks)
        return

      const stringActivityName = Data.isType(activityName, "Symbol")
        ? activityName.description()
        : activityName

      const hookName = this.#getActivityHookName(kind, stringActivityName)

      debug("Looking for hook: %o", 4, hookName)

      const hook = hooks[hookName]
      if(!hook)
        return

      debug("Triggering hook: %o", 4, hookName)
      Valid.type(hook, "Function", `Hook "${hookName}" is not a function`)

      const hookFunction = async() => {
        debug("Hook function starting execution: %o", 4, hookName)

        const duration = (
          await Util.time(() => hook.call(this.#hooks, context))
        ).cost

        debug("Hook function completed successfully: %o, after %oms", 4, hookName, duration)
      }

      const hookTimeout = this.timeout
      const expireAsync = (async() => {
        await timeout(hookTimeout)
        throw Sass.new(`Hook ${hookName} execution exceeded timeout of ${hookTimeout}ms`)
      })()

      try {
        debug("Starting Promise race for hook: %o", 4, hookName)
        await Util.race([
          hookFunction(),
          expireAsync
        ])
      } catch(error) {
        throw Sass.new(`Processing hook ${kind}$${activityName}`, error)
      }

      debug("We made it throoough the wildernessss", 4)

    } catch(error) {
      throw Sass.new(`Processing hook ${kind}$${activityName}`, error)
    }
  }

  #getActivityHookName(event, activityName) {
    const name = activityName
      .split(" ")
      .map(a => a.trim())
      .filter(Boolean)
      .map(a => a
        .split("")
        .filter(b => /[\w]/.test(b))
        .filter(Boolean)
        .join("")
      )
      .map(a => a.toLowerCase())
      .map((a, i) => i === 0 ? a : Util.capitalize(a))
      .join("")

    return `${event}$${name}`
  }
}

import {Data, Sass, Promised, Time, Util, Valid} from "@gesslar/toolkit"

/**
 * @typedef {(message: string, level?: number, ...args: Array<unknown>) => void} DebugFn
 */

/**
 * @typedef {Record<string, (context: unknown) => Promise<unknown>|unknown>} HookModule
 *
 * @typedef {object} ActionHooksConfig
 * @property {string} actionKind - Action identifier shared between runner and hooks.
 * @property {unknown} hooks - Already-instantiated hooks implementation.
 * @property {number} [hookTimeout] - Timeout applied to hook execution in milliseconds.
 * @property {DebugFn} debug - Logger to emit diagnostics.
 */

/**
 * Generic base class for managing hooks with configurable event types.
 * Provides common functionality for hook registration, execution, and lifecycle management.
 * Designed to be extended by specific implementations.
 *
 * Browser version: Requires pre-instantiated hooks. File-based loading is not supported.
 */
export default class ActionHooks {
  /** @type {HookModule?} */
  #hooks = null
  /** @type {string?} */
  #actionKind = null
  /** @type {number} */
  #timeout = 1_000 // Default 1 second timeout
  /** @type {DebugFn?} */
  #debug = null

  /**
   * Creates a new ActionHook instance.
   *
   * @param {ActionHooksConfig} config - Configuration values describing how to load the hooks.
   */
  constructor({actionKind, hooks, hookTimeout = 1_000, debug}) {
    this.#actionKind = actionKind
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
   * Gets the loaded hooks object.
   *
   * @returns {object?} Hooks object or null if not loaded
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
   * @returns {(args: object) => unknown} Setup hook function or null
   */
  get setup() {
    return this.hooks?.setup || null
  }

  /**
   * Gets the cleanup hook function if available.
   *
   * @returns {(args: object) => unknown} Cleanup hook function or null
   */
  get cleanup() {
    return this.hooks?.cleanup || null
  }

  /**
   * Static factory method to create and initialize a hook manager.
   * Browser version: Only works with pre-instantiated hooks passed via config.hooks.
   *
   * @param {ActionHooksConfig} config - Configuration object with hooks property
   * @param {DebugFn} debug - The debug function.
   * @returns {Promise<ActionHooks?>} Initialized hook manager or null if no hooks provided
   */
  static async new(config, debug) {
    debug("Creating new HookManager instance with args: %o", 2, config)

    if(!config.hooks) {
      debug("No hooks provided (browser mode requires pre-instantiated hooks)", 2)

      return null
    }

    const instance = new ActionHooks({...config, debug})

    debug("Hooks loaded successfully for %o", 2, instance.actionKind)

    return instance
  }

  /**
   * Invoke a dynamically-named hook such as `before$foo`.
   *
   * @param {string} kind - Hook namespace.
   * @param {string|symbol} activityName - Activity identifier.
   * @param {unknown} context - Pipeline context supplied to the hook.
   * @returns {Promise<void>}
   */
  async callHook(kind, activityName, context) {
    try {
      const debug = this.#debug
      const hooks = this.#hooks

      if(!hooks)
        return

      const stringActivityName = Data.isType(activityName, "Symbol")
        ? activityName.description
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
        await Time.after(hookTimeout)
        throw Sass.new(`Hook ${hookName} execution exceeded timeout of ${hookTimeout}ms`)
      })()

      try {
        debug("Starting Promise race for hook: %o", 4, hookName)
        await Promised.race([
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

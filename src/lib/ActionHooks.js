import {setTimeout as timeout} from "timers/promises"
import {Data, FileObject, Sass, Util, Valid} from "@gesslar/toolkit"

/**
 * @typedef {(message: string, level?: number, ...args: Array<unknown>) => void} DebugFn
 */

/**
 * @typedef {object} ActionHooksConfig
 * @property {string} [actionKind] Action identifier shared between runner and hooks.
 * @property {FileObject|string} [hooksFile] File handle or path used to import the hooks module.
 * @property {unknown} [hooksObject] Already-instantiated hooks implementation (skips loading).
 * @property {number} [hookTimeout] Timeout applied to hook execution in milliseconds.
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
  #hooksObject = null
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
   * @param {(message: string, level?: number, ...args: Array<unknown>) => void} debug Debug function
   */
  constructor(
    {actionKind, hooksFile, hooksObject, hookTimeout = 1_000},
    debug,
  ) {
    this.#actionKind = actionKind
    this.#hooksFile = hooksFile
    this.#hooksObject = hooksObject
    this.#timeout = hookTimeout
    this.#debug = debug
  }

  /**
   * Gets the action identifier.
   *
   * @returns {string|null} Action identifier or instance
   */
  get actionKind() {
    return this.#actionKind
  }

  /**
   * Gets the hooks file object.
   *
   * @returns {FileObject|null} File object containing hooks
   */
  get hooksFile() {
    return this.#hooksFile
  }

  /**
   * Gets the loaded hooks object.
   *
   * @returns {HookModule|null} Hooks object or null if not loaded
   */
  get hooks() {
    return this.#hooksObject
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
   * If a hooksObject is provided in config, it's used directly; otherwise, hooks are loaded from file.
   *
   * @param {ActionHooksConfig} config Configuration object with hooks settings
   * @param {DebugFn} debug The debug function.
   * @returns {Promise<ActionHooks>} Initialized hook manager
   */
  static async new(config, debug) {
    debug("Creating new HookManager instance with args: %o", 2, config)

    const instance = new ActionHooks(config, debug)
    if(!instance.#hooksObject) {
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

        instance.#hooksObject = hooks
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
   * Invoke a dynamically-named hook such as `before$foo` or `after$foo`.
   * The hook name is constructed by combining the kind with the activity name.
   * Symbols are converted to their description. Non-alphanumeric characters are filtered out.
   *
   * @param {'before'|'after'|'setup'|'cleanup'|string} kind Hook namespace.
   * @param {string|symbol} activityName Activity identifier.
   * @param {unknown} context Pipeline context supplied to the hook.
   * @returns {Promise<void>}
   * @throws {Sass} If the hook execution fails or exceeds timeout.
   */
  async callHook(kind, activityName, context) {
    const debug = this.#debug
    const hooks = this.#hooksObject

    if(!hooks)
      return

    const stringActivityName = Data.isType(activityName, "Symbol")
      ? activityName.description()
      : activityName

    const hookName = this.#getActivityHookName(kind, stringActivityName)

    try {
      debug("Looking for hook: %o", 4, hookName)

      const hook = hooks[hookName]
      if(!hook)
        return

      debug("Triggering hook: %o", 4, hookName)
      Valid.type(hook, "Function", `Hook "${hookName}" is not a function`)

      const hookFunction = async() => {
        debug("Hook function starting execution: %o", 4, hookName)

        const duration = (
          await Util.time(() => hook.call(this.#hooksObject, context))
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
        throw Sass.new(`Processing hook ${hookName}`, error)
      }

      debug("We made it throoough the wildernessss", 4)

    } catch(error) {
      throw Sass.new(`Processing hook ${hookName}`, error)
    }
  }

  /**
   * Transforms an activity name into a hook-compatible name.
   * Converts "my activity name" to "myActivityName" and combines with event kind.
   * Example: ("before", "my activity") => "before$myActivity"
   *
   * @param {string} event Hook event type (before, after, etc.)
   * @param {string} activityName The raw activity name
   * @returns {string} The formatted hook name
   * @private
   */
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

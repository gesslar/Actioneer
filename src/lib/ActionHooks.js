import {FileObject, Sass} from "@gesslar/toolkit"
import {ActionHooks as BrowserActionHooks} from "../browser/index.js"

/**
 * @typedef {(message: string, level?: number, ...args: Array<unknown>) => void} DebugFn
 */

/**
 * @typedef {object} NodeActionHooksConfig
 * @property {string} actionKind Action identifier shared between runner and hooks.
 * @property {FileObject} [hooksFile] File handle used to import the hooks module.
 * @property {unknown} [hooks] Already-instantiated hooks implementation (skips loading).
 * @property {number} [hookTimeout] Timeout applied to hook execution in milliseconds.
 * @property {DebugFn} debug Logger to emit diagnostics.
 */

/**
 * Node.js-enhanced ActionHooks that extends browser version with file-based hook loading.
 * Inherits all browser functionality and adds FileObject-based hook import capability.
 */
export default class ActionHooks extends BrowserActionHooks {
  /** @type {FileObject|null} */
  #hooksFile = null

  /**
   * Creates a new ActionHook instance.
   *
   * @param {NodeActionHooksConfig} config Configuration values describing how to load the hooks.
   */
  constructor({actionKind, hooksFile, hooks, hookTimeout = 1_000, debug}) {
    super({actionKind, hooks, hookTimeout, debug})
    this.#hooksFile = hooksFile
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

    // If hooks already provided, use parent class factory
    if(config.hooks) {
      return super.new(config, debug)
    }

    // Load hooks from file
    if(!config.hooksFile) {
      debug("No hooks file provided", 2)

      return null
    }

    const hooksFile = new FileObject(config.hooksFile)

    debug("Loading hooks from %o", 2, hooksFile.uri)
    debug("Checking hooks file exists: %o", 2, hooksFile.uri)

    if(!await hooksFile.exists)
      throw Sass.new(`No such hooks file, ${hooksFile.uri}`)

    try {
      const hooksImport = await hooksFile.import()

      if(!hooksImport)
        return null

      debug("Hooks file imported successfully as a module", 2)

      if(!hooksImport[config.actionKind])
        return null

      const hooks = new hooksImport[config.actionKind]({debug})

      debug(hooks.constructor.name, 4)
      debug("Hooks loaded successfully for %o", 2, config.actionKind)

      // Create instance with loaded hooks
      return new ActionHooks({...config, hooks, debug})
    } catch(error) {
      debug("Failed to load hooks %o: %o", 1, hooksFile.uri, error.message)

      return null
    }
  }

}

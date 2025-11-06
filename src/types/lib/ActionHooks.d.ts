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
  /**
   * Static factory method to create and initialize a hook manager.
   * Loads hooks from the specified file and returns an initialized instance.
   * If a hooksObject is provided in config, it's used directly; otherwise, hooks are loaded from file.
   *
   * @param {ActionHooksConfig} config Configuration object with hooks settings
   * @param {DebugFn} debug The debug function.
   * @returns {Promise<ActionHooks>} Initialized hook manager
   */
  static 'new'(config: ActionHooksConfig, debug: DebugFn): Promise<ActionHooks>
  /**
   * Creates a new ActionHook instance.
   *
   * @param {ActionHooksConfig} config Configuration values describing how to load the hooks.
   * @param {(message: string, level?: number, ...args: Array<unknown>) => void} debug Debug function
   */
  constructor({ actionKind, hooksFile, hooksObject, hookTimeout }: ActionHooksConfig, debug: (message: string, level?: number, ...args: Array<unknown>) => void)
  /**
   * Gets the action identifier.
   *
   * @returns {string|null} Action identifier or instance
   */
  get actionKind(): string | null
  /**
   * Gets the hooks file object.
   *
   * @returns {FileObject|null} File object containing hooks
   */
  get hooksFile(): FileObject | null
  /**
   * Gets the loaded hooks object.
   *
   * @returns {HookModule|null} Hooks object or null if not loaded
   */
  get hooks(): HookModule | null
  /**
   * Gets the hook execution timeout in milliseconds.
   *
   * @returns {number} Timeout in milliseconds
   */
  get timeout(): number
  /**
   * Gets the setup hook function if available.
   *
   * @returns {(args: object) => unknown|null} Setup hook function or null
   */
  get setup(): (args: object) => unknown | null
  /**
   * Gets the cleanup hook function if available.
   *
   * @returns {(args: object) => unknown|null} Cleanup hook function or null
   */
  get cleanup(): (args: object) => unknown | null
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
  callHook(kind: 'before' | 'after' | 'setup' | 'cleanup' | string, activityName: string | symbol, context: unknown): Promise<void>
  #private
}
export type DebugFn = (message: string, level?: number, ...args: Array<unknown>) => void
export type ActionHooksConfig = {
  /**
   * Action identifier shared between runner and hooks.
   */
  actionKind?: string | undefined;
  /**
   * File handle or path used to import the hooks module.
   */
  hooksFile?: string | FileObject | undefined;
  /**
   * Already-instantiated hooks implementation (skips loading).
   */
  hooksObject?: unknown;
  /**
   * Timeout applied to hook execution in milliseconds.
   */
  hookTimeout?: number | undefined;
}
export type HookModule = Record<string, (context: unknown) => Promise<unknown> | unknown>
import { FileObject } from '@gesslar/toolkit'
//# sourceMappingURL=ActionHooks.d.ts.map

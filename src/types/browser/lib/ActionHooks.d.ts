/**
 * @typedef {(message: string, level?: number, ...args: Array<unknown>) => void} DebugFn
 */
/**
 * @typedef {Record<string, (context: unknown) => Promise<unknown>|unknown>} HookModule
 *
 * @typedef {object} ActionHooksConfig
 * @property {string} actionKind - Action identifier shared between runner and hooks.
 * @property {object|Function|null} hooks - Pre-instantiated hooks object, a constructor to instantiate, or null.
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
    /**
     * Static factory method to create and initialize a hook manager.
     * Browser version: Only works with pre-instantiated hooks passed via config.hooks.
     *
     * @param {ActionHooksConfig} config - Configuration object with hooks property
     * @param {DebugFn} debug - The debug function.
     * @returns {Promise<ActionHooks?>} Initialized hook manager or null if no hooks provided
     */
    static "new"(config: ActionHooksConfig, debug: DebugFn): Promise<ActionHooks | null>;
    /**
     * Creates a new ActionHook instance.
     *
     * @param {ActionHooksConfig} config - Configuration values describing how to load the hooks.
     */
    constructor({ actionKind, hooks, hookTimeout, debug }: ActionHooksConfig);
    /**
     * Gets the action identifier.
     *
     * @returns {string} Action identifier or instance
     */
    get actionKind(): string;
    /**
     * Gets the loaded hooks object.
     * If the stored value is a plain object it is returned as-is.
     * If it is a constructor function a new instance is created and returned.
     *
     * @returns {object?} Hooks object or null if not loaded
     */
    get hooks(): object | null;
    /**
     * Gets the hook execution timeout in milliseconds.
     *
     * @returns {number} Timeout in milliseconds
     */
    get timeout(): number;
    /**
     * Gets the setup hook function if available.
     *
     * @returns {(args: object) => unknown} Setup hook function or null
     */
    get setup(): (args: object) => unknown;
    /**
     * Gets the cleanup hook function if available.
     *
     * @returns {(args: object) => unknown} Cleanup hook function or null
     */
    get cleanup(): (args: object) => unknown;
    /**
     * Invoke a dynamically-named hook such as `before$foo`.
     *
     * @param {string} kind - Hook namespace.
     * @param {string|symbol} activityName - Activity identifier.
     * @param {unknown} oldContext - Pipeline context supplied to the hook.
     * @param {unknown} newContext - For after$ hooks, the result of the op
     * @returns {Promise<void>}
     */
    callHook(kind: string, activityName: string | symbol, oldContext: unknown, newContext: unknown): Promise<void>;
    #private;
}
export type DebugFn = (message: string, level?: number, ...args: Array<unknown>) => void;
export type HookModule = Record<string, (context: unknown) => Promise<unknown> | unknown>;
export type ActionHooksConfig = {
    /**
     * - Action identifier shared between runner and hooks.
     */
    actionKind: string;
    /**
     * - Pre-instantiated hooks object, a constructor to instantiate, or null.
     */
    hooks: object | Function | null;
    /**
     * - Timeout applied to hook execution in milliseconds.
     */
    hookTimeout?: number | undefined;
    /**
     * - Logger to emit diagnostics.
     */
    debug: DebugFn;
};
//# sourceMappingURL=ActionHooks.d.ts.map
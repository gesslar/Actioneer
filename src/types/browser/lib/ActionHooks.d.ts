/**
 * @typedef {(message: string, level?: number, ...args: Array<unknown>) => void} DebugFn
 */
/**
 * @typedef {object} ActionHooksConfig
 * @property {string} actionKind Action identifier shared between runner and hooks.
 * @property {unknown} hooks Already-instantiated hooks implementation.
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
 *
 * Browser version: Requires pre-instantiated hooks. File-based loading is not supported.
 */
export default class ActionHooks {
    /**
     * Static factory method to create and initialize a hook manager.
     * Browser version: Only works with pre-instantiated hooks passed via config.hooks.
     *
     * @param {ActionHooksConfig} config Configuration object with hooks property
     * @param {DebugFn} debug The debug function.
     * @returns {Promise<ActionHooks|null>} Initialized hook manager or null if no hooks provided
     */
    static "new"(config: ActionHooksConfig, debug: DebugFn): Promise<ActionHooks | null>;
    /**
     * Creates a new ActionHook instance.
     *
     * @param {ActionHooksConfig} config Configuration values describing how to load the hooks.
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
     *
     * @returns {object|null} Hooks object or null if not loaded
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
     * @returns {(args: object) => unknown|null} Setup hook function or null
     */
    get setup(): (args: object) => unknown | null;
    /**
     * Gets the cleanup hook function if available.
     *
     * @returns {(args: object) => unknown|null} Cleanup hook function or null
     */
    get cleanup(): (args: object) => unknown | null;
    /**
     * Invoke a dynamically-named hook such as `before$foo`.
     *
     * @param {'before'|'after'|'setup'|'cleanup'|string} kind Hook namespace.
     * @param {string|symbol} activityName Activity identifier.
     * @param {unknown} context Pipeline context supplied to the hook.
     * @returns {Promise<void>}
     */
    callHook(kind: "before" | "after" | "setup" | "cleanup" | string, activityName: string | symbol, context: unknown): Promise<void>;
    #private;
}
export type DebugFn = (message: string, level?: number, ...args: Array<unknown>) => void;
export type ActionHooksConfig = {
    /**
     * Action identifier shared between runner and hooks.
     */
    actionKind: string;
    /**
     * Already-instantiated hooks implementation.
     */
    hooks: unknown;
    /**
     * Timeout applied to hook execution in milliseconds.
     */
    hookTimeout?: number | undefined;
    /**
     * Logger to emit diagnostics.
     */
    debug: DebugFn;
};
export type HookModule = Record<string, (context: unknown) => Promise<unknown> | unknown>;
//# sourceMappingURL=ActionHooks.d.ts.map
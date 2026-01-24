/**
 * Type imports
 *
 * @import {default as ActionHooks} from "./ActionHooks.js"
 * @import {default as ActionRunner} from "./ActionRunner.js"
 */
/**
 * @typedef {object} WrappedActivityConfig
 * @property {string|symbol} name Activity identifier used by hooks/logs.
 * @property {(context: unknown) => unknown|Promise<unknown>|ActionWrapper} op Operation or nested wrapper to execute.
 * @property {number} [kind] Optional loop semantic flags.
 * @property {(context: unknown) => boolean|Promise<boolean>} [pred] Predicate tied to WHILE/UNTIL semantics.
 * @property {unknown} [action] Parent action instance supplied when invoking the op.
 * @property {(message: string, level?: number, ...args: Array<unknown>) => void} [debug] Optional logger reference.
 */
/**
 * Thin wrapper that materialises {@link Activity} instances on demand.
 */
export default class ActionWrapper {
    /**
     * Create a wrapper from the builder payload.
     *
     * @param {{activities: Map<string|symbol, WrappedActivityConfig>, debug: (message: string, level?: number, ...args: Array<unknown>) => void}} init Builder payload containing activities + logger.
     */
    constructor({ activities, hooks, debug, done: doneCallback, action }: {
        activities: Map<string | symbol, WrappedActivityConfig>;
        debug: (message: string, level?: number, ...args: Array<unknown>) => void;
    });
    /**
     * Unique identifier for this wrapper instance.
     * Used by BREAK/CONTINUE to match events to the correct loop.
     *
     * @returns {symbol} Unique symbol identifier
     */
    get id(): symbol;
    /**
     * Iterator over the registered activities.
     *
     * @returns {Iterator<Activity>} Iterator yielding Activity instances.
     */
    get activities(): Iterator<Activity>;
    /**
     * Get the done callback if registered.
     *
     * @returns {((context: unknown) => unknown|Promise<unknown>)|null} Done callback or null.
     */
    get done(): ((context: unknown) => unknown | Promise<unknown>) | null;
    /**
     * Get the action instance.
     *
     * @returns {unknown|null} Action instance or null.
     */
    get action(): unknown | null;
    #private;
}
export type WrappedActivityConfig = {
    /**
     * Activity identifier used by hooks/logs.
     */
    name: string | symbol;
    /**
     * Operation or nested wrapper to execute.
     */
    op: (context: unknown) => unknown | Promise<unknown> | ActionWrapper;
    /**
     * Optional loop semantic flags.
     */
    kind?: number | undefined;
    /**
     * Predicate tied to WHILE/UNTIL semantics.
     */
    pred?: ((context: unknown) => boolean | Promise<boolean>) | undefined;
    /**
     * Parent action instance supplied when invoking the op.
     */
    action?: unknown;
    /**
     * Optional logger reference.
     */
    debug?: ((message: string, level?: number, ...args: Array<unknown>) => void) | undefined;
};
import Activity from "./Activity.js";
//# sourceMappingURL=ActionWrapper.d.ts.map
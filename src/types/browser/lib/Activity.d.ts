/**
 * *
 */
export type ACTIVITY = number;
/**
 * @import {default as ActionBuilder} from "./ActionBuilder.js"
 * @import {default as ActionHooks} from "./ActionHooks.js"
 * @import {default as ActionWrapper} from "./ActionWrapper.js"
 **/
/**
 * Activity bit flags recognised by the builder. The flag decides
 * loop semantics for an activity.
 *
 * @readonly
 * @enum {number}
 * @property {number} WHILE - Execute activity while predicate returns true 1
 * @property {number} UNTIL - Execute activity until predicate returns true 2
 * @property {number} SPLIT - Execute activity with split/rejoin pattern for parallel execution 3
 * @property {number} IF - Execute activity if predicate returns true 4
 * @property {number} BREAK - Break out of a WHILE/UNTIL if predicate returns true 5
 * @property {number} CONTINUE - Returns to the top of a WHILE/UNTIL if predicate returns true 6
 */
export const ACTIVITY: Readonly<{
    WHILE: 1;
    UNTIL: 2;
    SPLIT: 3;
    IF: 4;
    BREAK: 5;
    CONTINUE: 6;
}>;
export default class Activity {
    /**
     * Construct an Activity definition wrapper.
     *
     * @param {object} init - Initial properties describing the activity operation, loop semantics, and predicate
     * @param {unknown} init.action - Parent action instance
     * @param {string|symbol} init.name - Activity identifier
     * @param {(context: unknown) => unknown|Promise<unknown>|ActionBuilder} init.op - Operation to execute
     * @param {number} [init.kind] - Optional loop semantics flags
     * @param {(context: unknown) => boolean|Promise<boolean>} [init.pred] - Optional predicate for WHILE/UNTIL
     * @param {ActionHooks} [init.hooks] - Optional hooks instance
     * @param {(context: unknown) => unknown} [init.splitter] - Optional splitter function for SPLIT activities
     * @param {(originalContext: unknown, splitResults: unknown) => unknown} [init.rejoiner] - Optional rejoiner function for SPLIT activities
     * @param {ActionWrapper} [init.wrapper] - Optional wrapper containing this activity
     */
    constructor({ action, name, op, kind, pred, hooks, splitter, rejoiner, wrapper }: {
        action: unknown;
        name: string | symbol;
        op: (context: unknown) => unknown | Promise<unknown> | ActionBuilder;
        kind?: number | undefined;
        pred?: ((context: unknown) => boolean | Promise<boolean>) | undefined;
        hooks?: ActionHooks | undefined;
        splitter?: ((context: unknown) => unknown) | undefined;
        rejoiner?: ((originalContext: unknown, splitResults: unknown) => unknown) | undefined;
        wrapper?: ActionWrapper | undefined;
    });
    /**
     * Unique identifier for this activity instance.
     *
     * @returns {symbol} Unique symbol identifier
     */
    get id(): symbol;
    /**
     * The activity name.
     *
     * @returns {string} - Activity identifier
     */
    get name(): string;
    /**
     * Bitflag kind for loop semantics.
     *
     * @returns {number|null} - Combined flags (e.g., WHILE or UNTIL)
     */
    get kind(): number | null;
    /**
     * The predicate function for WHILE/UNTIL/IF flows.
     *
     * @returns {(context: unknown) => boolean|Promise<boolean>|undefined} - Predicate used to continue/stop loops
     */
    get pred(): (context: unknown) => boolean | Promise<boolean> | undefined;
    /**
     * The current context (if set).
     *
     * @returns {unknown} Current context value
     */
    get context(): unknown;
    /**
     * The operator kind name (Function or ActionBuilder).
     *
     * @returns {string} - Kind name extracted via Data.typeOf
     */
    get opKind(): string;
    /**
     * The operator to execute (function or nested ActionBuilder).
     *
     * @returns {(context: unknown) => unknown|Promise<unknown>|ActionBuilder} - Activity operation
     */
    get op(): (context: unknown) => unknown | Promise<unknown> | ActionBuilder;
    /**
     * The splitter function for SPLIT activities.
     *
     * @returns {((context: unknown) => unknown)?} Splitter function or null
     */
    get splitter(): ((context: unknown) => unknown) | null;
    /**
     * The rejoiner function for SPLIT activities.
     *
     * @returns {((originalContext: unknown, splitResults: unknown) => unknown)?} Rejoiner function or null
     */
    get rejoiner(): ((originalContext: unknown, splitResults: unknown) => unknown) | null;
    /**
     * The action instance this activity belongs to.
     *
     * @returns {unknown} - Bound action instance
     */
    get action(): unknown;
    /**
     * Get the ActionWrapper containing this activity.
     * Used by BREAK/CONTINUE to signal the parent loop.
     *
     * @returns {ActionWrapper?} The wrapper or null
     */
    get wrapper(): ActionWrapper | null;
    /**
     * Execute the activity with before/after hooks.
     *
     * @param {unknown} context - Mutable context flowing through the pipeline
     * @returns {Promise<unknown>} - Activity result
     */
    run(context: unknown): Promise<unknown>;
    /**
     * Attach hooks to this activity instance.
     *
     * @param {ActionHooks} hooks - Hooks instance with optional before$/after$ methods
     * @returns {this} - This activity for chaining
     */
    setActionHooks(hooks: ActionHooks): this;
    /**
     * Get the hooks instance attached to this activity.
     *
     * @returns {ActionHooks?} The hooks instance or null
     */
    get hooks(): ActionHooks | null;
    #private;
}
import type { default as ActionBuilder } from "./ActionBuilder.js";
import type { default as ActionWrapper } from "./ActionWrapper.js";
import type { default as ActionHooks } from "./ActionHooks.js";
//# sourceMappingURL=Activity.d.ts.map
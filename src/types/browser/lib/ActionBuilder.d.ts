/**
 * Type imports
 *
 * @import {default as ActionRunner} from "./ActionRunner.js"
 *
 * @typedef {(message: string, level?: number, ...args: Array<unknown>) => void} DebugFn
 *
 * @typedef {object} ActionBuilderAction
 * @property {(builder: ActionBuilder) => void} setup - Function invoked during {@link ActionBuilder} to register activities.
 * @property {symbol} [tag] - Optional tag to reuse when reconstructing builders.
 *
 * @typedef {object} ActionBuilderConfig
 * @property {symbol} [tag] - Optional tag for the builder instance.
 * @property {DebugFn} [debug] - Logger used by the pipeline internals.
 *
 * @typedef {object} ActivityDefinition
 * @property {ActionBuilderAction|null} action - Parent action instance when available.
 * @property {DebugFn|null} debug - Logger function.
 * @property {string|symbol} name - Activity identifier.
 * @property {ActionFunction|import("./ActionWrapper.js").default} op - Operation to execute.
 * @property {number} [kind] - Optional kind flags from {@link ACTIVITY}.
 * @property {(context: unknown) => boolean|Promise<boolean>} [pred] - Loop predicate.
 *
 * @typedef {(context: unknown) => unknown|Promise<unknown>} ActionFunction
 */
/**
 * Fluent builder for describing how an action should process the context that
 * flows through the {@link ActionRunner}. Consumers register named activities,
 * and nested parallel pipelines before handing the builder back to the runner
 * for execution.
 *
 * Typical usage:
 *
 * ```js
 * const pipeline = new ActionBuilder(myAction)
 *   .act("prepare", ACTIVITY.ONCE, ctx => ctx.initialise())
 *   .parallel(parallel => parallel
 *     .act("step", ACTIVITY.MANY, ctx => ctx.consume())
 *   )
 *   .act("finalise", ACTIVITY.ONCE, ctx => ctx.complete())
 *   .build()
 * ```
 *
 * @class ActionBuilder
 */
export default class ActionBuilder {
    /**
     * Creates a new ActionBuilder instance with the provided action callback.
     *
     * @param {ActionBuilderAction} [action] - Base action invoked by the runner when a block satisfies the configured structure.
     * @param {ActionBuilderConfig} [config] - Options
     */
    constructor(action?: ActionBuilderAction, { tag, debug }?: ActionBuilderConfig);
    get tag(): symbol | null;
    /**
     * Register an activity that the runner can execute.
     *
     * Overloads:
     * - do(name, op) - Simple once-off activity
     * - do(name, kind, pred) - BREAK/CONTINUE control flow (no op, just predicate)
     * - do(name, kind, pred, opOrWrapper) - WHILE/UNTIL/IF with predicate and operation
     * - do(name, kind, splitter, rejoiner, opOrWrapper) - SPLIT with parallel execution
     *
     * @overload
     * @param {string|symbol} name - Activity name
     * @param {ActionFunction} op - Operation to execute once.
     * @returns {ActionBuilder}
     */
    do(name: string | symbol, op: ActionFunction): ActionBuilder;
    /**
     * @overload
     * @param {string|symbol} name - Activity name
     * @param {number} kind - ACTIVITY.BREAK or ACTIVITY.CONTINUE flag.
     * @param {(context: unknown) => boolean|Promise<boolean>} pred - Predicate to evaluate for control flow.
     * @returns {ActionBuilder}
     */
    do(name: string | symbol, kind: number, pred: (context: unknown) => boolean | Promise<boolean>): ActionBuilder;
    /**
     * @overload
     * @param {string|symbol} name - Activity name
     * @param {number} kind - Activity kind (WHILE, UNTIL, or IF) from {@link ACTIVITY}.
     * @param {(context: unknown) => boolean|Promise<boolean>} pred - Predicate executed before/after the op.
     * @param {ActionFunction|ActionBuilder} op - Operation or nested builder to execute.
     * @returns {ActionBuilder}
     */
    do(name: string | symbol, kind: number, pred: (context: unknown) => boolean | Promise<boolean>, op: ActionFunction | ActionBuilder): ActionBuilder;
    /**
     * @overload
     * @param {string|symbol} name - Activity name
     * @param {number} kind - ACTIVITY.SPLIT flag.
     * @param {(context: unknown) => unknown} splitter - Splitter function for SPLIT mode.
     * @param {(originalContext: unknown, splitResults: unknown) => unknown} rejoiner - Rejoiner function for SPLIT mode.
     * @param {ActionFunction|ActionBuilder} op - Operation or nested builder to execute.
     * @returns {ActionBuilder}
     */
    do(name: string | symbol, kind: number, splitter: (context: unknown) => unknown, rejoiner: (originalContext: unknown, splitResults: unknown) => unknown, op: ActionFunction | ActionBuilder): ActionBuilder;
    /**
     * Configure hooks to be loaded from a file when the action is built.
     *
     * @param {string} hooksFile - Path to the hooks module file.
     * @param {string} hooksKind - Name of the exported hooks class to instantiate.
     * @returns {ActionBuilder} - The builder instance for chaining.
     * @throws {Sass} If hooks have already been configured.
     */
    withHooksFile(hooksFile: string, hooksKind: string): ActionBuilder;
    /**
     * Configure hooks using a pre-instantiated hooks object.
     *
     * @param {ActionHooks} hooks - An already-instantiated hooks instance.
     * @returns {ActionBuilder} - The builder instance for chaining.
     * @throws {Sass} If hooks have already been configured with a different instance.
     */
    withHooks(hooks: ActionHooks): ActionBuilder;
    /**
     * Configure the action instance if not already set.
     * Used to propagate parent action context to nested builders.
     *
     * @param {ActionBuilderAction} action - The action instance to inherit.
     * @returns {ActionBuilder} The builder instance for chaining.
     */
    withAction(action: ActionBuilderAction): ActionBuilder;
    /**
     * Register a callback to be executed after all activities complete.
     *
     * @param {ActionFunction} callback - Function to execute at the end of the pipeline.
     * @returns {ActionBuilder} The builder instance for chaining.
     */
    done(callback: ActionFunction): ActionBuilder;
    /**
     * Finalises the builder and returns a payload that can be consumed by the
     * runner.
     *
     * @returns {Promise<ActionWrapper>} Payload consumed by the {@link ActionRunner} constructor.
     */
    build(runner: any): Promise<ActionWrapper>;
    #private;
}
/**
 * Type imports
 */
export type DebugFn = (message: string, level?: number, ...args: Array<unknown>) => void;
/**
 * Type imports
 */
export type ActionBuilderAction = {
    /**
     * - Function invoked during {@link ActionBuilder} to register activities.
     */
    setup: (builder: ActionBuilder) => void;
    /**
     * - Optional tag to reuse when reconstructing builders.
     */
    tag?: symbol | undefined;
};
/**
 * Type imports
 */
export type ActionBuilderConfig = {
    /**
     * - Optional tag for the builder instance.
     */
    tag?: symbol | undefined;
    /**
     * - Logger used by the pipeline internals.
     */
    debug?: DebugFn | undefined;
};
/**
 * Type imports
 */
export type ActivityDefinition = {
    /**
     * - Parent action instance when available.
     */
    action: ActionBuilderAction | null;
    /**
     * - Logger function.
     */
    debug: DebugFn | null;
    /**
     * - Activity identifier.
     */
    name: string | symbol;
    /**
     * - Operation to execute.
     */
    op: ActionFunction | import("./ActionWrapper.js").default;
    /**
     * - Optional kind flags from {@link ACTIVITY}.
     */
    kind?: number | undefined;
    /**
     * - Loop predicate.
     */
    pred?: ((context: unknown) => boolean | Promise<boolean>) | undefined;
};
/**
 * Type imports
 */
export type ActionFunction = (context: unknown) => unknown | Promise<unknown>;
import ActionHooks from "./ActionHooks.js";
import ActionWrapper from "./ActionWrapper.js";
//# sourceMappingURL=ActionBuilder.d.ts.map
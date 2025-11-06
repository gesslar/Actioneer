/** @typedef {import("./ActionRunner.js").default} ActionRunner */
/** @typedef {typeof import("./Activity.js").ACTIVITY} ActivityFlags */
/**
 * @typedef {(message: string, level?: number, ...args: Array<unknown>) => void} DebugFn
 */
/**
 * @typedef {object} ActionBuilderAction
 * @property {(builder: ActionBuilder) => void} setup Function invoked during {@link ActionBuilder#build} to register activities.
 * @property {symbol} [tag] Optional tag to reuse when reconstructing builders.
 */
/**
 * @typedef {object} ActionBuilderConfig
 * @property {symbol} [tag] Optional tag for the builder instance.
 * @property {DebugFn} [debug] Logger used by the pipeline internals.
 */
/**
 * @typedef {object} ActivityDefinition
 * @property {ActionBuilderAction|null} action Parent action instance when available.
 * @property {DebugFn|null} debug Logger function.
 * @property {string|symbol} name Activity identifier.
 * @property {ActionFunction|import("./ActionWrapper.js").default} op Operation to execute.
 * @property {number} [kind] Optional kind flags from {@link ActivityFlags}.
 * @property {(context: unknown) => boolean|Promise<boolean>} [pred] Loop predicate.
 * @property {(context: unknown) => unknown} [splitter] Function to split context for parallel execution (SPLIT activities).
 * @property {(originalContext: unknown, splitResults: unknown) => unknown} [rejoiner] Function to rejoin split results (SPLIT activities).
 */
/**
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
  constructor(action?: ActionBuilderAction, { tag, debug }?: ActionBuilderConfig)
  /**
   * Get the builder's tag symbol.
   *
   * @returns {symbol|null} The tag symbol for this builder instance
   */
  get tag(): symbol | null
  /**
   * Register an activity that the runner can execute.
   *
   * Overloads:
   * - do(name, op)
   * - do(name, kind, pred, opOrWrapper)
   *
   * @overload
   * @param {string|symbol} name Activity name
   * @param {ActionFunction} op Operation to execute once.
   * @returns {ActionBuilder}
   */
  do(name: string | symbol, op: ActionFunction): ActionBuilder
  /**
   * @overload
   * @param {string|symbol} name Activity name
   * @param {number} kind Kind bitfield from {@link ActivityFlags}.
   * @param {(context: unknown) => boolean|Promise<boolean>} pred Predicate executed before/after the op.
   * @param {ActionFunction|import("./ActionWrapper.js").default} op Operation or nested wrapper to execute.
   * @returns {ActionBuilder}
   */
  do(name: string | symbol, kind: number, pred: (context: unknown) => boolean | Promise<boolean>, op: ActionFunction | import('./ActionWrapper.js').default): ActionBuilder
  /**
   * @overload
   * @param {string|symbol} name Activity name
   * @param {number} kind Kind bitfield (ACTIVITY.SPLIT).
   * @param {(context: unknown) => unknown} splitter Function to split context for parallel execution.
   * @param {(originalContext: unknown, splitResults: unknown) => unknown} rejoiner Function to rejoin split results with original context.
   * @param {ActionFunction|ActionBuilder} op Operation or nested ActionBuilder to execute on split context.
   * @returns {ActionBuilder}
   */
  // eslint-disable-next-line @stylistic/max-len
  do(name: string | symbol, kind: number, splitter: (context: unknown) => unknown, rejoiner: (originalContext: unknown, splitResults: unknown) => unknown, op: ActionFunction | ActionBuilder): ActionBuilder
  /**
   * Configure hooks to be loaded from a file when the action is built.
   *
   * @param {string} hooksFile Path to the hooks module file.
   * @param {string} hooksKind Name of the exported hooks class to instantiate.
   * @returns {ActionBuilder} The builder instance for chaining.
   * @throws {Sass} If hooks have already been configured.
   */
  withHooksFile(hooksFile: string, hooksKind: string): ActionBuilder
  /**
   * Configure hooks using a pre-instantiated hooks object.
   *
   * @param {import("./ActionHooks.js").default} hooks An already-instantiated hooks instance.
   * @returns {ActionBuilder} The builder instance for chaining.
   * @throws {Sass} If hooks have already been configured.
   */
  withHooks(hooks: import('./ActionHooks.js').default): ActionBuilder
  /**
   * Configure hooks using an ActionHooks instance directly (typically used internally).
   *
   * @param {import("./ActionHooks.js").default} actionHooks Pre-configured ActionHooks instance.
   * @returns {ActionBuilder} The builder instance for chaining.
   * @throws {Sass} If hooks have already been configured.
   */
  withActionHooks(actionHooks: import('./ActionHooks.js').default): ActionBuilder
  /**
   * Finalises the builder and returns a payload that can be consumed by the
   * runner.
   *
   * @returns {Promise<import("./ActionWrapper.js").default>} Payload consumed by the {@link ActionRunner} constructor.
   */
  build(): Promise<import('./ActionWrapper.js').default>
  /**
   * Check if this builder has ActionHooks configured.
   *
   * @returns {boolean} True if ActionHooks have been configured.
   */
  get hasActionHooks(): boolean
  #private
}
export type ActionRunner = import('./ActionRunner.js').default
export type ActivityFlags = typeof import('./Activity.js').ACTIVITY
export type DebugFn = (message: string, level?: number, ...args: Array<unknown>) => void
export type ActionBuilderAction = {
  /**
   * Function invoked during {@link ActionBuilder#build} to register activities.
   */
  setup: (builder: ActionBuilder) => void;
  /**
   * Optional tag to reuse when reconstructing builders.
   */
  tag?: symbol | undefined;
}
export type ActionBuilderConfig = {
  /**
   * Optional tag for the builder instance.
   */
  tag?: symbol | undefined;
  /**
   * Logger used by the pipeline internals.
   */
  debug?: DebugFn | undefined;
}
export type ActivityDefinition = {
  /**
   * Parent action instance when available.
   */
  action: ActionBuilderAction | null;
  /**
   * Logger function.
   */
  debug: DebugFn | null;
  /**
   * Activity identifier.
   */
  name: string | symbol;
  /**
   * Operation to execute.
   */
  op: ActionFunction | import('./ActionWrapper.js').default;
  /**
   * Optional kind flags from {@link ActivityFlags}.
   */
  kind?: number | undefined;
  /**
   * Loop predicate.
   */
  pred?: ((context: unknown) => boolean | Promise<boolean>) | undefined;
  /**
   * Function to split context for parallel execution (SPLIT activities).
   */
  splitter?: ((context: unknown) => unknown) | undefined;
  /**
   * Function to rejoin split results (SPLIT activities).
   */
  rejoiner?: ((originalContext: unknown, splitResults: unknown) => unknown) | undefined;
}
export type ActionFunction = (context: unknown) => unknown | Promise<unknown>
//# sourceMappingURL=ActionBuilder.d.ts.map

/**
 * @typedef {object} WrappedActivityConfig
 * @property {string|symbol} name Activity identifier used by hooks/logs.
 * @property {(context: unknown) => unknown|Promise<unknown>|import("./ActionBuilder.js").default} op Operation or nested ActionBuilder to execute.
 * @property {number} [kind] Optional loop semantic flags.
 * @property {(context: unknown) => boolean|Promise<boolean>} [pred] Predicate tied to WHILE/UNTIL semantics.
 * @property {(context: unknown) => unknown} [splitter] Splitter function for SPLIT activities.
 * @property {(originalContext: unknown, splitResults: unknown) => unknown} [rejoiner] Rejoiner function for SPLIT activities.
 * @property {unknown} [action] Parent action instance supplied when invoking the op.
 * @property {(message: string, level?: number, ...args: Array<unknown>) => void} [debug] Optional logger reference.
 */
/**
 * @typedef {Generator<Activity, void, unknown>} ActivityIterator
 */
/**
 * Thin wrapper that materialises {@link Activity} instances on demand.
 */
export default class ActionWrapper {
  /**
   * Create a wrapper from the builder payload.
   *
   * @param {object} config Builder payload containing activities + logger
   * @param {Map<string|symbol, WrappedActivityConfig>} config.activities Activities map
   * @param {(message: string, level?: number, ...args: Array<unknown>) => void} config.debug Debug function
   * @param {object} config.hooks Hooks object
   */
  constructor(config: {
    activities: Map<string | symbol, WrappedActivityConfig>;
    debug: (message: string, level?: number, ...args: Array<unknown>) => void;
    hooks: object;
  })
  /**
   * Iterator over the registered activities.
   *
   * @returns {ActivityIterator} Lazy iterator yielding Activity instances.
   */
  get activities(): ActivityIterator
  #private
}
export type WrappedActivityConfig = {
  /**
   * Activity identifier used by hooks/logs.
   */
  name: string | symbol;
  /**
   * Operation or nested ActionBuilder to execute.
   */
  op: (context: unknown) => unknown | Promise<unknown> | import('./ActionBuilder.js').default;
  /**
   * Optional loop semantic flags.
   */
  kind?: number | undefined;
  /**
   * Predicate tied to WHILE/UNTIL semantics.
   */
  pred?: ((context: unknown) => boolean | Promise<boolean>) | undefined;
  /**
   * Splitter function for SPLIT activities.
   */
  splitter?: ((context: unknown) => unknown) | undefined;
  /**
   * Rejoiner function for SPLIT activities.
   */
  rejoiner?: ((originalContext: unknown, splitResults: unknown) => unknown) | undefined;
  /**
   * Parent action instance supplied when invoking the op.
   */
  action?: unknown;
  /**
   * Optional logger reference.
   */
  debug?: ((message: string, level?: number, ...args: Array<unknown>) => void) | undefined;
}
export type ActivityIterator = Generator<Activity, void, unknown>
import Activity from './Activity.js'
//# sourceMappingURL=ActionWrapper.d.ts.map

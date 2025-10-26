/** @typedef {import("./ActionHooks.js").default} ActionHooks */
/**
 * @typedef {(message: string, level?: number, ...args: Array<unknown>) => void} DebugFn
 */
/**
 * @typedef {object} ActionRunnerOptions
 * @property {ActionHooks} [hooks] Pre-configured hooks.
 * @property {DebugFn} [debug] Logger function.
 */
/**
 * Orchestrates execution of {@link ActionBuilder}-produced pipelines.
 *
 * Activities run in insertion order, with support for once-off work, repeated
 * loops, and nested parallel pipelines. Each activity receives a mutable
 * context object under `result.value` that can be replaced or enriched.
 */
export default class ActionRunner extends Piper {
  /**
   * Instantiate a runner over an optional action wrapper.
   *
   * @param {import("./ActionWrapper.js").default|null} wrappedAction Output of {@link ActionBuilder#build}.
   * @param {ActionRunnerOptions} [options] Optional hooks/debug overrides.
   */
  constructor(wrappedAction: import('./ActionWrapper.js').default | null, { hooks, debug }?: ActionRunnerOptions)
  /**
   * Executes the configured action pipeline.
   *
   * @param {unknown} context - Seed value passed to the first activity.
   * @returns {Promise<unknown>} Final value produced by the pipeline, or null when a parallel stage reports failures.
   * @throws {Sass} When no activities are registered or required parallel builders are missing.
   */
  run(context: unknown): Promise<unknown>
  /**
   * Configure hooks to be lazily loaded when the pipeline runs.
   *
   * @param {string} hooksPath Absolute path to the module exporting the hooks class.
   * @param {string} className Constructor to instantiate from the hooks module.
   * @returns {this} Runner instance for chaining.
   */
  setHooks(hooksPath: string, className: string): this
  #private
}
export type ActionHooks = import('./ActionHooks.js').default
export type DebugFn = (message: string, level?: number, ...args: Array<unknown>) => void
export type ActionRunnerOptions = {
  /**
   * Pre-configured hooks.
   */
  hooks?: import('./ActionHooks.js').default | undefined;
  /**
   * Logger function.
   */
  debug?: DebugFn | undefined;
}
import Piper from './Piper.js'
//# sourceMappingURL=ActionRunner.d.ts.map

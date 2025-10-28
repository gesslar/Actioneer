/**
 * @typedef {(message: string, level?: number, ...args: Array<unknown>) => void} DebugFn
 */
/**
 * @typedef {object} ActionRunnerOptions
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
   * @param {import("./ActionBuilder.js").default|null} actionBuilder ActionBuilder to build.
   * @param {ActionRunnerOptions} [options] Optional debug overrides.
   */
  constructor(actionBuilder: import('./ActionBuilder.js').default | null, { debug }?: ActionRunnerOptions)
  /**
   * Executes the configured action pipeline.
   *
   * @param {unknown} context - Seed value passed to the first activity.
   * @returns {Promise<unknown>} Final value produced by the pipeline, or null when a parallel stage reports failures.
   * @throws {Sass} When no activities are registered or required parallel builders are missing.
   */
  run(context: unknown): Promise<unknown>
  #private
}
export type DebugFn = (message: string, level?: number, ...args: Array<unknown>) => void
export type ActionRunnerOptions = {
  /**
   * Logger function.
   */
  debug?: DebugFn | undefined;
}
import Piper from './Piper.js'
//# sourceMappingURL=ActionRunner.d.ts.map

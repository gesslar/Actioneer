/**
 * Types
 *
 * @import {default as ActionBuilder} from "./ActionBuilder.js"
 * @import {default as ActionWrapper} from "./ActionWrapper.js"
 */
/**
 * @typedef {(message: string, level?: number, ...args: Array<unknown>) => void} DebugFn
 *
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
    constructor(actionBuilder: import("./ActionBuilder.js").default | null, { debug }?: ActionRunnerOptions);
    /**
     * Executes the configured action pipeline.
     * Builds the ActionWrapper on first run and caches it for subsequent calls.
     * Supports WHILE, UNTIL, IF, SPLIT, BREAK, and CONTINUE activity kinds.
     *
     * @param {unknown} context - Seed value passed to the first activity.
     * @param {import("./ActionWrapper.js").default|null} [parentWrapper] - Parent wrapper for BREAK/CONTINUE signaling.
     * @returns {Promise<unknown>} Final value produced by the pipeline.
     * @throws {Sass} When no activities are registered, conflicting activity kinds are used, or execution fails.
     */
    run(context: unknown, parentWrapper?: import("./ActionWrapper.js").default | null): Promise<unknown>;
    #private;
}
export type DebugFn = (message: string, level?: number, ...args: Array<unknown>) => void;
export type ActionRunnerOptions = {
    /**
     * Logger function.
     */
    debug?: DebugFn | undefined;
};
import Piper from "./Piper.js";
//# sourceMappingURL=ActionRunner.d.ts.map
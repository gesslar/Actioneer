/**
 * @typedef {(message: string, level?: number, ...args: Array<unknown>) => void} DebugFn
 */
/**
 * @typedef {object} NodeActionHooksConfig
 * @property {string} actionKind Action identifier shared between runner and hooks.
 * @property {FileObject} [hooksFile] File handle used to import the hooks module.
 * @property {unknown} [hooks] Already-instantiated hooks implementation (skips loading).
 * @property {number} [hookTimeout] Timeout applied to hook execution in milliseconds.
 * @property {DebugFn} debug Logger to emit diagnostics.
 */
/**
 * Node.js-enhanced ActionHooks that extends browser version with file-based hook loading.
 * Inherits all browser functionality and adds FileObject-based hook import capability.
 */
export default class ActionHooks extends BrowserActionHooks {
    /**
     * Static factory method to create and initialize a hook manager.
     * Loads hooks from the specified file and returns an initialized instance.
     * Override loadHooks() in subclasses to customize hook loading logic.
     *
     * @param {ActionHooksConfig} config Same configuration object as constructor
     * @param {DebugFn} debug The debug function.
     * @returns {Promise<ActionHooks|null>} Initialized hook manager or null if no hooks found
     */
    static "new"(config: ActionHooksConfig, debug: DebugFn): Promise<ActionHooks | null>;
    /**
     * Creates a new ActionHook instance.
     *
     * @param {NodeActionHooksConfig} config Configuration values describing how to load the hooks.
     */
    constructor({ actionKind, hooksFile, hooks, hookTimeout, debug }: NodeActionHooksConfig);
    /**
     * Gets the hooks file object.
     *
     * @returns {FileObject} File object containing hooks
     */
    get hooksFile(): FileObject;
    #private;
}
export type DebugFn = (message: string, level?: number, ...args: Array<unknown>) => void;
export type NodeActionHooksConfig = {
    /**
     * Action identifier shared between runner and hooks.
     */
    actionKind: string;
    /**
     * File handle used to import the hooks module.
     */
    hooksFile?: FileObject | undefined;
    /**
     * Already-instantiated hooks implementation (skips loading).
     */
    hooks?: unknown;
    /**
     * Timeout applied to hook execution in milliseconds.
     */
    hookTimeout?: number | undefined;
    /**
     * Logger to emit diagnostics.
     */
    debug: DebugFn;
};
import { ActionHooks as BrowserActionHooks } from "../browser/index.js";
import { FileObject } from "@gesslar/toolkit";
//# sourceMappingURL=ActionHooks.d.ts.map
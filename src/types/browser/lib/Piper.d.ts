export default class Piper {
    /**
     * Create a Piper instance.
     *
     * @param {{debug?: (message: string, level?: number, ...args: Array<unknown>) => void}} [config] Optional configuration with debug function
     */
    constructor({ debug }?: {
        debug?: (message: string, level?: number, ...args: Array<unknown>) => void;
    });
    /**
     * Add a processing step to the pipeline
     *
     * @param {(context: unknown) => Promise<unknown>|unknown} fn Function that processes an item
     * @param {{name?: string, required?: boolean}} [options] Step options
     * @param {unknown} [newThis] Optional this binding
     * @returns {Piper} The pipeline instance (for chaining)
     */
    addStep(fn: (context: unknown) => Promise<unknown> | unknown, options?: {
        name?: string;
        required?: boolean;
    }, newThis?: unknown): Piper;
    /**
     * Add setup hook that runs before processing starts.
     *
     * @param {() => Promise<void>|void} fn - Setup function executed before processing
     * @param {unknown} [thisArg] - Optional this binding for the setup function
     * @returns {Piper} - The pipeline instance
     */
    addSetup(fn: () => Promise<void> | void, thisArg?: unknown): Piper;
    /**
     * Add cleanup hook that runs after processing completes
     *
     * @param {() => Promise<void>|void} fn - Cleanup function executed after processing
     * @param {unknown} [thisArg] - Optional this binding for the cleanup function
     * @returns {Piper} - The pipeline instance
     */
    addCleanup(fn: () => Promise<void> | void, thisArg?: unknown): Piper;
    /**
     * Process items through the pipeline with concurrency control
     *
     * @param {Array<unknown>|unknown} items - Items to process
     * @param {number} maxConcurrent - Maximum concurrent items to process
     * @returns {Promise<Array<{status: string, value?: unknown, reason?: unknown}>>} - Settled results from processing
     */
    pipe(items: Array<unknown> | unknown, maxConcurrent?: number): Promise<Array<{
        status: string;
        value?: unknown;
        reason?: unknown;
    }>>;
    #private;
}
//# sourceMappingURL=Piper.d.ts.map
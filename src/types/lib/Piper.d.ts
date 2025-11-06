export default class Piper {
  /**
   * Create a Piper instance.
   *
   * @param {{debug?: (message: string, level?: number, ...args: Array<unknown>) => void}} [config] Optional configuration with debug function
   */
  constructor({ debug }?: {
    debug?: (message: string, level?: number, ...args: Array<unknown>) => void;
  })
  /**
   * Add a processing step to the pipeline.
   * Each step is executed sequentially per item.
   *
   * @param {(context: unknown) => Promise<unknown>|unknown} fn Function that processes an item
   * @param {{name: string, required?: boolean}} options Step options (name is required)
   * @param {unknown} [newThis] Optional this binding
   * @returns {Piper} The pipeline instance (for chaining)
   * @throws {Sass} If name is not provided in options
   */
  addStep(fn: (context: unknown) => Promise<unknown> | unknown, options?: {
    name: string;
    required?: boolean;
  }, newThis?: unknown): Piper
  /**
   * Add setup hook that runs before processing starts.
   *
   * @param {() => Promise<void>|void} fn - Setup function executed before processing
   * @param {unknown} [thisArg] - Optional this binding for the setup function
   * @returns {Piper} - The pipeline instance
   */
  addSetup(fn: () => Promise<void> | void, thisArg?: unknown): Piper
  /**
   * Add cleanup hook that runs after processing completes
   *
   * @param {() => Promise<void>|void} fn - Cleanup function executed after processing
   * @param {unknown} [thisArg] - Optional this binding for the cleanup function
   * @returns {Piper} - The pipeline instance
   */
  addCleanup(fn: () => Promise<void> | void, thisArg?: unknown): Piper
  /**
   * Process items through the pipeline with concurrency control using a worker pool pattern.
   * Workers are spawned up to maxConcurrent limit, and as workers complete, new workers
   * are spawned to maintain concurrency until all items are processed.
   *
   * @param {Array<unknown>|unknown} items - Items to process
   * @param {number} [maxConcurrent] - Maximum concurrent items to process
   * @returns {Promise<Array<unknown>>} - Collected results from all processed items
   * @throws {Sass} If setup, processing, or teardown fails
   */
  pipe(items: Array<unknown> | unknown, maxConcurrent?: number): Promise<Array<unknown>>
  #private
}
//# sourceMappingURL=Piper.d.ts.map

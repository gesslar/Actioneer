/**
 * Generic Pipeline - Process items through a series of steps with concurrency control
 *
 * This abstraction handles:
 * - Concurrent processing with configurable limits using worker pool pattern
 * - Pipeline of processing steps executed sequentially per item
 * - Setup/cleanup lifecycle hooks
 * - Error handling and reporting
 * - Dynamic worker spawning to maintain concurrency
 */

import {Sass, Tantrum, Util} from "@gesslar/toolkit"

export default class Piper {
  /** @type {(message: string, level?: number, ...args: Array<unknown>) => void} */
  #debug

  /** @type {Map<string, Set<unknown>>} */
  #lifeCycle = new Map([
    ["setup", new Set()],
    ["process", new Set()],
    ["teardown", new Set()]
  ])

  /**
   * Create a Piper instance.
   *
   * @param {{debug?: (message: string, level?: number, ...args: Array<unknown>) => void}} [config] Optional configuration with debug function
   */
  constructor({debug = (() => {})} = {}) {
    this.#debug = debug
  }

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
  addStep(fn, options = {}, newThis) {
    if(options.name == null)
      throw Sass.new("Missing name for step.")

    this.#lifeCycle.get("process").add({
      fn: fn.bind(newThis ?? this),
      name: options.name || `Step ${this.#lifeCycle.get("process").size + 1}`,
      required: options.required ?? true,
      ...options
    })

    return this
  }

  /**
   * Add setup hook that runs before processing starts.
   *
   * @param {() => Promise<void>|void} fn - Setup function executed before processing
   * @param {unknown} [thisArg] - Optional this binding for the setup function
   * @returns {Piper} - The pipeline instance
   */
  addSetup(fn, thisArg) {
    this.#lifeCycle.get("setup").add(fn.bind(thisArg ?? this))

    return this
  }

  /**
   * Add cleanup hook that runs after processing completes
   *
   * @param {() => Promise<void>|void} fn - Cleanup function executed after processing
   * @param {unknown} [thisArg] - Optional this binding for the cleanup function
   * @returns {Piper} - The pipeline instance
   */
  addCleanup(fn, thisArg) {
    this.#lifeCycle.get("teardown").add(fn.bind(thisArg ?? this))

    return this
  }

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
  async pipe(items, maxConcurrent = 10) {
    items = Array.isArray(items)
      ? items
      : [items]

    const allResults = []
    const allErrors = []
    let pendingCount = 0
    let resolveAll
    let rejectAll
    const allDone = new Promise((resolve, reject) => {
      resolveAll = resolve
      rejectAll = reject
    })

    /**
     * Worker function that processes one item and potentially spawns a replacement.
     *
     * @private
     */
    const processWorker = async() => {
      // Check if there are any items left to process
      if(items.length === 0) {
        pendingCount--

        if(pendingCount === 0) {
          if(allErrors.length > 0)
            rejectAll(allErrors)
          else
            resolveAll()
        }

        return
      }

      const item = items.shift()

      try {
        const result = await this.#processWorker(item)
        allResults.push(result)

        // Spawn a replacement worker if there are more items
        if(items.length > 0) {
          pendingCount++
          processWorker() // Don't await - let it run in parallel
        }
      } catch(error) {
        allErrors.push(Sass.new("Processing pipeline item.", error))
      } finally {
        pendingCount--
        if(pendingCount === 0) {
          if(allErrors.length > 0)
            rejectAll(allErrors)
          else
            resolveAll()
        }
      }
    }

    const setupResult = await Util.settleAll(
      [...this.#lifeCycle.get("setup")].map(e => e())
    )
    this.#processResult("Setting up the pipeline.", setupResult)

    try {
      // Start workers up to maxConcurrent limit
      const workerCount = Math.min(maxConcurrent, items.length)
      pendingCount = workerCount

      if(workerCount === 0) {
        resolveAll() // No items to process
      } else {
        for(let i = 0; i < workerCount; i++) {
          processWorker() // Don't await - let them all run in parallel
        }
      }

      // Wait for all workers to complete
      await allDone
    } finally {
      // Run cleanup hooks
      const teardownResult = await Util.settleAll(
        [...this.#lifeCycle.get("teardown")].map(e => e())
      )
      this.#processResult("Tearing down the pipeline.", teardownResult)
    }

    return allResults
  }

  /**
   * Process a single item through all pipeline steps.
   *
   * @param {unknown} item The item to process
   * @returns {Promise<unknown>} Result from the final step
   * @private
   */
  async #processWorker(item) {
    try {
      // Execute each step in sequence
      let result = item

      for(const step of this.#lifeCycle.get("process")) {
        this.#debug("Executing step: %o", 4, step.name)

        result = await step.fn(result) ?? result
      }

      return result
    } catch(error) {
      throw Sass.new("Processing an item.", error)
    }
  }

  /**
   * Validate settleAll results and throw a combined error when rejected.
   *
   * @param {string} message Context message
   * @param {Array<unknown>} settled Results from settleAll
   * @private
   */
  #processResult(message, settled) {
    if(settled.some(r => r.status === "rejected"))
      throw Tantrum.new(
        message,
        settled.filter(r => r.status==="rejected").map(r => r.reason)
      )
  }
}

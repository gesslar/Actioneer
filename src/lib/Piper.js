/**
 * Generic Pipeline - Process items through a series of steps with concurrency control
 *
 * This abstraction handles:
 * - Concurrent processing with configurable limits
 * - Pipeline of processing steps
 * - Result categorization (success/warning/error)
 * - Setup/cleanup lifecycle hooks
 * - Error handling and reporting
 */

import {Sass, Tantrum, Util} from "@gesslar/toolkit"

export default class Piper {
  #debug

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
   * Add a processing step to the pipeline
   *
   * @param {(context: unknown) => Promise<unknown>|unknown} fn Function that processes an item
   * @param {{name?: string, required?: boolean}} [options] Step options
   * @param {unknown} [newThis] Optional this binding
   * @returns {Piper} The pipeline instance (for chaining)
   */
  addStep(fn, options = {}, newThis) {
    this.#lifeCycle.get("process").add({
      fn: fn.bind(newThis ?? this),
      name: options.name || `Step ${this.#lifeCycle.get("process").size + 1}`,
      required: !!options.required, // Default to required
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
   * Process items through the pipeline with concurrency control
   *
   * @param {Array<unknown>|unknown} items - Items to process
   * @param {number} maxConcurrent - Maximum concurrent items to process
   * @returns {Promise<Array<unknown>>} - Collected results from steps
   */
  async pipe(items, maxConcurrent = 10) {
    items = Array.isArray(items)
      ? items
      : [items]

    let itemIndex = 0
    const allResults = []

    const processWorker = async() => {
      while(true) {
        const currentIndex = itemIndex++
        if(currentIndex >= items.length)
          break

        const item = items[currentIndex]
        try {
          const result = await this.#processItem(item)
          allResults.push(result)
        } catch(error) {
          throw Sass.new("Processing pipeline item.", error)
        }
      }
    }

    const setupResult = await Util.settleAll(
      [...this.#lifeCycle.get("setup")].map(e => e())
    )
    this.#processResult("Setting up the pipeline.", setupResult)

    // Start workers up to maxConcurrent limit
    const workers = []
    const workerCount = Math.min(maxConcurrent, items.length)

    for(let i = 0; i < workerCount; i++)
      workers.push(processWorker())

    // Wait for all workers to complete
    const processResult = await Util.settleAll(workers)
    this.#processResult("Processing pipeline.", processResult)

    // Run cleanup hooks
    const teardownResult = await Util.settleAll(
      [...this.#lifeCycle.get("teardown")].map(e => e())
    )
    this.#processResult("Tearing down the pipeline.", teardownResult)

    return allResults
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

  /**
   * Process a single item through all pipeline steps
   *
   * @param {unknown} item The item to process
   * @returns {Promise<unknown>} Result from the final step
   * @private
   */
  async #processItem(item) {
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
}

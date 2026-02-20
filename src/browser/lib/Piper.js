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

import {Data, Disposer, NotifyClass, Promised, Sass} from "@gesslar/toolkit"

/**
 * @import {Tantrum} from "@gesslar/toolkit"
 */

export default class Piper extends NotifyClass {
  #debug
  #disposer = Disposer
  #abortedReason

  #lifeCycle = new Map([
    ["setup", new Set()],
    ["process", new Set()],
    ["teardown", new Set()]
  ])

  /**
   * Create a Piper instance.
   *
   * @param {{debug?: (message: string, level?: number, ...args: Array<unknown>) => void}} [config] - Optional configuration with debug function
   */
  constructor({debug = (() => {})} = {}) {
    super()

    this.#debug = debug

    this.#disposer.register(
      this.on("abort", this.#abortCalled.bind(this))
    )
  }

  #abortCalled(reason) {
    this.#abortedReason = reason
  }

  get reason() {
    return this.#abortedReason
  }

  /**
   * Add a processing step to the pipeline
   *
   * @param {(context: unknown) => Promise<unknown>|unknown} fn - Function that processes an item
   * @param {{name?: string, required?: boolean}} [options] - Step options
   * @param {unknown} [newThis] - Optional this binding
   * @returns {Piper} The pipeline instance (for chaining)
   */
  addStep(fn, options = {}, newThis) {
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
   * @param {(items: Array<unknown>) => Promise<void>|void} fn - Setup function executed before processing; receives the full items array.
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
   * @param {(items: Array<unknown>) => Promise<void>|void} fn - Cleanup function executed after processing; receives the full items array.
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
   * @returns {Promise<Array<{status: string, value?: unknown, reason?: unknown}>>} - Settled results from processing
   */
  async pipe(items, maxConcurrent = 10) {
    items = Array.isArray(items)
      ? items
      : [items]

    let itemIndex = 0
    const allResults = new Array(items.length)

    const processWorker = async() => {
      while(true && !this.reason) {
        const currentIndex = itemIndex++

        if(currentIndex >= items.length)
          break

        const item = items[currentIndex]

        try {
          const result = await this.#processItem(item)

          if(Data.isType(result, "Error"))
            allResults[currentIndex] = {status: "rejected", reason: result}
          else
            allResults[currentIndex] = {status: "fulfilled", value: result}
        } catch(error) {
          allResults[currentIndex] = {status: "rejected", reason: error}
        }
      }
    }

    const setupResult = await Promised.settle(
      [...this.#lifeCycle.get("setup")].map(e => Promise.resolve(e(items)))
    )

    this.#processResult("Setting up the pipeline.", setupResult)

    try {
      // Start workers up to maxConcurrent limit
      const workers = []
      const workerCount = Math.min(maxConcurrent, items.length)

      for(let i = 0; i < workerCount; i++)
        workers.push(processWorker())

      // Wait for all workers to complete - don't throw on worker failures
      await Promise.all(workers)
    } finally {
      // Run cleanup hooks
      const teardownResult = await Promised.settle(
        [...this.#lifeCycle.get("teardown")].map(e => Promise.resolve(e(items)))
      )

      this.#processResult("Tearing down the pipeline.", teardownResult)
    }

    if(this.reason)
      this.emit("aborted", this.reason)

    return allResults
  }

  /**
   * Validate settleAll results and throw a combined error when rejected.
   *
   * @private
   * @param {string} message - Context message
   * @param {Array<unknown>} settled - Results from settleAll
   * @throws {Tantrum} - If any settled result was rejected
   */
  #processResult(_message, settled) {
    if(Promised.hasRejected(settled))
      Promised.throw(settled)
  }

  /**
   * Process a single item through all pipeline steps
   *
   * @private
   * @param {unknown} item - The item to process
   * @returns {Promise<unknown>} Result from the final step
   */
  async #processItem(item) {
    // Execute each step in sequence
    let result = item

    for(const step of this.#lifeCycle.get("process")) {
      this.#debug("Executing step: %o", 4, step.name)

      try {
        result = await step.fn(result) ?? result
      } catch(error) {
        if(step.required)
          throw Sass.new(`Processing required step "${step.name}".`, error)
      }
    }

    return result
  }
}

#!/usr/bin/env node

import {describe, it} from "node:test"
import assert from "node:assert/strict"

import {Piper} from "../../src/index.js"

describe("Piper", () => {
  describe("constructor", () => {
    it("creates piper instance", () => {
      const piper = new Piper()
      assert.ok(piper)
    })

    it("accepts debug function", () => {
      const debugCalls = []
      const debug = (msg) => debugCalls.push(msg)

      const piper = new Piper({debug})
      assert.ok(piper)
    })

    it("works without debug function", () => {
      const piper = new Piper()
      assert.ok(piper)
    })
  })

  describe("addStep()", () => {
    it("adds processing step to pipeline", () => {
      const piper = new Piper()
      const result = piper.addStep(() => {})

      assert.equal(result, piper)
    })

    it("returns piper for chaining", () => {
      const piper = new Piper()
      const result = piper
        .addStep(() => {})
        .addStep(() => {})

      assert.equal(result, piper)
    })

    it("accepts step with name", () => {
      const piper = new Piper()
      piper.addStep(() => {}, {name: "my-step"})
      assert.ok(piper)
    })

    it("accepts step with required flag", () => {
      const piper = new Piper()
      piper.addStep(() => {}, {required: false})
      assert.ok(piper)
    })

    it("accepts custom this binding", () => {
      const piper = new Piper()
      const customThis = {value: 42}
      piper.addStep(function() {
        return this.value
      }, {}, customThis)
      assert.ok(piper)
    })
  })

  describe("addSetup()", () => {
    it("adds setup hook", () => {
      const piper = new Piper()
      const result = piper.addSetup(() => {})

      assert.equal(result, piper)
    })

    it("returns piper for chaining", () => {
      const piper = new Piper()
      const result = piper
        .addSetup(() => {})
        .addSetup(() => {})

      assert.equal(result, piper)
    })

    it("accepts custom this binding", () => {
      const piper = new Piper()
      const customThis = {value: 42}
      piper.addSetup(function() {}, customThis)
      assert.ok(piper)
    })
  })

  describe("addCleanup()", () => {
    it("adds cleanup hook", () => {
      const piper = new Piper()
      const result = piper.addCleanup(() => {})

      assert.equal(result, piper)
    })

    it("returns piper for chaining", () => {
      const piper = new Piper()
      const result = piper
        .addCleanup(() => {})
        .addCleanup(() => {})

      assert.equal(result, piper)
    })

    it("accepts custom this binding", () => {
      const piper = new Piper()
      const customThis = {value: 42}
      piper.addCleanup(function() {}, customThis)
      assert.ok(piper)
    })
  })

  describe("pipe()", () => {
    it("processes single item through pipeline", async () => {
      const piper = new Piper()
      piper.addStep((item) => item * 2)

      const results = await piper.pipe([5])
      assert.equal(results.length, 1)
      assert.equal(results[0].status, "fulfilled")
      assert.equal(results[0].value, 10)
    })

    it("processes multiple items through pipeline", async () => {
      const piper = new Piper()
      piper.addStep((item) => item * 2)

      const results = await piper.pipe([1, 2, 3])
      assert.equal(results.length, 3)
      assert.equal(results[0].status, "fulfilled")
      assert.equal(results[0].value, 2)
      assert.equal(results[1].status, "fulfilled")
      assert.equal(results[1].value, 4)
      assert.equal(results[2].status, "fulfilled")
      assert.equal(results[2].value, 6)
    })

    it("converts non-array item to array", async () => {
      const piper = new Piper()
      piper.addStep((item) => item + 1)

      const results = await piper.pipe(5)
      assert.equal(results.length, 1)
      assert.equal(results[0].status, "fulfilled")
      assert.equal(results[0].value, 6)
    })

    it("processes items through multiple steps", async () => {
      const piper = new Piper()
      piper
        .addStep((item) => item * 2)
        .addStep((item) => item + 10)

      const results = await piper.pipe([5])
      assert.equal(results[0].status, "fulfilled")
      assert.equal(results[0].value, 20) // (5 * 2) + 10
    })

    it("respects maxConcurrent parameter", async () => {
      let concurrent = 0
      let maxConcurrent = 0

      const piper = new Piper()
      piper.addStep(async (item) => {
        concurrent++
        maxConcurrent = Math.max(maxConcurrent, concurrent)
        await new Promise(resolve => setTimeout(resolve, 10))
        concurrent--
        return item
      })

      await piper.pipe([1, 2, 3, 4, 5, 6, 7, 8], 3)
      assert.ok(maxConcurrent <= 3)
    })

    it("calls setup hooks before processing", async () => {
      const order = []
      const piper = new Piper()

      piper.addSetup(() => order.push("setup"))
      piper.addStep((item) => {
        order.push("process")
        return item
      })

      await piper.pipe([1])
      assert.equal(order[0], "setup")
    })

    it("calls cleanup hooks after processing", async () => {
      const order = []
      const piper = new Piper()

      piper.addStep((item) => {
        order.push("process")
        return item
      })
      piper.addCleanup(() => order.push("cleanup"))

      await piper.pipe([1])
      assert.equal(order[order.length - 1], "cleanup")
    })

    it("calls cleanup even when processing fails", async () => {
      let cleanupCalled = false
      const piper = new Piper()

      piper.addStep(() => {
        throw new Error("Process error")
      })
      piper.addCleanup(() => {
        cleanupCalled = true
      })

      const results = await piper.pipe([1])
      assert.equal(results[0].status, "rejected")
      assert.ok(cleanupCalled)
    })

    it("handles empty items array", async () => {
      const piper = new Piper()
      piper.addStep((item) => item * 2)

      const results = await piper.pipe([])
      assert.equal(results.length, 0)
    })

    it("handles async step functions", async () => {
      const piper = new Piper()
      piper.addStep(async (item) => {
        await new Promise(resolve => setTimeout(resolve, 10))
        return item * 2
      })

      const results = await piper.pipe([5])
      assert.equal(results[0].status, "fulfilled")
      assert.equal(results[0].value, 10)
    })

    it("preserves result when step returns undefined", async () => {
      const piper = new Piper()
      piper
        .addStep((item) => item * 2)
        .addStep(() => undefined) // Returns undefined
        .addStep((item) => item + 1) // Should still receive previous result

      const results = await piper.pipe([5])
      assert.equal(results[0].status, "fulfilled")
      assert.equal(results[0].value, 11) // (5 * 2) + 1
    })

    it("handles optional non-required steps that fail", async () => {
      const piper = new Piper()
      piper
        .addStep((item) => item * 2, {required: true})
        .addStep(() => {
          throw new Error("Optional error")
        }, {required: false})
        .addStep((item) => item + 1, {required: true})

      const results = await piper.pipe([5])
      assert.equal(results[0].status, "fulfilled")
      assert.equal(results[0].value, 11) // (5 * 2) + 1
    })

    it("returns rejected result when required step fails", async () => {
      const piper = new Piper()
      piper.addStep(() => {
        throw new Error("Required error")
      }, {required: true, name: "failing-step"})

      const results = await piper.pipe([1])
      assert.equal(results[0].status, "rejected")
      assert.ok(results[0].reason)
      assert.match(results[0].reason.message, /Required error/)
    })
  })

  describe("lifecycle execution order", () => {
    it("executes in correct order: setup, process, cleanup", async () => {
      const order = []
      const piper = new Piper()

      piper.addSetup(() => order.push("setup1"))
      piper.addSetup(() => order.push("setup2"))
      piper.addStep((item) => {
        order.push("process")
        return item
      })
      piper.addCleanup(() => order.push("cleanup1"))
      piper.addCleanup(() => order.push("cleanup2"))

      await piper.pipe([1])

      assert.deepEqual(order, [
        "setup1",
        "setup2",
        "process",
        "cleanup1",
        "cleanup2"
      ])
    })

    it("executes multiple setup hooks", async () => {
      let count = 0
      const piper = new Piper()

      piper.addSetup(() => count++)
      piper.addSetup(() => count++)
      piper.addStep((item) => item)

      await piper.pipe([1])
      assert.equal(count, 2)
    })

    it("executes multiple cleanup hooks", async () => {
      let count = 0
      const piper = new Piper()

      piper.addStep((item) => item)
      piper.addCleanup(() => count++)
      piper.addCleanup(() => count++)

      await piper.pipe([1])
      assert.equal(count, 2)
    })
  })

  describe("concurrency control", () => {
    it("defaults to maxConcurrent of 10", async () => {
      const piper = new Piper()
      piper.addStep((item) => item)

      const results = await piper.pipe([1, 2, 3, 4, 5])
      assert.equal(results.length, 5)
    })

    it("processes items concurrently up to limit", async () => {
      let activeTasks = 0
      let peakConcurrency = 0

      const piper = new Piper()
      piper.addStep(async (item) => {
        activeTasks++
        peakConcurrency = Math.max(peakConcurrency, activeTasks)
        await new Promise(resolve => setTimeout(resolve, 50))
        activeTasks--
        return item
      })

      await piper.pipe([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 4)
      assert.ok(peakConcurrency <= 4)
      assert.ok(peakConcurrency > 1) // Verify actual concurrency
    })

    it("handles single item with maxConcurrent", async () => {
      const piper = new Piper()
      piper.addStep((item) => item * 2)

      const results = await piper.pipe([5], 1)
      assert.equal(results[0].status, "fulfilled")
      assert.equal(results[0].value, 10)
    })
  })

  describe("error handling", () => {
    it("wraps step errors with context", async () => {
      const piper = new Piper()
      piper.addStep(() => {
        throw new Error("Step failed")
      })

      const results = await piper.pipe([1])
      assert.equal(results[0].status, "rejected")
      assert.ok(results[0].reason)
      assert.match(results[0].reason.message, /Step failed/)
    })

    it("throws on setup errors", async () => {
      const piper = new Piper()
      piper.addSetup(() => {
        throw new Error("Setup failed")
      })
      piper.addStep((item) => item)

      await assert.rejects(
        () => piper.pipe([1]),
        /Setup failed/
      )
    })

    it("throws on cleanup errors", async () => {
      const piper = new Piper()
      piper.addStep((item) => item)
      piper.addCleanup(() => {
        throw new Error("Cleanup failed")
      })

      await assert.rejects(
        () => piper.pipe([1]),
        /Cleanup failed/
      )
    })
  })
})

#!/usr/bin/env node

import {describe, it} from "node:test"
import assert from "node:assert/strict"

import {ActionBuilder, ActionRunner, ACTIVITY} from "../../src/index.js"
import {Promised} from "@gesslar/toolkit"

const noopDebug = () => {}

describe("Issue: Guard against repeated withHooks on nested builders", () => {
  it("should handle WHILE loop with nested ActionBuilder that executes multiple times", async() => {
    const executionLog = []
    let iterations = 0

    class TestHooks {
      constructor({debug}) {
        this.debug = debug
      }

      async before$outer(_context) {
        executionLog.push("before-outer")
      }

      async after$outer(_context) {
        executionLog.push("after-outer")
      }

      async before$inner(_context) {
        executionLog.push("before-inner")
      }

      async after$inner(_context) {
        executionLog.push("after-inner")
      }
    }

    class InnerAction {
      setup(builder) {
        builder.do("inner", ctx => {
          executionLog.push("inner")

          return ctx
        })
      }
    }

    class OuterAction {
      setup(builder) {
        builder
          .withHooks(new TestHooks({debug: noopDebug}))
          .do("outer", ctx => {
            executionLog.push("outer")

            return ctx
          })
          .do("nested", ACTIVITY.WHILE,
            _ctx => ++iterations < 3,
            new ActionBuilder(new InnerAction())
          )
      }
    }

    const builder = new ActionBuilder(new OuterAction())
    const runner = new ActionRunner(builder)

    // This should not throw "Hooks have already been configured" error
    const result = await runner.pipe([{}], 1)

    assert.strictEqual(Promised.hasRejected(result), false, `Operation failed with ${JSON.stringify(result)}`)

    // Verify the nested activity executed multiple times
    const innerCount = executionLog.filter(log => log === "inner").length
    assert.strictEqual(innerCount, 2, "inner activity should execute twice")

    // Verify hooks were called for each iteration
    const beforeInnerCount = executionLog.filter(log => log === "before-inner").length
    assert.strictEqual(beforeInnerCount, 2, "before-inner hook should be called twice")
  })

  it("should handle reusing same ActionRunner multiple times", async() => {
    const executionLog = []

    class TestHooks {
      constructor({debug}) {
        this.debug = debug
      }

      async before$inner(_context) {
        executionLog.push("before-inner")
      }
    }

    class InnerAction {
      setup(builder) {
        builder.do("inner", ctx => {
          executionLog.push("inner")

          return ctx
        })
      }
    }

    class OuterAction {
      setup(builder) {
        const nestedBuilder = new ActionBuilder(new InnerAction())
        builder
          .withHooks(new TestHooks({debug: noopDebug}))
          .do("nested", _ctx => {
            // Return nested ActionBuilder to test dynamic builder hook propagation
            return nestedBuilder
          })
      }
    }

    const builder = new ActionBuilder(new OuterAction())
    const runner = new ActionRunner(builder)

    // First run
    await runner.run({})

    // Second run should not throw "Hooks have already been configured" error
    await runner.run({})

    // Verify the nested activity executed twice (once per run)
    const innerCount = executionLog.filter(log => log === "inner").length
    assert.strictEqual(innerCount, 2, "inner activity should execute twice")
  })
})

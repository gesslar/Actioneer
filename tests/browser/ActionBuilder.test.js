#!/usr/bin/env node

import {describe, it} from "node:test"
import assert from "node:assert/strict"

import {ActionBuilder, ActionRunner, ACTIVITY} from "../../src/browser/index.js"

const noopDebug = () => {}

describe("ActionBuilder (browser)", () => {
  describe("basic functionality", () => {
    it("creates builder and executes simple pipeline", async() => {
      class SimpleAction {
        setup(builder) {
          builder
            .do("step1", ctx => {
              ctx.value = 10

              return ctx
            })
            .do("step2", ctx => {
              ctx.value *= 2

              return ctx.value
            })
        }
      }

      const builder = new ActionBuilder(new SimpleAction())
      const runner = new ActionRunner(builder)
      const result = await runner.run({})

      assert.strictEqual(result, 20)
    })

    it("supports WHILE loops", async() => {
      class LoopAction {
        setup(builder) {
          builder
            .do("initialize", ctx => {
              ctx.count = 0

              return ctx
            })
            .do("increment", ACTIVITY.WHILE, ctx => ctx.count < 3, ctx => {
              ctx.count++

              return ctx
            })
            .do("finish", ctx => ctx.count)
        }
      }

      const builder = new ActionBuilder(new LoopAction())
      const runner = new ActionRunner(builder)
      const result = await runner.run({})

      assert.strictEqual(result, 3)
    })

    it("supports SPLIT activities", async() => {
      class SplitAction {
        setup(builder) {
          builder
            .do("initialize", ctx => {
              ctx.items = [1, 2, 3]

              return ctx
            })
            .do("parallel", ACTIVITY.SPLIT,
              ctx => ctx.items.map(item => ({item})),
              (original, results) => {
                original.processed = results
                  .filter(r => r.status === "fulfilled")
                  .map(r => r.value.item * 2)

                return original
              },
              ctx => {
                ctx.item *= 2

                return ctx
              }
            )
        }
      }

      const builder = new ActionBuilder(new SplitAction())
      const runner = new ActionRunner(builder)
      const result = await runner.run({})

      assert.deepStrictEqual(result.processed, [4, 8, 12])
    })
  })

  describe("hooks with pre-instantiated objects", () => {
    it("executes hooks when provided via withHooks()", async() => {
      const executionLog = []

      class TestHooks {
        constructor({debug}) {
          this.debug = debug
        }

        async before$work(context) {
          executionLog.push("before-work")
        }

        async after$work(context) {
          executionLog.push("after-work")
        }
      }

      class HookedAction {
        setup(builder) {
          builder
            .withHooks(new TestHooks({debug: noopDebug}))
            .do("work", ctx => {
              executionLog.push("work")

              return ctx
            })
        }
      }

      const builder = new ActionBuilder(new HookedAction())
      const runner = new ActionRunner(builder)
      await runner.run({})

      assert.ok(executionLog.includes("before-work"))
      assert.ok(executionLog.includes("work"))
      assert.ok(executionLog.includes("after-work"))
    })
  })

  describe("hooks getter", () => {
    it("returns null when no hooks are configured", () => {
      const builder = new ActionBuilder()

      assert.equal(builder.hooks, null)
    })

    it("returns the raw hooks instance set via withHooks()", () => {
      const hooks = {before$work: () => {}}
      const builder = new ActionBuilder()

      builder.withHooks(hooks)

      assert.equal(builder.hooks, hooks)
    })
  })

  describe("pipe() for concurrent execution", () => {
    it("processes multiple contexts concurrently", async() => {
      class ConcurrentAction {
        setup(builder) {
          builder.do("double", ctx => {
            ctx.result = ctx.value * 2

            return ctx.result
          })
        }
      }

      const builder = new ActionBuilder(new ConcurrentAction())
      const runner = new ActionRunner(builder)
      const contexts = [{value: 1}, {value: 2}, {value: 3}]
      const results = await runner.pipe(contexts, 4)

      assert.strictEqual(results.length, 3)
      assert.strictEqual(results[0].status, "fulfilled")
      assert.strictEqual(results[0].value, 2)
      assert.strictEqual(results[1].value, 4)
      assert.strictEqual(results[2].value, 6)
    })
  })

  describe("IF activity", () => {
    it("executes activity when predicate returns true", async() => {
      class IfTrueAction {
        setup(builder) {
          builder
            .do("init", ctx => {
              ctx.value = 5

              return ctx
            })
            .do("conditional", ACTIVITY.IF, ctx => ctx.value > 3, ctx => {
              ctx.doubled = ctx.value * 2

              return ctx
            })
            .do("finish", ctx => ctx)
        }
      }

      const builder = new ActionBuilder(new IfTrueAction())
      const runner = new ActionRunner(builder)
      const result = await runner.run({})

      assert.strictEqual(result.value, 5)
      assert.strictEqual(result.doubled, 10)
    })

    it("skips activity when predicate returns false", async() => {
      class IfFalseAction {
        setup(builder) {
          builder
            .do("init", ctx => {
              ctx.value = 2

              return ctx
            })
            .do("conditional", ACTIVITY.IF, ctx => ctx.value > 3, ctx => {
              ctx.doubled = ctx.value * 2

              return ctx
            })
            .do("finish", ctx => ctx)
        }
      }

      const builder = new ActionBuilder(new IfFalseAction())
      const runner = new ActionRunner(builder)
      const result = await runner.run({})

      assert.strictEqual(result.value, 2)
      assert.strictEqual(result.doubled, undefined)
    })

    it("supports async predicates", async() => {
      class AsyncIfAction {
        setup(builder) {
          builder
            .do("init", ctx => {
              ctx.value = 10

              return ctx
            })
            .do("conditional", ACTIVITY.IF, async ctx => {
              await new Promise(resolve => setTimeout(resolve, 5))

              return ctx.value > 5
            }, ctx => {
              ctx.processed = true

              return ctx
            })
        }
      }

      const builder = new ActionBuilder(new AsyncIfAction())
      const runner = new ActionRunner(builder)
      const result = await runner.run({})

      assert.strictEqual(result.processed, true)
    })
  })

  describe("BREAK activity", () => {
    it("breaks out of WHILE loop when predicate returns true", async() => {
      class BreakAction {
        setup(builder) {
          builder
            .do("init", ctx => {
              ctx.count = 0
              ctx.iterations = []

              return ctx
            })
            .do("loop", ACTIVITY.WHILE, ctx => ctx.count < 10,
              new ActionBuilder()
                .do("increment", ctx => {
                  ctx.count++
                  ctx.iterations.push(ctx.count)

                  return ctx
                })
                .do("maybeBreak", ACTIVITY.BREAK, ctx => ctx.count >= 3)
            )
        }
      }

      const builder = new ActionBuilder(new BreakAction())
      const runner = new ActionRunner(builder)
      const result = await runner.run({})

      assert.strictEqual(result.count, 3)
      assert.deepStrictEqual(result.iterations, [1, 2, 3])
    })

    it("does not break when predicate returns false", async() => {
      class NoBreakAction {
        setup(builder) {
          builder
            .do("init", ctx => {
              ctx.count = 0

              return ctx
            })
            .do("loop", ACTIVITY.WHILE, ctx => ctx.count < 5,
              new ActionBuilder()
                .do("increment", ctx => {
                  ctx.count++

                  return ctx
                })
                .do("neverBreak", ACTIVITY.BREAK, () => false)
            )
        }
      }

      const builder = new ActionBuilder(new NoBreakAction())
      const runner = new ActionRunner(builder)
      const result = await runner.run({})

      assert.strictEqual(result.count, 5)
    })
  })

  describe("CONTINUE activity", () => {
    it("skips remaining activities in current iteration", async() => {
      class ContinueAction {
        setup(builder) {
          builder
            .do("init", ctx => {
              ctx.count = 0
              ctx.processed = []
              ctx.skipped = []

              return ctx
            })
            .do("loop", ACTIVITY.WHILE, ctx => ctx.count < 5,
              new ActionBuilder()
                .do("increment", ctx => {
                  ctx.count++

                  return ctx
                })
                .do("maybeContinue", ACTIVITY.CONTINUE, ctx => ctx.count % 2 === 0)
                .do("process", ctx => {
                  ctx.processed.push(ctx.count)

                  return ctx
                })
            )
        }
      }

      const builder = new ActionBuilder(new ContinueAction())
      const runner = new ActionRunner(builder)
      const result = await runner.run({})

      assert.strictEqual(result.count, 5)
      assert.deepStrictEqual(result.processed, [1, 3, 5])
    })
  })

  describe("combined control flow", () => {
    it("supports IF, BREAK, and CONTINUE in same pipeline", async() => {
      class CombinedAction {
        setup(builder) {
          builder
            .do("init", ctx => {
              ctx.count = 0
              ctx.results = []

              return ctx
            })
            .do("loop", ACTIVITY.WHILE, ctx => ctx.count < 100,
              new ActionBuilder()
                .do("increment", ctx => {
                  ctx.count++

                  return ctx
                })
                .do("breakAt10", ACTIVITY.BREAK, ctx => ctx.count > 10)
                .do("skipEvens", ACTIVITY.CONTINUE, ctx => ctx.count % 2 === 0)
                .do("conditionalProcess", ACTIVITY.IF, ctx => ctx.count > 5, ctx => {
                  ctx.results.push(ctx.count * 10)

                  return ctx
                })
                .do("alwaysProcess", ctx => {
                  ctx.results.push(ctx.count)

                  return ctx
                })
            )
        }
      }

      const builder = new ActionBuilder(new CombinedAction())
      const runner = new ActionRunner(builder)
      const result = await runner.run({})

      assert.strictEqual(result.count, 11)
      // Odd numbers 1-9: 1,3,5 just pushed, 7,9 pushed with *10 first then pushed
      // count 11 triggers break before processing
      assert.deepStrictEqual(result.results, [1, 3, 5, 70, 7, 90, 9])
    })
  })
})

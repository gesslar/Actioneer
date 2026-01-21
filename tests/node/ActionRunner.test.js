#!/usr/bin/env node

import {describe, it} from "node:test"
import assert from "node:assert/strict"

import {ActionRunner, ActionBuilder, ACTIVITY} from "../../src/index.js"

describe("ActionRunner", () => {
  describe("constructor", () => {
    it("creates runner with ActionBuilder", () => {
      const action = {
        setup: builder => {
          builder.do("test", () => {})
        }
      }

      const builder = new ActionBuilder(action)
      const runner = new ActionRunner(builder)

      assert.ok(runner)
    })

    it("creates runner without ActionBuilder", () => {
      const runner = new ActionRunner(null)
      assert.ok(runner)
    })

    it("accepts debug function", () => {
      const debugCalls = []
      const debug = msg => debugCalls.push(msg)

      const action = {setup: () => {}}
      const builder = new ActionBuilder(action)
      const runner = new ActionRunner(builder, {debug})

      assert.ok(runner)
    })

    it("throws error when passed non-ActionBuilder", () => {
      assert.throws(
        () => new ActionRunner({}),
        /ActionRunner takes an instance of an ActionBuilder/
      )
    })

    it("throws error when passed string", () => {
      assert.throws(
        () => new ActionRunner("not-a-builder"),
        /ActionRunner takes an instance of an ActionBuilder/
      )
    })
  })

  describe("run()", () => {
    it("executes simple activity", async() => {
      let executed = false

      const action = {
        setup: builder => {
          builder.do("test", () => {
            executed = true
          })
        }
      }

      const builder = new ActionBuilder(action)
      const runner = new ActionRunner(builder)

      await runner.run({})
      assert.ok(executed)
    })

    it("passes context through activities", async() => {
      const action = {
        setup: builder => {
          builder
            .do("step1", ctx => {
              ctx.value = 10

              return ctx
            })
            .do("step2", ctx => {
              ctx.value = ctx.value * 2

              return ctx
            })
        }
      }

      const builder = new ActionBuilder(action)
      const runner = new ActionRunner(builder)

      const result = await runner.run({})
      assert.equal(result.value, 20)
    })

    it("executes activities in order", async() => {
      const order = []

      const action = {
        setup: builder => {
          builder
            .do("first", () => order.push(1))
            .do("second", () => order.push(2))
            .do("third", () => order.push(3))
        }
      }

      const builder = new ActionBuilder(action)
      const runner = new ActionRunner(builder)

      await runner.run({})
      assert.deepEqual(order, [1, 2, 3])
    })

    it("returns final context value", async() => {
      const action = {
        setup: builder => {
          builder.do("test", () => ({result: "success"}))
        }
      }

      const builder = new ActionBuilder(action)
      const runner = new ActionRunner(builder)

      const result = await runner.run({})
      assert.deepEqual(result, {result: "success"})
    })

    it("handles async activities", async() => {
      const action = {
        setup: builder => {
          builder.do("test", async ctx => {
            await new Promise(resolve => setTimeout(resolve, 10))
            ctx.done = true

            return ctx
          })
        }
      }

      const builder = new ActionBuilder(action)
      const runner = new ActionRunner(builder)

      const result = await runner.run({})
      assert.ok(result.done)
    })
  })

  describe("WHILE activities", () => {
    it("loops while predicate is true", async() => {
      const action = {
        setup: builder => {
          builder
            .do("init", ctx => {
              ctx.count = 0

              return ctx
            })
            .do("loop", ACTIVITY.WHILE, ctx => ctx.count < 3, ctx => {
              ctx.count++

              return ctx
            })
        }
      }

      const builder = new ActionBuilder(action)
      const runner = new ActionRunner(builder)

      const result = await runner.run({})
      assert.equal(result.count, 3)
    })

    it("does not execute when predicate is initially false", async() => {
      let executed = false

      const action = {
        setup: builder => {
          builder.do("loop", ACTIVITY.WHILE, () => false, () => {
            executed = true
          })
        }
      }

      const builder = new ActionBuilder(action)
      const runner = new ActionRunner(builder)

      await runner.run({})
      assert.equal(executed, false)
    })

    it("handles async predicates", async() => {
      const action = {
        setup: builder => {
          builder
            .do("init", ctx => {
              ctx.count = 0

              return ctx
            })
            .do("loop", ACTIVITY.WHILE, async ctx => {
              await new Promise(resolve => setTimeout(resolve, 1))

              return ctx.count < 2
            }, ctx => {
              ctx.count++

              return ctx
            })
        }
      }

      const builder = new ActionBuilder(action)
      const runner = new ActionRunner(builder)

      const result = await runner.run({})
      assert.equal(result.count, 2)
    })
  })

  describe("UNTIL activities", () => {
    it("loops until predicate is true", async() => {
      const action = {
        setup: builder => {
          builder
            .do("init", ctx => {
              ctx.count = 0

              return ctx
            })
            .do("loop", ACTIVITY.UNTIL, ctx => ctx.count >= 3, ctx => {
              ctx.count++

              return ctx
            })
        }
      }

      const builder = new ActionBuilder(action)
      const runner = new ActionRunner(builder)

      const result = await runner.run({})
      assert.equal(result.count, 3)
    })

    it("executes at least once", async() => {
      let executeCount = 0

      const action = {
        setup: builder => {
          builder.do("loop", ACTIVITY.UNTIL, () => true, () => {
            executeCount++
          })
        }
      }

      const builder = new ActionBuilder(action)
      const runner = new ActionRunner(builder)

      await runner.run({})
      assert.equal(executeCount, 1)
    })

    it("handles async predicates", async() => {
      const action = {
        setup: builder => {
          builder
            .do("init", ctx => {
              ctx.count = 0

              return ctx
            })
            .do("loop", ACTIVITY.UNTIL, async ctx => {
              await new Promise(resolve => setTimeout(resolve, 1))

              return ctx.count >= 2
            }, ctx => {
              ctx.count++

              return ctx
            })
        }
      }

      const builder = new ActionBuilder(action)
      const runner = new ActionRunner(builder)

      const result = await runner.run({})
      assert.equal(result.count, 2)
    })
  })

  describe("SPLIT activities", () => {
    it("executes SPLIT with plain function", async() => {
      const action = {
        setup: builder => {
          builder
            .do("init", ctx => {
              ctx.items = ["apple", "banana", "cherry"]

              return ctx
            })
            .do(
              "parallel",
              ACTIVITY.SPLIT,
              ctx => ctx.items.map(item => ({item})),
              (original, settledResults) => {
                // settledResults is from Promise.allSettled
                original.results = settledResults
                  .filter(r => r.status === "fulfilled")
                  .map(r => r.value.item)

                return original
              },
              ctx => {
                ctx.item = ctx.item.toUpperCase()

                return ctx
              }
            )
        }
      }

      const builder = new ActionBuilder(action)
      const runner = new ActionRunner(builder)

      const result = await runner.run({})
      assert.deepEqual(result.results, ["APPLE", "BANANA", "CHERRY"])
    })

    it("executes SPLIT with nested ActionBuilder", async() => {
      const processor = {
        setup: builder => {
          builder
            .do("uppercase", ctx => {
              ctx.item = ctx.item.toUpperCase()

              return ctx
            })
            .do("suffix", ctx => {
              ctx.item = ctx.item + "!"

              return ctx
            })
        }
      }

      const action = {
        setup: builder => {
          builder
            .do("init", ctx => {
              ctx.items = ["a", "b", "c"]

              return ctx
            })
            .do(
              "parallel",
              ACTIVITY.SPLIT,
              ctx => ctx.items.map(item => ({item})),
              (original, settledResults) => {
                // Nested ActionBuilder also returns settled results
                original.results = settledResults
                  .filter(r => r.status === "fulfilled")
                  .map(r => r.value.item)

                return original
              },
              new ActionBuilder(processor)
            )
        }
      }

      const builder = new ActionBuilder(action)
      const runner = new ActionRunner(builder)

      const result = await runner.run({})
      assert.deepEqual(result.results, ["A!", "B!", "C!"])
    })

    it("passes original context to rejoiner", async() => {
      let originalSeen = null

      const action = {
        setup: builder => {
          builder
            .do("init", ctx => {
              ctx.original = "preserved"
              ctx.items = [1, 2]

              return ctx
            })
            .do(
              "parallel",
              ACTIVITY.SPLIT,
              ctx => ctx.items.map(n => ({n})),
              (original, settledResults) => {
                originalSeen = original
                // Extract fulfilled values from settled results
                original.sum = settledResults
                  .filter(r => r.status === "fulfilled")
                  .reduce((sum, r) => sum + r.value.n, 0)

                return original
              },
              ctx => {
                ctx.n = ctx.n * 2

                return ctx
              }
            )
        }
      }

      const builder = new ActionBuilder(action)
      const runner = new ActionRunner(builder)

      const result = await runner.run({})
      assert.equal(originalSeen.original, "preserved")
      assert.equal(result.sum, 6) // (1*2) + (2*2)
    })

    it("handles empty split results", async() => {
      const action = {
        setup: builder => {
          builder
            .do("init", ctx => {
              ctx.items = []

              return ctx
            })
            .do(
              "parallel",
              ACTIVITY.SPLIT,
              ctx => ctx.items.map(item => ({item})),
              (original, settledResults) => {
                original.count = settledResults.length

                return original
              },
              ctx => ctx
            )
        }
      }

      const builder = new ActionBuilder(action)
      const runner = new ActionRunner(builder)

      const result = await runner.run({})
      assert.equal(result.count, 0)
    })

    it("handles async operations in SPLIT", async() => {
      const action = {
        setup: builder => {
          builder
            .do("init", ctx => {
              ctx.items = [1, 2, 3]

              return ctx
            })
            .do(
              "parallel",
              ACTIVITY.SPLIT,
              ctx => ctx.items.map(n => ({n})),
              (original, settledResults) => {
                original.results = settledResults
                  .filter(r => r.status === "fulfilled")
                  .map(r => r.value.n)

                return original
              },
              async ctx => {
                // Simulate async operation
                await new Promise(resolve => setTimeout(resolve, 10))
                ctx.n = ctx.n * 10

                return ctx
              }
            )
        }
      }

      const builder = new ActionBuilder(action)
      const runner = new ActionRunner(builder)

      const result = await runner.run({})
      assert.deepEqual(result.results, [10, 20, 30])
    })

    it("handles rejected promises in SPLIT", async() => {
      const action = {
        setup: builder => {
          builder
            .do("init", ctx => {
              ctx.items = [1, 2, 3]

              return ctx
            })
            .do(
              "parallel",
              ACTIVITY.SPLIT,
              ctx => ctx.items.map(n => ({n})),
              (original, settledResults) => {
                // Count fulfilled and rejected
                original.fulfilled = settledResults.filter(r => r.status === "fulfilled").length
                original.rejected = settledResults.filter(r => r.status === "rejected").length
                original.results = settledResults
                  .filter(r => r.status === "fulfilled")
                  .map(r => r.value.n)

                return original
              },
              async ctx => {
                if(ctx.n === 2) {
                  throw new Error("Failed on 2")
                }

                ctx.n = ctx.n * 10

                return ctx
              }
            )
        }
      }

      const builder = new ActionBuilder(action)
      const runner = new ActionRunner(builder)

      const result = await runner.run({})
      assert.equal(result.fulfilled, 2)
      assert.equal(result.rejected, 1)
      assert.deepEqual(result.results, [10, 30])
    })

    it("handles mixed fulfilled and rejected results in SPLIT", async() => {
      const action = {
        setup: builder => {
          builder
            .do("init", ctx => {
              ctx.items = ["a", "b", "c", "d"]

              return ctx
            })
            .do(
              "parallel",
              ACTIVITY.SPLIT,
              ctx => ctx.items.map(item => ({item})),
              (original, settledResults) => {
                original.successful = []
                original.failed = []

                settledResults.forEach(result => {
                  if(result.status === "fulfilled") {
                    original.successful.push(result.value.item)
                  } else {
                    original.failed.push(result.reason.message)
                  }
                })

                return original
              },
              async ctx => {
                if(ctx.item === "b" || ctx.item === "d") {
                  throw new Error(`Failed: ${ctx.item}`)
                }

                ctx.item = ctx.item.toUpperCase()

                return ctx
              }
            )
        }
      }

      const builder = new ActionBuilder(action)
      const runner = new ActionRunner(builder)

      const result = await runner.run({})
      assert.deepEqual(result.successful, ["A", "C"])
      assert.deepEqual(result.failed, ["Failed: b", "Failed: d"])
    })

    it("handles rejected promises in SPLIT with nested ActionBuilder", async() => {
      const processor = {
        setup: builder => {
          builder
            .do("process", ctx => {
              if(ctx.n === 2) {
                throw new Error("Nested pipeline failed on 2")
              }

              ctx.n = ctx.n * 100

              return ctx
            })
        }
      }

      const action = {
        setup: builder => {
          builder
            .do("init", ctx => {
              ctx.items = [1, 2, 3]

              return ctx
            })
            .do(
              "parallel",
              ACTIVITY.SPLIT,
              ctx => ctx.items.map(n => ({n})),
              (original, settledResults) => {
                // Nested ActionBuilder should also return settled results
                original.fulfilled = settledResults.filter(r => r.status === "fulfilled").length
                original.rejected = settledResults.filter(r => r.status === "rejected").length
                original.results = settledResults
                  .filter(r => r.status === "fulfilled")
                  .map(r => r.value.n)

                return original
              },
              new ActionBuilder(processor)
            )
        }
      }

      const builder = new ActionBuilder(action)
      const runner = new ActionRunner(builder)

      const result = await runner.run({})
      assert.equal(result.fulfilled, 2)
      assert.equal(result.rejected, 1)
      assert.deepEqual(result.results, [100, 300])
    })
  })

  describe("nested ActionBuilders", () => {
    it("executes nested builder", async() => {
      let innerExecuted = false

      const innerAction = {
        setup: builder => {
          builder.do("inner", () => {
            innerExecuted = true
          })
        }
      }

      const outerAction = {
        setup: builder => {
          builder.do("nested", ACTIVITY.WHILE, () => false, new ActionBuilder(innerAction))
        }
      }

      const builder = new ActionBuilder(outerAction)
      const runner = new ActionRunner(builder)

      await runner.run({})
      // Should not execute since predicate is false
      assert.equal(innerExecuted, false)
    })

    it("passes context through nested builders", async() => {
      const innerAction = {
        setup: builder => {
          builder.do("inner", ctx => {
            ctx.innerValue = 42

            return ctx
          })
        }
      }

      const outerAction = {
        setup: builder => {
          builder
            .do("outer", ctx => {
              ctx.outerValue = 10

              return ctx
            })
            .do("nested", ACTIVITY.WHILE, ctx => !ctx.innerValue, new ActionBuilder(innerAction))
        }
      }

      const builder = new ActionBuilder(outerAction)
      const runner = new ActionRunner(builder)

      const result = await runner.run({})
      assert.equal(result.outerValue, 10)
      assert.equal(result.innerValue, 42)
    })
  })

  describe("error handling", () => {
    it("throws on activity errors", async() => {
      const action = {
        setup: builder => {
          builder.do("failing", () => {
            throw new Error("Activity failed")
          })
        }
      }

      const builder = new ActionBuilder(action)
      const runner = new ActionRunner(builder)

      await assert.rejects(
        () => runner.run({}),
        /Activity failed/
      )
    })

    it("throws on errors in WHILE activities", async() => {
      const action = {
        setup: builder => {
          builder.do("loop", ACTIVITY.WHILE, () => true, () => {
            throw new Error("Loop error")
          })
        }
      }

      const builder = new ActionBuilder(action)
      const runner = new ActionRunner(builder)

      await assert.rejects(
        () => runner.run({}),
        /Loop error/
      )
    })

    it("throws on errors in UNTIL activities", async() => {
      const action = {
        setup: builder => {
          builder.do("loop", ACTIVITY.UNTIL, () => false, () => {
            throw new Error("Loop error")
          })
        }
      }

      const builder = new ActionBuilder(action)
      const runner = new ActionRunner(builder)

      await assert.rejects(
        () => runner.run({}),
        /Loop error/
      )
    })
  })

  describe("pipe() inherited from Piper", () => {
    it("processes multiple contexts concurrently", async() => {
      const action = {
        setup: builder => {
          builder.do("process", ctx => {
            ctx.processed = true

            return ctx
          })
        }
      }

      const builder = new ActionBuilder(action)
      const runner = new ActionRunner(builder)

      const results = await runner.pipe([{id: 1}, {id: 2}, {id: 3}], 2)

      assert.equal(results.length, 3)
      results.forEach(result => {
        assert.equal(result.status, "fulfilled")
        assert.ok(result.value.processed)
      })
    })

    it("respects maxConcurrent limit", async() => {
      let concurrent = 0
      let maxConcurrent = 0

      const action = {
        setup: builder => {
          builder.do("process", async ctx => {
            concurrent++
            maxConcurrent = Math.max(maxConcurrent, concurrent)
            await new Promise(resolve => setTimeout(resolve, 10))
            concurrent--

            return ctx
          })
        }
      }

      const builder = new ActionBuilder(action)
      const runner = new ActionRunner(builder)

      await runner.pipe([{}, {}, {}, {}, {}], 2)
      assert.ok(maxConcurrent <= 2)
    })
  })

  describe("toString()", () => {
    it("returns string representation", () => {
      const action = {setup: () => {}}
      const builder = new ActionBuilder(action)
      const runner = new ActionRunner(builder)

      const str = runner.toString()
      assert.ok(str.includes("ActionRunner"))
    })
  })

  describe("activity bound to action", () => {
    it("calls activity with action as this context", async() => {
      class TestAction {
        constructor() {
          this.multiplier = 5
        }

        setup(builder) {
          builder.do("test", function(ctx) {
            ctx.result = this.multiplier * 10

            return ctx
          })
        }
      }

      const builder = new ActionBuilder(new TestAction())
      const runner = new ActionRunner(builder)

      const result = await runner.run({})
      assert.equal(result.result, 50)
    })

    it("binds predicate to action context", async() => {
      class TestAction {
        constructor() {
          this.limit = 3
        }

        setup(builder) {
          builder
            .do("init", ctx => {
              ctx.count = 0

              return ctx
            })
            .do("loop", ACTIVITY.WHILE, function(ctx) {
              return ctx.count < this.limit
            }, function(ctx) {
              ctx.count++

              return ctx
            })
        }
      }

      const builder = new ActionBuilder(new TestAction())
      const runner = new ActionRunner(builder)

      const result = await runner.run({})
      assert.equal(result.count, 3)
    })
  })

  describe("ActionBuilder without parent action in nested context", () => {
    it("executes ActionBuilder without parent action as nested step", async() => {
      const action = {
        setup: builder => {
          builder
            .do("init", ctx => {
              ctx.value = 5

              return ctx
            })
            .do("nested", ACTIVITY.WHILE, ctx => ctx.value < 10,
              new ActionBuilder()
                .do("increment", ctx => {
                  ctx.value += 1

                  return ctx
                })
            )
        }
      }

      const builder = new ActionBuilder(action)
      const runner = new ActionRunner(builder)

      const result = await runner.run({})
      assert.equal(result.value, 10)
    })

    it("executes ActionBuilder without parent in SPLIT activity", async() => {
      const action = {
        setup: builder => {
          builder
            .do("init", ctx => {
              ctx.items = [1, 2, 3]

              return ctx
            })
            .do(
              "parallel",
              ACTIVITY.SPLIT,
              ctx => ctx.items.map(n => ({n})),
              (original, settledResults) => {
                original.results = settledResults
                  .filter(r => r.status === "fulfilled")
                  .map(r => r.value.n)

                return original
              },
              new ActionBuilder()
                .do("multiply", ctx => {
                  ctx.n = ctx.n * 100

                  return ctx
                })
            )
        }
      }

      const builder = new ActionBuilder(action)
      const runner = new ActionRunner(builder)

      const result = await runner.run({})
      assert.deepEqual(result.results, [100, 200, 300])
    })

    it("handles complex nested ActionBuilders without parent actions", async() => {
      const action = {
        setup: builder => {
          builder
            .do("init", ctx => {
              ctx.batches = [[1, 2], [3, 4]]

              return ctx
            })
            .do(
              "process-batches",
              ACTIVITY.SPLIT,
              ctx => ctx.batches.map(batch => ({batch})),
              (original, settledResults) => {
                original.allResults = settledResults
                  .filter(r => r.status === "fulfilled")
                  .flatMap(r => r.value.batchResults)

                return original
              },
              // Nested builder without parent that itself contains SPLIT
              new ActionBuilder()
                .do(
                  "process-items",
                  ACTIVITY.SPLIT,
                  ctx => ctx.batch.map(n => ({n})),
                  (batchCtx, settledResults) => {
                    batchCtx.batchResults = settledResults
                      .filter(r => r.status === "fulfilled")
                      .map(r => r.value.n)

                    return batchCtx
                  },
                  itemCtx => {
                    itemCtx.n = itemCtx.n * 10

                    return itemCtx
                  }
                )
            )
        }
      }

      const builder = new ActionBuilder(action)
      const runner = new ActionRunner(builder)

      const result = await runner.run({})
      assert.deepEqual(result.allResults, [10, 20, 30, 40])
    })
  })
})

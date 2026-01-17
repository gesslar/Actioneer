import test from "node:test"
import assert from "node:assert"

import {ActionBuilder, ActionRunner, ACTIVITY} from "../../src/index.js"

const noopDebug = () => {}

test("ActionBuilder.done()", async t => {
  await t.test("executes callback after all activities", async() => {
    const action = {
      setup(builder) {
        builder
          .do("step1", ctx => {
            ctx.value = 10

            return ctx
          })
          .do("step2", ctx => {
            ctx.value *= 2

            return ctx
          })
          .done(ctx => {
            ctx.finalized = true
            ctx.finalValue = ctx.value + 1000

            return ctx
          })
      }
    }

    const builder = new ActionBuilder(action, {debug: noopDebug})
    const runner = new ActionRunner(builder, {debug: noopDebug})
    const context = {}
    const result = await runner.run(context)

    assert.strictEqual(result.value, 20)
    assert.strictEqual(result.finalized, true)
    assert.strictEqual(result.finalValue, 1020)
  })

  await t.test("done callback receives context from last activity", async() => {
    const action = {
      setup(builder) {
        builder
          .do("step1", () => ({count: 5}))
          .done(ctx => {
            assert.strictEqual(ctx.count, 5)

            return ctx
          })
      }
    }

    const builder = new ActionBuilder(action, {debug: noopDebug})
    const runner = new ActionRunner(builder, {debug: noopDebug})
    await runner.run({})
  })

  await t.test("done callback can transform final result", async() => {
    const action = {
      setup(builder) {
        builder
          .do("step1", () => [1, 2, 3])
          .done(ctx => ctx.reduce((sum, n) => sum + n, 0))
      }
    }

    const builder = new ActionBuilder(action, {debug: noopDebug})
    const runner = new ActionRunner(builder, {debug: noopDebug})
    const result = await runner.run({})

    assert.strictEqual(result, 6)
  })

  await t.test("done callback works with async operations", async() => {
    const action = {
      setup(builder) {
        builder
          .do("step1", async() => {
            await new Promise(resolve => setTimeout(resolve, 10))

            return {data: "processed"}
          })
          .done(async ctx => {
            await new Promise(resolve => setTimeout(resolve, 10))

            return {...ctx, finalized: true}
          })
      }
    }

    const builder = new ActionBuilder(action, {debug: noopDebug})
    const runner = new ActionRunner(builder, {debug: noopDebug})
    const result = await runner.run({})

    assert.deepStrictEqual(result, {data: "processed", finalized: true})
  })

  await t.test("done executes after WHILE loops", async() => {
    const action = {
      setup(builder) {
        builder
          .do("loop", ACTIVITY.WHILE, ctx => ctx.count < 3, ctx => {
            ctx.count++

            return ctx
          })
          .done(ctx => {
            ctx.loopCompleted = true

            return ctx
          })
      }
    }

    const builder = new ActionBuilder(action, {debug: noopDebug})
    const runner = new ActionRunner(builder, {debug: noopDebug})
    const result = await runner.run({count: 0})

    assert.strictEqual(result.count, 3)
    assert.strictEqual(result.loopCompleted, true)
  })

  await t.test("validates callback is a function", () => {
    const action = {
      setup(builder) {
        assert.throws(
          () => builder.done("not a function"),
          /Invalid type/
        )
      }
    }

    new ActionBuilder(action, {debug: noopDebug})
  })

  await t.test("returns builder for chaining", () => {
    const builder = new ActionBuilder(null, {debug: noopDebug})
    const result = builder.done(() => {})

    assert.strictEqual(result, builder)
  })

  await t.test("builder without action can use done", async() => {
    const builder = new ActionBuilder(null, {debug: noopDebug})
      .do("step", () => ({value: 42}))
      .done(ctx => ({...ctx, completed: true}))

    const runner = new ActionRunner(builder, {debug: noopDebug})
    const result = await runner.run({})

    assert.deepStrictEqual(result, {value: 42, completed: true})
  })

  await t.test("throws error if done callback fails", async() => {
    const action = {
      setup(builder) {
        builder
          .do("step1", () => ({value: 10}))
          .done(() => {
            throw new Error("Done failed")
          })
      }
    }

    const builder = new ActionBuilder(action, {debug: noopDebug})
    const runner = new ActionRunner(builder, {debug: noopDebug})

    await assert.rejects(
      () => runner.run({}),
      /Done failed/
    )
  })
})

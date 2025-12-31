#!/usr/bin/env node

import {describe, it} from 'node:test'
import assert from 'node:assert/strict'

import {ActionBuilder, ActionRunner, ACTIVITY} from '../../src/browser/index.js'

const noopDebug = () => {}

describe('ActionBuilder (browser)', () => {
  describe('basic functionality', () => {
    it('creates builder and executes simple pipeline', async() => {
      class SimpleAction {
        setup(builder) {
          builder
            .do('step1', ctx => {
              ctx.value = 10
              return ctx
            })
            .do('step2', ctx => {
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

    it('supports WHILE loops', async() => {
      class LoopAction {
        setup(builder) {
          builder
            .do('initialize', ctx => {
              ctx.count = 0
              return ctx
            })
            .do('increment', ACTIVITY.WHILE, ctx => ctx.count < 3, ctx => {
              ctx.count++
              return ctx
            })
            .do('finish', ctx => ctx.count)
        }
      }

      const builder = new ActionBuilder(new LoopAction())
      const runner = new ActionRunner(builder)
      const result = await runner.run({})

      assert.strictEqual(result, 3)
    })

    it('supports SPLIT activities', async() => {
      class SplitAction {
        setup(builder) {
          builder
            .do('initialize', ctx => {
              ctx.items = [1, 2, 3]
              return ctx
            })
            .do('parallel', ACTIVITY.SPLIT,
              ctx => ctx.items.map(item => ({item})),
              (original, results) => {
                original.processed = results
                  .filter(r => r.status === 'fulfilled')
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

  describe('hooks with pre-instantiated objects', () => {
    it('executes hooks when provided via withHooks()', async() => {
      const executionLog = []

      class TestHooks {
        constructor({debug}) {
          this.debug = debug
        }

        async before$work(context) {
          executionLog.push('before-work')
        }

        async after$work(context) {
          executionLog.push('after-work')
        }
      }

      class HookedAction {
        setup(builder) {
          builder
            .withHooks(new TestHooks({debug: noopDebug}))
            .do('work', ctx => {
              executionLog.push('work')
              return ctx
            })
        }
      }

      const builder = new ActionBuilder(new HookedAction())
      const runner = new ActionRunner(builder)
      await runner.run({})

      assert.ok(executionLog.includes('before-work'))
      assert.ok(executionLog.includes('work'))
      assert.ok(executionLog.includes('after-work'))
    })
  })

  describe('pipe() for concurrent execution', () => {
    it('processes multiple contexts concurrently', async() => {
      class ConcurrentAction {
        setup(builder) {
          builder.do('double', ctx => {
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
      assert.strictEqual(results[0].status, 'fulfilled')
      assert.strictEqual(results[0].value, 2)
      assert.strictEqual(results[1].value, 4)
      assert.strictEqual(results[2].value, 6)
    })
  })
})

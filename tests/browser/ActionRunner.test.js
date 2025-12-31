#!/usr/bin/env node

import {describe, it} from 'node:test'
import assert from 'node:assert/strict'

import {ActionBuilder, ActionRunner, ACTIVITY} from '../../src/browser/index.js'

describe('ActionRunner (browser)', () => {
  describe('run() method', () => {
    it('executes simple pipeline', async() => {
      class SimpleAction {
        setup(builder) {
          builder.do('add', ctx => {
            ctx.result = (ctx.a || 0) + (ctx.b || 0)
            return ctx.result
          })
        }
      }

      const builder = new ActionBuilder(new SimpleAction())
      const runner = new ActionRunner(builder)
      const result = await runner.run({a: 5, b: 3})

      assert.strictEqual(result, 8)
    })

    it('handles async operations', async() => {
      class AsyncAction {
        setup(builder) {
          builder.do('asyncWork', async ctx => {
            await new Promise(resolve => setTimeout(resolve, 10))
            ctx.done = true
            return ctx
          })
        }
      }

      const builder = new ActionBuilder(new AsyncAction())
      const runner = new ActionRunner(builder)
      const result = await runner.run({})

      assert.strictEqual(result.done, true)
    })
  })

  describe('pipe() method', () => {
    it('processes multiple contexts with concurrency control', async() => {
      const executionOrder = []

      class TrackedAction {
        setup(builder) {
          builder.do('track', async ctx => {
            executionOrder.push(ctx.id)
            await new Promise(resolve => setTimeout(resolve, 10))
            return ctx.id
          })
        }
      }

      const builder = new ActionBuilder(new TrackedAction())
      const runner = new ActionRunner(builder)
      const contexts = [{id: 1}, {id: 2}, {id: 3}]
      const results = await runner.pipe(contexts, 2) // Max 2 concurrent

      assert.strictEqual(results.length, 3)
      assert.strictEqual(results.filter(r => r.status === 'fulfilled').length, 3)
    })

    it('returns settled results for all contexts', async() => {
      class MixedAction {
        setup(builder) {
          builder.do('mayFail', ctx => {
            if(ctx.shouldFail) {
              throw new Error('Failed')
            }
            return ctx.value
          })
        }
      }

      const builder = new ActionBuilder(new MixedAction())
      const runner = new ActionRunner(builder)
      const contexts = [
        {value: 'success1'},
        {shouldFail: true},
        {value: 'success2'}
      ]
      const results = await runner.pipe(contexts, 4)

      assert.strictEqual(results[0].status, 'fulfilled')
      assert.strictEqual(results[0].value, 'success1')
      assert.strictEqual(results[1].status, 'rejected')
      assert.strictEqual(results[2].status, 'fulfilled')
      assert.strictEqual(results[2].value, 'success2')
    })
  })
})

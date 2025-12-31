#!/usr/bin/env node

import {describe, it} from 'node:test'
import assert from 'node:assert/strict'

import {ActionBuilder, ActionRunner, ACTIVITY} from '../../src/index.js'

const noopDebug = () => {}

describe('Issue: Guard against repeated withHooks on nested builders', () => {
  it('should handle WHILE loop with nested ActionBuilder that executes multiple times', async () => {
    const executionLog = []
    let iterations = 0

    class TestHooks {
      constructor({debug}) {
        this.debug = debug
      }

      async before$outer(context) {
        executionLog.push('before-outer')
      }

      async after$outer(context) {
        executionLog.push('after-outer')
      }

      async before$inner(context) {
        executionLog.push('before-inner')
      }

      async after$inner(context) {
        executionLog.push('after-inner')
      }
    }

    class InnerAction {
      setup(builder) {
        builder.do('inner', ctx => {
          executionLog.push('inner')
          return ctx
        })
      }
    }

    class OuterAction {
      setup(builder) {
        builder
          .withHooks(new TestHooks({debug: noopDebug}))
          .do('outer', ctx => {
            executionLog.push('outer')
            return ctx
          })
          .do('nested', ACTIVITY.WHILE, ctx => {
            iterations++
            return iterations < 3  // Run twice to trigger the issue
          }, new ActionBuilder(new InnerAction()))
      }
    }
    
    const builder = new ActionBuilder(new OuterAction())
    const runner = new ActionRunner(builder)
    
    // This should not throw "Hooks have already been configured" error
    await runner.pipe([{}], 1)
    
    // Verify the nested activity executed multiple times
    const innerCount = executionLog.filter(log => log === 'inner').length
    assert.strictEqual(innerCount, 2, 'inner activity should execute twice')
    
    // Verify hooks were called for each iteration
    const beforeInnerCount = executionLog.filter(log => log === 'before-inner').length
    assert.strictEqual(beforeInnerCount, 2, 'before-inner hook should be called twice')
  })
  
  it('should handle reusing same ActionRunner multiple times', async () => {
    const executionLog = []

    class TestHooks {
      constructor({debug}) {
        this.debug = debug
      }

      async before$inner(context) {
        executionLog.push('before-inner')
      }
    }

    class InnerAction {
      setup(builder) {
        builder.do('inner', ctx => {
          executionLog.push('inner')
          return ctx
        })
      }
    }

    class OuterAction {
      setup(builder) {
        const nestedBuilder = new ActionBuilder(new InnerAction())
        builder
          .withHooks(new TestHooks({debug: noopDebug}))
          .do('nested', ctx => {
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
    const innerCount = executionLog.filter(log => log === 'inner').length
    assert.strictEqual(innerCount, 2, 'inner activity should execute twice')
  })
})

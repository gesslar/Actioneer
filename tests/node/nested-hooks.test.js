#!/usr/bin/env node

import {describe, it} from 'node:test'
import assert from 'node:assert/strict'

import {ActionBuilder, ActionRunner, ACTIVITY} from '../../src/index.js'

const noopDebug = () => {}

describe('Nested ActionBuilders with hooks', () => {
  it('propagates hooks to nested ActionBuilder with WHILE activity', async () => {
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
            return iterations < 2  // Run once
          }, new ActionBuilder(new InnerAction()))
      }
    }
    
    const builder = new ActionBuilder(new OuterAction())
    const runner = new ActionRunner(builder)
    await runner.pipe([{}], 1)
    
    // Verify hooks were called for both outer and inner activities
    assert.ok(executionLog.includes('before-outer'), 'before-outer hook should be called')
    assert.ok(executionLog.includes('outer'), 'outer activity should execute')
    assert.ok(executionLog.includes('after-outer'), 'after-outer hook should be called')
    assert.ok(executionLog.includes('before-inner'), 'before-inner hook should be called')
    assert.ok(executionLog.includes('inner'), 'inner activity should execute')
    assert.ok(executionLog.includes('after-inner'), 'after-inner hook should be called')
  })
  
  it('propagates hooks to ActionBuilder returned from function', async () => {
    const executionLog = []
    
    class TestHooks {
      constructor({debug}) {
        this.debug = debug
      }
      
      async before$outer(context) {
        executionLog.push('before-outer')
      }
      
      async before$dynamic(context) {
        executionLog.push('before-dynamic')
      }
    }
    
    class DynamicAction {
      setup(builder) {
        builder.do('dynamic', ctx => {
          executionLog.push('dynamic')
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
            // Return an ActionBuilder dynamically
            return new ActionBuilder(new DynamicAction())
          })
      }
    }
    
    const builder = new ActionBuilder(new OuterAction())
    const runner = new ActionRunner(builder)
    const result = await runner.run({})
    
    // Verify hooks were propagated to dynamically returned ActionBuilder
    assert.ok(executionLog.includes('before-outer'), 'before-outer hook should be called')
    assert.ok(executionLog.includes('outer'), 'outer activity should execute')
    assert.ok(executionLog.includes('before-dynamic'), 'before-dynamic hook should be called')
    assert.ok(executionLog.includes('dynamic'), 'dynamic activity should execute')
  })
  
  it('works with nested ActionBuilder when no hooks are configured', async () => {
    const executionLog = []
    let iterations = 0
    
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
          .do('outer', ctx => {
            executionLog.push('outer')
            return ctx
          })
          .do('nested', ACTIVITY.WHILE, ctx => {
            iterations++
            return iterations < 2  // Run once
          }, new ActionBuilder(new InnerAction()))
      }
    }
    
    const builder = new ActionBuilder(new OuterAction())
    const runner = new ActionRunner(builder)
    await runner.pipe([{}], 1)
    
    // Verify both activities execute without hooks
    assert.ok(executionLog.includes('outer'), 'outer activity should execute')
    assert.ok(executionLog.includes('inner'), 'inner activity should execute')
  })
})

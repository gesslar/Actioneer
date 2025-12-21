#!/usr/bin/env node

import {describe, it} from 'node:test'
import assert from 'node:assert/strict'

import {ActionBuilder, ActionRunner} from '../../src/index.js'

describe('Simple hooks test', () => {
  it('calls hooks for a simple activity', async () => {
    const executionLog = []
    
    class TestHooks {
      constructor({debug}) {
        this.debug = debug
      }
      
      async before$test(context) {
        executionLog.push('before-test')
      }
      
      async after$test(context) {
        executionLog.push('after-test')
      }
    }
    
    class SimpleAction {
      setup(builder) {
        builder
          .withHooks(new TestHooks({debug: () => {}}))
          .do('test', ctx => {
            executionLog.push('test')
            return ctx
          })
      }
    }
    
    const builder = new ActionBuilder(new SimpleAction())
    const runner = new ActionRunner(builder)
    await runner.run({})
    
    // Verify hooks were called
    assert.ok(executionLog.includes('before-test'), 'before-test hook should be called')
    assert.ok(executionLog.includes('test'), 'test activity should execute')
    assert.ok(executionLog.includes('after-test'), 'after-test hook should be called')
  })
})

#!/usr/bin/env node

import {describe, it} from 'node:test'
import assert from 'node:assert/strict'

import {ActionBuilder, ActionRunner} from '../../src/index.js'

describe('setup/cleanup lifecycle hooks', () => {
  it('fires setup before items and cleanup after, on a fresh pipe()', async () => {
    const log = []

    class Hooks {
      // Arrow-field so `this` is the hooks instance regardless of how it is
      // invoked. setup must run before any item is processed.
      setup = async () => {
        log.push('setup')
        this.resource = {id: 42}
      }

      before$go = ctx => {
        log.push('before')
        // The resource opened in setup must be available here.
        ctx.resource = this.resource
      }

      cleanup = async () => {
        log.push('cleanup')
      }
    }

    class Action {
      setup(builder) {
        builder
          .withHooks(new Hooks())
          .do('go', ctx => ({resource: ctx.resource}))
          .done(ctx => ctx)
      }
    }

    const runner = new ActionRunner(new ActionBuilder(new Action()))
    const settled = await runner.pipe([{}])

    // setup must run before the activity, cleanup after.
    assert.deepEqual(log, ['setup', 'before', 'cleanup'])

    // The resource opened in setup reached the activity.
    assert.equal(settled[0].status, 'fulfilled')
    assert.equal(settled[0].value.resource.id, 42)
  })

  it('does not fire setup/cleanup for a bare run() (lifecycle is pipe-scoped)', async () => {
    const log = []

    class Hooks {
      setup = async () => { log.push('setup') }
      before$go = () => { log.push('before') }
      cleanup = async () => { log.push('cleanup') }
    }

    class Action {
      setup(builder) {
        builder
          .withHooks(new Hooks())
          .do('go', ctx => ctx)
          .done(ctx => ctx)
      }
    }

    const runner = new ActionRunner(new ActionBuilder(new Action()))
    await runner.run({})

    // before$ still fires; setup/cleanup belong to the pipe() batch lifecycle.
    assert.deepEqual(log, ['before'])
  })
})

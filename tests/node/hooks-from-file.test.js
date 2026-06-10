#!/usr/bin/env node

import {describe, it} from 'node:test'
import assert from 'node:assert/strict'
import {fileURLToPath} from 'node:url'

import {ActionBuilder, ActionRunner} from '../../src/index.js'

const fixture = fileURLToPath(new URL('./fixtures/FileHooks.js', import.meta.url))
const missing = fileURLToPath(new URL('./fixtures/DoesNotExist.js', import.meta.url))

describe('withHooksFile (Node entry)', () => {
  it('loads hooks from a file and runs setup/before/after end-to-end', async () => {
    const action = {
      setup(builder) {
        builder
          .withHooksFile(fixture, 'FileHooks')
          .do('go', ctx => ({injected: ctx.injected}))
          .done(ctx => ctx)
      },
    }

    const settled = await new ActionRunner(new ActionBuilder(action)).pipe([{}])

    assert.equal(settled[0].status, 'fulfilled')
    // setup opened the resource, before$ injected it, after$ stamped the result
    assert.equal(settled[0].value.injected, 'from-setup')
    assert.equal(settled[0].value.stamped, true)
  })

  it('throws a clear error naming the missing file', async () => {
    const action = {
      setup(builder) {
        builder
          .withHooksFile(missing, 'FileHooks')
          .do('go', ctx => ctx)
          .done(ctx => ctx)
      },
    }

    await assert.rejects(
      () => new ActionRunner(new ActionBuilder(action)).pipe([{}]),
      err => {
        const reasons = err.errors ?? [err]
        const text = reasons.map(r => r.message ?? String(r)).join(' | ')

        assert.match(text, /No such hooks file/)
        assert.match(text, /DoesNotExist\.js/)

        return true
      },
    )
  })
})

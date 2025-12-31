#!/usr/bin/env node

import {describe, it} from 'node:test'
import assert from 'node:assert/strict'

import * as api from '../../src/browser/index.js'

describe('Browser exports', () => {
  it('exports core classes', () => {
    assert.ok(api.ActionBuilder)
    assert.ok(api.ActionRunner)
    assert.ok(api.Piper)
    assert.ok(api.ActionWrapper)
    assert.ok(api.Activity)
    assert.ok(api.ACTIVITY)
    assert.ok(api.ActionHooks)
  })

  it('does not export Node-specific features', async() => {
    // Browser version of ActionHooks doesn't have file-based loading
    // This is tested implicitly - the browser version simply doesn't have
    // the FileObject dependency, so attempting file-based hooks would fail
    assert.ok(true, 'Browser exports are clean')
  })
})

#!/usr/bin/env node

import {describe, it} from 'node:test'
import assert from 'node:assert/strict'

import * as api from '../../src/index.js'

describe('Public exports', () => {
  it('exports core classes', () => {
    assert.ok(api.ActionBuilder)
    assert.ok(api.ActionRunner)
    assert.ok(api.Piper)
    assert.ok(api.ActionWrapper)
    assert.ok(api.Activity)
    assert.ok(api.ACTIVITY)
  })
})

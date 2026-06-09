#!/usr/bin/env node

import {describe, it} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {fileURLToPath} from 'node:url'
import {dirname, join} from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const rootDir = join(here, '..', '..')

const readPkg = path => JSON.parse(readFileSync(path, 'utf8'))
const ownPkg = readPkg(join(rootDir, 'package.json'))

/**
 * Extract the minimum [major, minor, patch] from a node engines range such as
 * ">=24.11.0", "^24.0.0", "24", or "24.x". Missing or wildcard segments count
 * as 0. Returns null when no version-looking token is present.
 *
 * @param {string} range - An engines.node range string.
 * @returns {Array<number>|null} The minimum version as a [major, minor, patch] tuple.
 */
const minVersion = range => {
  const match = String(range).match(/(\d+)(?:\.(\d+|x|\*))?(?:\.(\d+|x|\*))?/)

  if(!match)
    return null

  const num = part => {
    const n = Number.parseInt(part, 10)

    return Number.isFinite(n) ? n : 0
  }

  return [num(match[1]), num(match[2]), num(match[3])]
}

/**
 * Compare two [major, minor, patch] tuples.
 *
 * @param {Array<number>} a - Left tuple.
 * @param {Array<number>} b - Right tuple.
 * @returns {number} Negative if a < b, 0 if equal, positive if a > b.
 */
const compare = (a, b) => {
  for(let i = 0; i < 3; i++) {
    if(a[i] !== b[i])
      return a[i] - b[i]
  }

  return 0
}

describe('Node engines floor', () => {
  it('declares a node engines floor', () => {
    assert.ok(ownPkg.engines?.node, 'package.json must declare engines.node')
    assert.ok(
      minVersion(ownPkg.engines.node),
      `engines.node "${ownPkg.engines.node}" has no parseable minimum version`
    )
  })

  it('runs the test suite on a node that satisfies the declared floor', () => {
    const floor = minVersion(ownPkg.engines.node)
    const current = process.versions.node.split('.').map(Number)

    assert.ok(
      compare(current, floor) >= 0,
      `running node ${process.versions.node} is below the declared floor ${ownPkg.engines.node}`
    )
  })

  // The regression this guards: lowering our floor (e.g. >=24.11 -> >=24) and
  // then later bumping a dependency that needs more than our floor. Installs
  // still succeed, but the package is silently broken on the now-claimed-supported
  // older runtimes. This asserts our floor is never below what a runtime dep requires.
  it('floor is not lower than any runtime dependency requires', () => {
    const floor = minVersion(ownPkg.engines.node)
    const deps = Object.keys(ownPkg.dependencies ?? {})

    for(const dep of deps) {
      let depPkg

      try {
        depPkg = readPkg(join(rootDir, 'node_modules', dep, 'package.json'))
      } catch {
        continue
      }

      const depRange = depPkg.engines?.node

      if(!depRange)
        continue

      const depFloor = minVersion(depRange)

      if(!depFloor)
        continue

      assert.ok(
        compare(floor, depFloor) >= 0,
        `${ownPkg.name} declares node "${ownPkg.engines.node}" but dependency ` +
        `${dep} requires "${depRange}"; lowering the floor below a dependency ` +
        `makes the manifest lie about supported runtimes`
      )
    }
  })
})

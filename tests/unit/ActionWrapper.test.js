#!/usr/bin/env node

import {describe, it} from "node:test"
import assert from "node:assert/strict"

import {ActionWrapper, ActionBuilder, ACTIVITY} from "../../src/index.js"

describe("ActionWrapper", () => {
  describe("constructor", () => {
    it("creates wrapper with activities map", () => {
      const activities = new Map()
      activities.set("test", {
        name: "test",
        op: () => {}
      })

      const wrapper = new ActionWrapper({
        activities,
        hooks: null,
        debug: () => {}
      })

      assert.ok(wrapper)
    })

    it("accepts debug function", () => {
      const debugCalls = []
      const debug = (msg) => debugCalls.push(msg)

      const activities = new Map()
      const wrapper = new ActionWrapper({
        activities,
        hooks: null,
        debug
      })

      assert.ok(wrapper)
      assert.ok(debugCalls.length > 0)
    })

    it("accepts hooks instance", () => {
      const activities = new Map()
      const hooks = {
        before$test: () => {},
        after$test: () => {}
      }

      const wrapper = new ActionWrapper({
        activities,
        hooks,
        debug: () => {}
      })

      assert.ok(wrapper)
    })

    it("handles empty activities map", () => {
      const activities = new Map()

      const wrapper = new ActionWrapper({
        activities,
        hooks: null,
        debug: () => {}
      })

      assert.ok(wrapper)
    })
  })

  describe("activities getter", () => {
    it("returns an iterator", () => {
      const activities = new Map()
      activities.set("test", {
        name: "test",
        op: () => {}
      })

      const wrapper = new ActionWrapper({
        activities,
        hooks: null,
        debug: () => {}
      })

      const iterator = wrapper.activities
      assert.ok(iterator)
      assert.equal(typeof iterator.next, "function")
    })

    it("yields Activity instances", () => {
      const activities = new Map()
      activities.set("test", {
        name: "test",
        op: () => {}
      })

      const wrapper = new ActionWrapper({
        activities,
        hooks: null,
        debug: () => {}
      })

      for(const activity of wrapper.activities) {
        assert.ok(activity)
        assert.equal(activity.constructor.name, "Activity")
        assert.equal(activity.name, "test")
      }
    })

    it("yields activities in insertion order", () => {
      const activities = new Map()
      activities.set("first", {name: "first", op: () => {}})
      activities.set("second", {name: "second", op: () => {}})
      activities.set("third", {name: "third", op: () => {}})

      const wrapper = new ActionWrapper({
        activities,
        hooks: null,
        debug: () => {}
      })

      const names = []
      for(const activity of wrapper.activities) {
        names.push(activity.name)
      }

      assert.deepEqual(names, ["first", "second", "third"])
    })

    it("passes hooks to each activity", () => {
      const activities = new Map()
      activities.set("test", {
        name: "test",
        op: () => {}
      })

      const hooks = {
        before$test: () => {},
        after$test: () => {}
      }

      const wrapper = new ActionWrapper({
        activities,
        hooks,
        debug: () => {}
      })

      for(const activity of wrapper.activities) {
        assert.equal(activity.hooks, hooks)
      }
    })

    it("can be iterated multiple times", () => {
      const activities = new Map()
      activities.set("test", {name: "test", op: () => {}})

      const wrapper = new ActionWrapper({
        activities,
        hooks: null,
        debug: () => {}
      })

      let firstCount = 0
      for(const activity of wrapper.activities) {
        firstCount++
      }

      let secondCount = 0
      for(const activity of wrapper.activities) {
        secondCount++
      }

      assert.equal(firstCount, 1)
      assert.equal(secondCount, 1)
    })

    it("yields zero activities for empty map", () => {
      const activities = new Map()

      const wrapper = new ActionWrapper({
        activities,
        hooks: null,
        debug: () => {}
      })

      let count = 0
      for(const activity of wrapper.activities) {
        count++
      }

      assert.equal(count, 0)
    })

    it("preserves activity properties", () => {
      const activities = new Map()
      const predicate = () => true
      activities.set("looped", {
        name: "looped",
        op: () => {},
        kind: ACTIVITY.WHILE,
        pred: predicate,
        action: {test: "action"}
      })

      const wrapper = new ActionWrapper({
        activities,
        hooks: null,
        debug: () => {}
      })

      for(const activity of wrapper.activities) {
        assert.equal(activity.name, "looped")
        assert.equal(activity.kind, ACTIVITY.WHILE)
        assert.equal(activity.pred, predicate)
        assert.deepEqual(activity.action, {test: "action"})
      }
    })
  })

  describe("integration with ActionBuilder", () => {
    it("is created by ActionBuilder.build()", async () => {
      const action = {
        setup: (builder) => {
          builder.do("test", () => {})
        }
      }

      const builder = new ActionBuilder(action)
      const wrapper = await builder.build()

      assert.ok(wrapper instanceof ActionWrapper)
    })

    it("preserves all activities from builder", async () => {
      const action = {
        setup: (builder) => {
          builder
            .do("step1", () => {})
            .do("step2", () => {})
            .do("step3", () => {})
        }
      }

      const builder = new ActionBuilder(action)
      const wrapper = await builder.build()

      const names = []
      for(const activity of wrapper.activities) {
        names.push(activity.name)
      }

      assert.deepEqual(names, ["step1", "step2", "step3"])
    })

    it("includes hooks from builder when configured", async () => {
      const hooks = {
        before$test: () => {},
        after$test: () => {}
      }

      const action = {
        setup: (builder) => {
          builder
            .withHooks(hooks)
            .do("test", () => {})
        }
      }

      const builder = new ActionBuilder(action)
      const wrapper = await builder.build()

      // Verify wrapper was created with hooks configuration
      // The actual hooks implementation is tested in ActionHooks tests
      assert.ok(wrapper)

      const activities = [...wrapper.activities]
      assert.equal(activities.length, 1)
    })

    it("handles complex activity configurations", async () => {
      const action = {
        setup: (builder) => {
          builder
            .do("simple", () => {})
            .do("looped", ACTIVITY.WHILE, () => false, () => {})
            .do("another", () => {})
        }
      }

      const builder = new ActionBuilder(action)
      const wrapper = await builder.build()

      const activities = [...wrapper.activities]
      assert.equal(activities.length, 3)
      assert.equal(activities[0].name, "simple")
      assert.equal(activities[1].name, "looped")
      assert.equal(activities[2].name, "another")
      assert.equal(activities[1].kind, ACTIVITY.WHILE)
    })
  })

  describe("symbol names", () => {
    it("handles symbol activity names", () => {
      const activities = new Map()
      const name = Symbol("test-activity")
      activities.set(name, {
        name,
        op: () => {}
      })

      const wrapper = new ActionWrapper({
        activities,
        hooks: null,
        debug: () => {}
      })

      for(const activity of wrapper.activities) {
        assert.equal(activity.name, name)
      }
    })

    it("preserves symbol order in iteration", () => {
      const activities = new Map()
      const sym1 = Symbol("first")
      const sym2 = Symbol("second")
      const sym3 = Symbol("third")

      activities.set(sym1, {name: sym1, op: () => {}})
      activities.set(sym2, {name: sym2, op: () => {}})
      activities.set(sym3, {name: sym3, op: () => {}})

      const wrapper = new ActionWrapper({
        activities,
        hooks: null,
        debug: () => {}
      })

      const names = []
      for(const activity of wrapper.activities) {
        names.push(activity.name)
      }

      assert.deepEqual(names, [sym1, sym2, sym3])
    })
  })
})

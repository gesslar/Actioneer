#!/usr/bin/env node

import {describe, it} from "node:test"
import assert from "node:assert/strict"

import {Activity, ACTIVITY} from "../../src/index.js"

describe("Activity", () => {
  describe("ACTIVITY flags", () => {
    it("exports WHILE flag", () => {
      assert.ok(ACTIVITY.WHILE)
      assert.equal(typeof ACTIVITY.WHILE, "number")
      assert.equal(ACTIVITY.WHILE, 1 << 1)
    })

    it("exports UNTIL flag", () => {
      assert.ok(ACTIVITY.UNTIL)
      assert.equal(typeof ACTIVITY.UNTIL, "number")
      assert.equal(ACTIVITY.UNTIL, 1 << 2)
    })

    it("exports SPLIT flag", () => {
      assert.ok(ACTIVITY.SPLIT)
      assert.equal(typeof ACTIVITY.SPLIT, "number")
      assert.equal(ACTIVITY.SPLIT, 1 << 3)
    })

    it("flags are unique bit values", () => {
      assert.notEqual(ACTIVITY.WHILE, ACTIVITY.UNTIL)
      assert.notEqual(ACTIVITY.WHILE, ACTIVITY.SPLIT)
      assert.notEqual(ACTIVITY.UNTIL, ACTIVITY.SPLIT)
    })

    it("flags are frozen", () => {
      assert.throws(() => {
        ACTIVITY.WHILE = 999
      })
    })
  })

  describe("constructor", () => {
    it("creates activity with minimal config", () => {
      const activity = new Activity({
        action: null,
        name: "test",
        op: () => {}
      })

      assert.ok(activity)
      assert.equal(activity.name, "test")
    })

    it("creates activity with full config", () => {
      const action = {}
      const op = () => "result"
      const pred = () => true
      const hooks = {}
      const splitter = () => []
      const rejoiner = () => {}

      const activity = new Activity({
        action,
        name: "complex",
        op,
        kind: ACTIVITY.WHILE,
        pred,
        hooks,
        splitter,
        rejoiner
      })

      assert.equal(activity.name, "complex")
      assert.equal(activity.kind, ACTIVITY.WHILE)
      assert.equal(activity.pred, pred)
      assert.equal(activity.action, action)
      assert.equal(activity.splitter, splitter)
      assert.equal(activity.rejoiner, rejoiner)
    })

    it("handles symbol names", () => {
      const name = Symbol("test-activity")
      const activity = new Activity({
        action: null,
        name,
        op: () => {}
      })

      assert.equal(activity.name, name)
    })
  })

  describe("properties", () => {
    it("name getter returns activity name", () => {
      const activity = new Activity({
        action: null,
        name: "myActivity",
        op: () => {}
      })

      assert.equal(activity.name, "myActivity")
    })

    it("kind getter returns activity kind", () => {
      const activity = new Activity({
        action: null,
        name: "test",
        op: () => {},
        kind: ACTIVITY.UNTIL
      })

      assert.equal(activity.kind, ACTIVITY.UNTIL)
    })

    it("kind getter returns null when not set", () => {
      const activity = new Activity({
        action: null,
        name: "test",
        op: () => {}
      })

      assert.equal(activity.kind, undefined)
    })

    it("pred getter returns predicate function", () => {
      const pred = () => true
      const activity = new Activity({
        action: null,
        name: "test",
        op: () => {},
        pred
      })

      assert.equal(activity.pred, pred)
    })

    it("opKind getter returns Function for function ops", () => {
      const activity = new Activity({
        action: null,
        name: "test",
        op: () => {}
      })

      assert.equal(activity.opKind, "Function")
    })

    it("op getter returns operation", () => {
      const op = () => "result"
      const activity = new Activity({
        action: null,
        name: "test",
        op
      })

      assert.equal(activity.op, op)
    })

    it("splitter getter returns splitter function", () => {
      const splitter = () => []
      const activity = new Activity({
        action: null,
        name: "test",
        op: () => {},
        splitter
      })

      assert.equal(activity.splitter, splitter)
    })

    it("rejoiner getter returns rejoiner function", () => {
      const rejoiner = () => {}
      const activity = new Activity({
        action: null,
        name: "test",
        op: () => {},
        rejoiner
      })

      assert.equal(activity.rejoiner, rejoiner)
    })

    it("action getter returns action instance", () => {
      const action = {name: "test-action"}
      const activity = new Activity({
        action,
        name: "test",
        op: () => {}
      })

      assert.equal(activity.action, action)
    })

    it("hooks getter returns hooks instance", () => {
      const hooks = {before$test: () => {}}
      const activity = new Activity({
        action: null,
        name: "test",
        op: () => {},
        hooks
      })

      assert.equal(activity.hooks, hooks)
    })
  })

  describe("run()", () => {
    it("executes operation with context", async () => {
      const context = {value: 10}
      const op = (ctx) => {
        ctx.value = ctx.value * 2
        return ctx
      }

      const activity = new Activity({
        action: null,
        name: "test",
        op
      })

      const result = await activity.run(context)
      assert.equal(result.value, 20)
    })

    it("calls operation with bound action as this", async () => {
      const action = {multiplier: 3}
      const context = {value: 10}

      const activity = new Activity({
        action,
        name: "test",
        op: function(ctx) {
          ctx.value = ctx.value * this.multiplier
          return ctx
        }
      })

      const result = await activity.run(context)
      assert.equal(result.value, 30)
    })

    it("handles async operations", async () => {
      const activity = new Activity({
        action: null,
        name: "test",
        op: async (ctx) => {
          await new Promise(resolve => setTimeout(resolve, 10))
          return {completed: true}
        }
      })

      const result = await activity.run({})
      assert.ok(result.completed)
    })

    it("calls before hook before operation", async () => {
      const executionOrder = []
      const hooks = {
        callHook: async (event, name, ctx) => {
          if(event === "before") executionOrder.push("before")
          if(event === "after") executionOrder.push("after")
        }
      }

      const activity = new Activity({
        action: null,
        name: "test",
        op: (ctx) => {
          executionOrder.push("operation")
          return ctx
        },
        hooks
      })

      await activity.run({})
      assert.deepEqual(executionOrder, ["before", "operation", "after"])
    })

    it("returns result from operation", async () => {
      const activity = new Activity({
        action: null,
        name: "test",
        op: () => ({result: "success"})
      })

      const result = await activity.run({})
      assert.deepEqual(result, {result: "success"})
    })
  })

  describe("setActionHooks()", () => {
    it("sets hooks on activity", () => {
      const activity = new Activity({
        action: null,
        name: "test",
        op: () => {}
      })

      const hooks = {before$test: () => {}}
      const returned = activity.setActionHooks(hooks)

      assert.equal(activity.hooks, hooks)
      assert.equal(returned, activity)
    })

    it("returns this for chaining", () => {
      const activity = new Activity({
        action: null,
        name: "test",
        op: () => {}
      })

      const result = activity.setActionHooks({})
      assert.equal(result, activity)
    })

    it("does not set hooks when passed falsy value", () => {
      const activity = new Activity({
        action: null,
        name: "test",
        op: () => {}
      })

      const originalHooks = activity.hooks
      activity.setActionHooks(null)
      assert.equal(activity.hooks, originalHooks)
    })
  })
})

#!/usr/bin/env node

import {describe, it} from "node:test"
import assert from "node:assert/strict"

import {ActionBuilder, ActionWrapper, ACTIVITY} from "../../src/index.js"

describe("ActionBuilder", () => {
  describe("constructor", () => {
    it("creates builder with action that has setup", () => {
      const action = {
        setup: (builder) => {
          builder.do("test", () => {})
        }
      }

      const builder = new ActionBuilder(action)
      assert.ok(builder)
    })

    it("throws error when action has no setup method", () => {
      const action = {}

      assert.throws(
        () => new ActionBuilder(action),
        /Setup must be a function/
      )
    })

    it("accepts no action", () => {
      const builder = new ActionBuilder()
      assert.ok(builder)
    })

    it("accepts debug function", () => {
      const debugCalled = []
      const debug = (msg) => debugCalled.push(msg)

      const action = {
        setup: () => {}
      }

      const builder = new ActionBuilder(action, {debug})
      assert.ok(builder)
    })

    it("generates a tag when not provided", () => {
      const action = {setup: () => {}}
      const builder = new ActionBuilder(action)

      assert.ok(builder.tag)
      assert.equal(typeof builder.tag, "symbol")
    })

    it("accepts custom tag", () => {
      const tag = Symbol("custom-tag")
      const action = {setup: () => {}}
      const builder = new ActionBuilder(action, {tag})

      assert.equal(builder.tag, tag)
    })

    it("uses action.tag if available", () => {
      const tag = Symbol("action-tag")
      const action = {
        tag,
        setup: () => {}
      }

      const builder = new ActionBuilder(action)
      assert.equal(builder.tag, tag)
    })
  })

  describe("do()", () => {
    it("registers simple activity", () => {
      const action = {
        setup: (builder) => {
          builder.do("step1", (ctx) => ctx)
        }
      }

      const builder = new ActionBuilder(action)
      assert.ok(builder)
    })

    it("returns builder for chaining", () => {
      const action = {
        setup: () => {}
      }

      const builder = new ActionBuilder(action)
      const result = builder.do("test", () => {})

      assert.equal(result, builder)
    })

    it("registers activity with WHILE loop", () => {
      const action = {
        setup: (builder) => {
          builder.do("loop", ACTIVITY.WHILE, (ctx) => ctx.count < 5, (ctx) => {
            ctx.count++
            return ctx
          })
        }
      }

      const builder = new ActionBuilder(action)
      assert.ok(builder)
    })

    it("registers activity with UNTIL loop", () => {
      const action = {
        setup: (builder) => {
          builder.do("loop", ACTIVITY.UNTIL, (ctx) => ctx.done, (ctx) => {
            ctx.done = true
            return ctx
          })
        }
      }

      const builder = new ActionBuilder(action)
      assert.ok(builder)
    })

    it("registers activity with SPLIT", () => {
      const action = {
        setup: (builder) => {
          builder.do(
            "parallel",
            ACTIVITY.SPLIT,
            (ctx) => [ctx], // splitter
            (ctx) => ctx,   // rejoiner
            (ctx) => ctx    // operation
          )
        }
      }

      const builder = new ActionBuilder(action)
      assert.ok(builder)
    })

    it("validates splitter is a function for SPLIT activities", () => {
      const action = {setup: () => {}}
      const builder = new ActionBuilder(action)

      assert.throws(
        () => builder.do("test", ACTIVITY.SPLIT, "not-a-function", () => {}, () => {})
      )
    })

    it("validates rejoiner is a function for SPLIT activities", () => {
      const action = {setup: () => {}}
      const builder = new ActionBuilder(action)

      assert.throws(
        () => builder.do("test", ACTIVITY.SPLIT, () => {}, "not-a-function", () => {})
      )
    })

    it("validates operation is a function for SPLIT activities", () => {
      const action = {setup: () => {}}
      const builder = new ActionBuilder(action)

      assert.throws(
        () => builder.do("test", ACTIVITY.SPLIT, () => {}, () => {}, "not-a-function")
      )
    })

    it("throws error when using 4-argument form with non-SPLIT kind", () => {
      const action = {setup: () => {}}
      const builder = new ActionBuilder(action)

      assert.throws(
        () => builder.do("test", ACTIVITY.WHILE, () => {}, () => {}, () => {}),
        /4-argument form of 'do' is only valid for ACTIVITY.SPLIT/
      )
    })

    it("allows ActionBuilder as operation for SPLIT activities", () => {
      const innerAction = {
        setup: (builder) => {
          builder.do("inner", () => {})
        }
      }

      const action = {
        setup: (builder) => {
          builder.do(
            "parallel",
            ACTIVITY.SPLIT,
            (ctx) => [ctx],
            (ctx) => ctx,
            new ActionBuilder(innerAction)
          )
        }
      }

      const builder = new ActionBuilder(action)
      assert.ok(builder)
    })

    it("throws error on duplicate activity name", () => {
      const action = {
        setup: () => {}
      }

      const builder = new ActionBuilder(action)

      builder.do("step1", () => {})

      assert.throws(
        () => builder.do("step1", () => {}),
        /Activity 'step1' has already been registered/
      )
    })

    it("throws error with invalid number of arguments", () => {
      const action = {setup: () => {}}
      const builder = new ActionBuilder(action)

      assert.throws(
        () => builder.do("test", "arg1", "arg2"),
        /Invalid number of arguments/
      )
    })

    it("validates operation is a function for simple do", () => {
      const action = {setup: () => {}}
      const builder = new ActionBuilder(action)

      assert.throws(
        () => builder.do("test", "not-a-function")
      )
    })

    it("validates kind is a number for loop activities", () => {
      const action = {setup: () => {}}
      const builder = new ActionBuilder(action)

      assert.throws(
        () => builder.do("test", "not-a-number", () => true, () => {})
      )
    })

    it("validates predicate is a function for loop activities", () => {
      const action = {setup: () => {}}
      const builder = new ActionBuilder(action)

      assert.throws(
        () => builder.do("test", ACTIVITY.WHILE, "not-a-function", () => {})
      )
    })

    it("allows ActionBuilder as operation", () => {
      const innerAction = {
        setup: (builder) => {
          builder.do("inner", () => {})
        }
      }

      const action = {
        setup: (builder) => {
          builder.do("nested", ACTIVITY.WHILE, () => false, new ActionBuilder(innerAction))
        }
      }

      const builder = new ActionBuilder(action)
      assert.ok(builder)
    })

    it("accepts symbol as activity name", () => {
      const name = Symbol("activity-name")
      const action = {setup: () => {}}
      const builder = new ActionBuilder(action)

      builder.do(name, () => {})
      assert.ok(builder)
    })
  })

  describe("withHooksFile()", () => {
    it("configures hooks from file", () => {
      const action = {
        setup: (builder) => {
          builder
            .withHooksFile("./hooks.js", "MyHooks")
            .do("test", () => {})
        }
      }

      const builder = new ActionBuilder(action)
      assert.ok(builder)
    })

    it("returns builder for chaining", () => {
      const action = {setup: () => {}}
      const builder = new ActionBuilder(action)

      const result = builder.withHooksFile("./hooks.js", "MyHooks")
      assert.equal(result, builder)
    })

    it("throws error when hooks already configured", () => {
      const action = {setup: () => {}}
      const builder = new ActionBuilder(action)

      builder.withHooksFile("./hooks1.js", "Hooks1")

      assert.throws(
        () => builder.withHooksFile("./hooks2.js", "Hooks2"),
        /Hooks have already been configured/
      )
    })
  })

  describe("withHooks()", () => {
    it("configures hooks with instance", () => {
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
      assert.ok(builder)
    })

    it("returns builder for chaining", () => {
      const action = {setup: () => {}}
      const builder = new ActionBuilder(action)

      const result = builder.withHooks({})
      assert.equal(result, builder)
    })

    it("throws error when hooks already configured", () => {
      const action = {setup: () => {}}
      const builder = new ActionBuilder(action)

      builder.withHooks({})

      assert.throws(
        () => builder.withHooks({}),
        /Hooks have already been configured/
      )
    })

    it("allows calling withHooks with same instance (idempotent)", () => {
      const action = {setup: () => {}}
      const builder = new ActionBuilder(action)

      const hooks = {}
      builder.withHooks(hooks)

      // Should not throw when called with the same instance
      assert.doesNotThrow(() => builder.withHooks(hooks))
    })

    it("throws error when mixing withHooks and withHooksFile", () => {
      const action = {setup: () => {}}
      const builder = new ActionBuilder(action)

      builder.withHooks({})

      assert.throws(
        () => builder.withHooksFile("./hooks.js", "Hooks"),
        /Hooks have already been configured/
      )
    })
  })

  describe("build()", () => {
    it("returns ActionWrapper instance", async () => {
      const action = {
        setup: (builder) => {
          builder.do("test", () => {})
        }
      }

      const builder = new ActionBuilder(action)
      const wrapper = await builder.build()

      assert.ok(wrapper)
      assert.ok(wrapper.constructor.name === "ActionWrapper")
    })

    it("calls action.setup during build", async () => {
      let setupCalled = false

      const action = {
        setup: (builder) => {
          setupCalled = true
          builder.do("test", () => {})
        }
      }

      const builder = new ActionBuilder(action)
      await builder.build()

      assert.ok(setupCalled)
    })

    it("only calls setup once even with multiple builds", async () => {
      let setupCallCount = 0

      const action = {
        setup: (builder) => {
          setupCallCount++
          builder.do("test", () => {})
        }
      }

      const builder = new ActionBuilder(action)
      await builder.build()
      await builder.build()

      assert.equal(setupCallCount, 1)
    })

    it("assigns tag to action during build", async () => {
      const action = {
        setup: (builder) => {
          builder.do("test", () => {})
        }
      }

      const builder = new ActionBuilder(action)
      assert.equal(action.tag, undefined)

      await builder.build()
      assert.ok(action.tag)
    })

    it("builds wrapper with registered activities", async () => {
      const action = {
        setup: (builder) => {
          builder
            .do("step1", () => {})
            .do("step2", () => {})
        }
      }

      const builder = new ActionBuilder(action)
      const wrapper = await builder.build()

      // Verify activities are present by iterating
      const activities = []
      for(const activity of wrapper.activities) {
        activities.push(activity.name)
      }

      assert.deepEqual(activities, ["step1", "step2"])
    })
  })

  describe("tag property", () => {
    it("exposes tag via getter", () => {
      const tag = Symbol("test-tag")
      const action = {setup: () => {}}
      const builder = new ActionBuilder(action, {tag})

      assert.equal(builder.tag, tag)
    })
  })

  describe("fluent builder pattern", () => {
    it("supports chaining multiple operations", () => {
      const action = {
        setup: (builder) => {
          const result = builder
            .do("step1", () => {})
            .do("step2", () => {})
            .do("step3", () => {})

          assert.equal(result, builder)
        }
      }

      const builder = new ActionBuilder(action)
      assert.ok(builder)
    })

    it("supports mixing activities and hooks", () => {
      const action = {
        setup: (builder) => {
          builder
            .withHooks({})
            .do("step1", () => {})
            .do("step2", () => {})
        }
      }

      const builder = new ActionBuilder(action)
      assert.ok(builder)
    })
  })
})

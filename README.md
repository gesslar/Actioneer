# Actioneer

Actioneer is a small, focused action orchestration library for Node.js and browser environments. It provides a fluent builder for composing activities and a concurrent runner with lifecycle hooks and control flow semantics (while/until/if/break/continue). The project is written as ES modules and targets Node 20+ and modern browsers.

This repository extracts the action orchestration pieces from a larger codebase and exposes a compact API for building pipelines of work that can run concurrently with hook support and nested pipelines.

## Included Classes

### Browser

These classes work in browsers, Node.js, and browser-like environments such as Tauri, Electron, and Deno.

| Name | Description |
| ---- | ----------- |
| ActionBuilder | Fluent builder for composing activities into pipelines |
| ActionHooks | Lifecycle hook management (requires pre-instantiated hooks in browser) |
| ActionRunner | Concurrent pipeline executor with configurable concurrency |
| ActionWrapper | Activity container and iterator |
| Activity | Activity definitions with WHILE, UNTIL, IF, BREAK, CONTINUE, and SPLIT modes |
| Piper | Base concurrent processing with worker pools |

### Node.js

Includes all browser functionality plus Node.js-specific features for file-based hook loading.

| Name | Description |
| ---- | ----------- |
| ActionHooks | Enhanced version with file-based hook loading via `withHooksFile()` |

## Installation

```bash
npm install @gesslar/actioneer
```

## Usage

Actioneer is environment-aware and automatically detects whether it is being used in a browser or Node.js. You can optionally specify the `node` or `browser` variant explicitly.

### Browser

#### jsDelivr (runtime only)

```html
https://cdn.jsdelivr.net/npm/@gesslar/actioneer
```

#### esm.sh (runtime with types)

```html
https://esm.sh/@gesslar/actioneer
https://esm.sh/@gesslar/actioneer?dts  (serves .d.ts for editors)
```

#### Browser Import Example

```javascript
import {ActionBuilder, ActionRunner} from "https://esm.sh/@gesslar/actioneer"

class MyAction {
  setup(builder) {
    builder
      .do("step1", ctx => { ctx.result = ctx.input * 2 })
      .do("step2", ctx => { return ctx.result })
  }
}

const builder = new ActionBuilder(new MyAction())
const runner = new ActionRunner(builder)
const results = await runner.run({input: 5})
console.log(results) // 10
```

### Node.js

#### Auto-detected (recommended)

```javascript
import {ActionBuilder, ActionRunner} from "@gesslar/actioneer"
```

#### Explicit variants

```javascript
// Explicitly use Node.js version (with file-based hooks)
import {ActionBuilder, ActionRunner, ActionHooks} from "@gesslar/actioneer/node"

// Explicitly use browser version
import {ActionBuilder, ActionRunner} from "@gesslar/actioneer/browser"
```

**Note:** The browser version is fully functional in Node.js but lacks file-based hook loading. Use `withHooks()` with pre-instantiated hooks instead of `withHooksFile()`.

## Quick Start

Import the builder and runner, define an action and run it:

```js
import { ActionBuilder, ActionRunner } from "@gesslar/actioneer"

class MyAction {
  setup (builder) {
    builder
      .do("prepare", ctx => { ctx.count = 0 })
      .do("work", ctx => { ctx.count += 1 })
      .do("finalise", ctx => { return ctx.count })
  }
}

const builder = new ActionBuilder(new MyAction())
const runner = new ActionRunner(builder)
const results = await runner.pipe([{}], 4) // run up to 4 contexts concurrently

// pipe() returns settled results: {status: "fulfilled", value: ...} or {status: "rejected", reason: ...}
results.forEach(result => {
  if (result.status === "fulfilled") {
    console.log("Count:", result.value)
  } else {
    console.error("Error:", result.reason)
  }
})
```

## Types (TypeScript / VS Code)

This package ships basic TypeScript declaration files under `src/types` and exposes them via the package `types` entrypoint. VS Code users will get completions and quick help when consuming the package:

```ts
import { ActionBuilder, ActionRunner } from "@gesslar/actioneer"
```

If you'd like more complete typings or additional JSDoc, open an issue or send a PR — contributions welcome.

## Activity Modes

Actioneer supports six distinct execution modes for activities, allowing you to control how operations are executed:

### Execute Once (Default)

The simplest mode executes an activity exactly once per context:

```js
class MyAction {
  setup(builder) {
    builder.do("processItem", ctx => {
      ctx.result = ctx.input * 2
    })
  }
}
```

### WHILE Mode

Loops while a predicate returns `true`. The predicate is evaluated **before** each iteration:

```js
import { ActionBuilder, ACTIVITY } from "@gesslar/actioneer"

class CounterAction {
  #shouldContinue = (ctx) => ctx.count < 10

  #increment = (ctx) => {
    ctx.count += 1
  }

  setup(builder) {
    builder
      .do("initialize", ctx => { ctx.count = 0 })
      .do("countUp", ACTIVITY.WHILE, this.#shouldContinue, this.#increment)
      .do("finish", ctx => { return ctx.count })
  }
}
```

The activity will continue executing as long as the predicate returns `true`. Once it returns `false`, execution moves to the next activity.

### UNTIL Mode

Loops until a predicate returns `true`. The predicate is evaluated **after** each iteration:

```js
import { ActionBuilder, ACTIVITY } from "@gesslar/actioneer"

class ProcessorAction {
  #queueIsEmpty = (ctx) => ctx.queue.length === 0

  #processItem = (ctx) => {
    const item = ctx.queue.shift()
    ctx.processed.push(item)
  }

  setup(builder) {
    builder
      .do("initialize", ctx => {
        ctx.queue = [1, 2, 3, 4, 5]
        ctx.processed = []
      })
      .do("process", ACTIVITY.UNTIL, this.#queueIsEmpty, this.#processItem)
      .do("finish", ctx => { return ctx.processed })
  }
}
```

The activity executes at least once, then continues while the predicate returns `false`. Once it returns `true`, execution moves to the next activity.

### IF Mode

Conditionally executes an activity based on a predicate. Unlike WHILE/UNTIL, IF executes at most once:

```js
import { ActionBuilder, ACTIVITY } from "@gesslar/actioneer"

class ConditionalAction {
  #shouldProcess = (ctx) => ctx.value > 10

  #processLargeValue = (ctx) => {
    ctx.processed = ctx.value * 2
  }

  setup(builder) {
    builder
      .do("initialize", ctx => { ctx.value = 15 })
      .do("maybeProcess", ACTIVITY.IF, this.#shouldProcess, this.#processLargeValue)
      .do("finish", ctx => { return ctx })
  }
}
```

If the predicate returns `true`, the activity executes once. If `false`, the activity is skipped entirely and execution moves to the next activity.

### BREAK Mode

Breaks out of a WHILE or UNTIL loop when a predicate returns `true`. BREAK must be used inside a nested ActionBuilder within a loop:

```js
import { ActionBuilder, ACTIVITY } from "@gesslar/actioneer"

class BreakExample {
  setup(builder) {
    builder
      .do("initialize", ctx => {
        ctx.count = 0
        ctx.items = []
      })
      .do("loop", ACTIVITY.WHILE, ctx => ctx.count < 100,
        new ActionBuilder()
          .do("increment", ctx => {
            ctx.count++
            ctx.items.push(ctx.count)
            return ctx
          })
          .do("earlyExit", ACTIVITY.BREAK, ctx => ctx.count >= 5)
      )
      .do("finish", ctx => { return ctx.items }) // Returns [1, 2, 3, 4, 5]
  }
}
```

When the BREAK predicate returns `true`, the loop terminates immediately and execution continues with the next activity after the loop.

**Important:** BREAK only works inside a nested ActionBuilder that is the operation of a WHILE or UNTIL activity. Using BREAK outside of a loop context will throw an error.

### CONTINUE Mode

Skips the remaining activities in the current loop iteration and continues to the next iteration. Like BREAK, CONTINUE must be used inside a nested ActionBuilder within a loop:

```js
import { ActionBuilder, ACTIVITY } from "@gesslar/actioneer"

class ContinueExample {
  setup(builder) {
    builder
      .do("initialize", ctx => {
        ctx.count = 0
        ctx.processed = []
      })
      .do("loop", ACTIVITY.WHILE, ctx => ctx.count < 5,
        new ActionBuilder()
          .do("increment", ctx => {
            ctx.count++
            return ctx
          })
          .do("skipEvens", ACTIVITY.CONTINUE, ctx => ctx.count % 2 === 0)
          .do("process", ctx => {
            ctx.processed.push(ctx.count)
            return ctx
          })
      )
      .do("finish", ctx => { return ctx.processed }) // Returns [1, 3, 5]
  }
}
```

When the CONTINUE predicate returns `true`, the remaining activities in that iteration are skipped, and the loop continues with its next iteration (re-evaluating the loop predicate for WHILE, or executing the operation then evaluating for UNTIL).

**Important:** Like BREAK, CONTINUE only works inside a nested ActionBuilder within a WHILE or UNTIL loop.

### Combining Control Flow

You can combine IF, BREAK, and CONTINUE within the same loop for complex control flow:

```js
class CombinedExample {
  setup(builder) {
    builder
      .do("initialize", ctx => {
        ctx.count = 0
        ctx.results = []
      })
      .do("loop", ACTIVITY.WHILE, ctx => ctx.count < 100,
        new ActionBuilder()
          .do("increment", ctx => { ctx.count++; return ctx })
          .do("exitAt10", ACTIVITY.BREAK, ctx => ctx.count > 10)
          .do("skipEvens", ACTIVITY.CONTINUE, ctx => ctx.count % 2 === 0)
          .do("processLarge", ACTIVITY.IF, ctx => ctx.count > 5, ctx => {
            ctx.results.push(ctx.count * 10)
            return ctx
          })
          .do("processAll", ctx => {
            ctx.results.push(ctx.count)
            return ctx
          })
      )
  }
}
// Results: [1, 3, 5, 70, 7, 90, 9]
// - 1, 3, 5: odd numbers <= 5, just pushed
// - 7, 9: odd numbers > 5, pushed with *10 first, then pushed
// - evens skipped by CONTINUE
// - loop exits when count > 10
```

### SPLIT Mode

Executes with a split/rejoin pattern for parallel execution. This mode requires a splitter function to divide the context and a rejoiner function to recombine results:

```js
import { ActionBuilder, ACTIVITY } from "@gesslar/actioneer"

class ParallelProcessor {
  #split = (ctx) => {
    // Split context into multiple items for parallel processing
    return ctx.items.map(item => ({ item, processedBy: "worker" }))
  }

  #rejoin = (originalCtx, splitResults) => {
    // Recombine parallel results back into original context
    originalCtx.results = splitResults.map(r => r.item)
    return originalCtx
  }

  #processItem = (ctx) => {
    ctx.item = ctx.item.toUpperCase()
  }

  setup(builder) {
    builder
      .do("initialize", ctx => {
        ctx.items = ["apple", "banana", "cherry"]
      })
      .do("parallel", ACTIVITY.SPLIT, this.#split, this.#rejoin, this.#processItem)
      .do("finish", ctx => { return ctx.results })
  }
}
```

**How SPLIT Mode Works:**

1. The **splitter** function receives the context and returns an array of contexts (one per parallel task)
2. Each split context is processed in parallel through the **operation** function
3. The **rejoiner** function receives the original context and the array of settled results from `Promise.allSettled()`
4. The rejoiner combines the results and returns the updated context

**Important: SPLIT uses `Promise.allSettled()`**

The SPLIT mode uses `Promise.allSettled()` internally to execute parallel operations. This means your **rejoiner** function will receive an array of settlement objects, not the raw context values. Each element in the array will be either:

- `{ status: "fulfilled", value: <result> }` for successful operations
- `{ status: "rejected", reason: <error> }` for failed operations

Your rejoiner must handle settled results accordingly. You can process them however you need - check each `status` manually, or use helper utilities like those in `@gesslar/toolkit`:

```js
import { Util } from "@gesslar/toolkit"

#rejoin = (originalCtx, settledResults) => {
  // settledResults is an array of settlement objects
  // Each has either { status: "fulfilled", value: ... }
  // or { status: "rejected", reason: ... }

  // Example: extract only successful results
  originalCtx.results = Util.fulfilledValues(settledResults)

  // Example: check for any failures
  if (Util.anyRejected(settledResults)) {
    originalCtx.errors = Util.rejectedReasons(
      Util.settledAndRejected(settledResults)
    )
  }

  return originalCtx
}
```

**Nested Pipelines with SPLIT:**

You can use nested ActionBuilders with SPLIT mode for complex parallel workflows:

```js
class NestedParallel {
  #split = (ctx) => ctx.batches.map(batch => ({ batch }))

  #rejoin = (original, results) => {
    original.processed = results.flatMap(r => r.batch)
    return original
  }

  setup(builder) {
    builder
      .do("parallel", ACTIVITY.SPLIT, this.#split, this.#rejoin,
        new ActionBuilder(this)
          .do("step1", ctx => { /* ... */ })
          .do("step2", ctx => { /* ... */ })
      )
  }
}
```

### Mode Constraints

- **Only one mode per activity**: Each activity can have only one mode. Attempting to combine modes will throw an error
- **SPLIT requires both functions**: The splitter and rejoiner are both mandatory for SPLIT mode
- **Predicates must return boolean**: All predicates (WHILE, UNTIL, IF, BREAK, CONTINUE) should return `true` or `false`
- **BREAK/CONTINUE require loop context**: These modes only work inside a nested ActionBuilder within a WHILE or UNTIL loop

### Mode Summary Table

| Mode         | Signature                                                  | Predicate Timing | Use Case                                    |
| ------------ | ---------------------------------------------------------- | ---------------- | ------------------------------------------- |
| **Default**  | `.do(name, operation)`                                     | N/A              | Execute once per context                    |
| **WHILE**    | `.do(name, ACTIVITY.WHILE, predicate, operation)`          | Before iteration | Loop while condition is true                |
| **UNTIL**    | `.do(name, ACTIVITY.UNTIL, predicate, operation)`          | After iteration  | Loop until condition is true                |
| **IF**       | `.do(name, ACTIVITY.IF, predicate, operation)`             | Before execution | Conditional execution (once or skip)        |
| **BREAK**    | `.do(name, ACTIVITY.BREAK, predicate)`                     | When reached     | Exit enclosing WHILE/UNTIL loop             |
| **CONTINUE** | `.do(name, ACTIVITY.CONTINUE, predicate)`                  | When reached     | Skip to next iteration of enclosing loop    |
| **SPLIT**    | `.do(name, ACTIVITY.SPLIT, splitter, rejoiner, operation)` | N/A              | Parallel execution with split/rejoin        |

## Running Actions: `run()` vs `pipe()`

ActionRunner provides two methods for executing your action pipelines:

### `run(context)` - Single Context Execution

Executes the pipeline once with a single context. Returns the final context value directly, or throws if an error occurs.

```js
const builder = new ActionBuilder(new MyAction())
const runner = new ActionRunner(builder)

try {
  const result = await runner.run({input: "data"})
  console.log(result) // Final context value
} catch (error) {
  console.error("Pipeline failed:", error)
}
```

**Use `run()` when:**

- Processing a single context
- You want errors to throw immediately
- You prefer traditional try/catch error handling

### `pipe(contexts, maxConcurrent)` - Concurrent Batch Execution

Executes the pipeline concurrently across multiple contexts with a configurable concurrency limit. Returns an array of **settled results** - never throws on individual pipeline failures.

```js
const builder = new ActionBuilder(new MyAction())
const runner = new ActionRunner(builder)

const contexts = [{id: 1}, {id: 2}, {id: 3}]
const results = await runner.pipe(contexts, 4) // Max 4 concurrent

results.forEach((result, i) => {
  if (result.status === "fulfilled") {
    console.log(`Context ${i} succeeded:`, result.value)
  } else {
    console.error(`Context ${i} failed:`, result.reason)
  }
})
```

**Use `pipe()` when:**

- Processing multiple contexts in parallel
- You want to control concurrency (default: 10)
- You need all results (both successes and failures)
- Error handling should be at the call site

**Important: `pipe()` returns settled results**

The `pipe()` method uses `Promise.allSettled()` internally and returns an array of settlement objects:

- `{status: "fulfilled", value: <result>}` for successful executions
- `{status: "rejected", reason: <error>}` for failed executions

This design ensures error handling responsibility stays at the call site - you decide how to handle failures rather than the framework deciding for you.

## Pipeline Completion: `done()`

The `done()` method registers a callback that executes after all activities in the pipeline complete, regardless of whether an error occurred. This is useful for cleanup, finalization, or returning a transformed result.

```js
import { ActionBuilder, ActionRunner } from "@gesslar/actioneer"

class MyAction {
  setup(builder) {
    builder
      .do("step1", ctx => { ctx.a = 1 })
      .do("step2", ctx => { ctx.b = 2 })
      .done(ctx => {
        // This runs after all activities complete
        return { total: ctx.a + ctx.b }
      })
  }
}

const builder = new ActionBuilder(new MyAction())
const runner = new ActionRunner(builder)
const result = await runner.run({})
console.log(result) // { total: 3 }
```

### Key Behaviors

- **Always executes**: The `done()` callback runs even if an earlier activity throws an error (similar to `finally` in try/catch)
- **Top-level only**: The callback only runs for the outermost pipeline, not for nested builders inside loops (WHILE/UNTIL). However, for SPLIT activities, `done()` runs for each split context since each is an independent execution
- **Transform the result**: Whatever you return from `done()` becomes the final pipeline result
- **Access to action context**: The callback is bound to the action instance, so `this` refers to your action class
- **Async support**: The callback can be async and return a Promise

### Use Cases

**Cleanup resources:**

```js
builder
  .do("openConnection", ctx => { ctx.conn = openDb() })
  .do("query", ctx => { ctx.data = ctx.conn.query("SELECT *") })
  .done(ctx => {
    ctx.conn.close() // Always close, even on error
    return ctx.data
  })
```

**Transform the final result:**

```js
builder
  .do("gather", ctx => { ctx.items = [1, 2, 3] })
  .do("process", ctx => { ctx.items = ctx.items.map(x => x * 2) })
  .done(ctx => ctx.items) // Return just the items array, not the whole context
```

**Logging and metrics:**

```js
builder
  .do("start", ctx => { ctx.startTime = Date.now() })
  .do("work", ctx => { /* ... */ })
  .done(ctx => {
    console.log(`Pipeline completed in ${Date.now() - ctx.startTime}ms`)
    return ctx
  })
```

## ActionHooks

Actioneer supports lifecycle hooks that can execute before and after each activity in your pipeline. Hooks can be configured by file path (Node.js only) or by providing a pre-instantiated hooks object (Node.js and browser).

### Hook System Overview

The hook system allows you to:

- Execute code before and after each activity in your pipeline
- Implement setup and cleanup logic
- Add observability and logging to your pipelines
- Modify or inspect the context flowing through activities

### Configuring Hooks

#### Browser: Pre-instantiated Hooks

In browser environments, you must provide pre-instantiated hooks objects:

```js
import {ActionBuilder, ActionRunner} from "@gesslar/actioneer"

class MyActionHooks {
  constructor({debug}) {
    this.debug = debug
  }

  async before$prepare(context) {
    this.debug("About to prepare", context)
  }

  async after$prepare(context) {
    this.debug("Finished preparing", context)
  }
}

const hooks = new MyActionHooks({debug: console.log})

class MyAction {
  setup(builder) {
    builder
      .withHooks(hooks)
      .do("prepare", ctx => { ctx.count = 0 })
      .do("work", ctx => { ctx.count += 1 })
  }
}

const builder = new ActionBuilder(new MyAction())
const runner = new ActionRunner(builder)
const result = await runner.pipe([{}], 4)
```

#### Node.js: File-based or Pre-instantiated

**Option 1: Load hooks from a file** (Node.js only)

```js
import {ActionBuilder, ActionRunner} from "@gesslar/actioneer"

class MyAction {
  setup(builder) {
    builder
      .withHooksFile("./hooks/MyActionHooks.js", "MyActionHooks")
      .do("prepare", ctx => { ctx.count = 0 })
      .do("work", ctx => { ctx.count += 1 })
  }
}

const builder = new ActionBuilder(new MyAction())
const runner = new ActionRunner(builder)
const result = await runner.pipe([{}], 4)
```

**Option 2: Provide a pre-instantiated hooks object** (Node.js and browser)

```js
import {ActionBuilder, ActionRunner} from "@gesslar/actioneer"
import {MyActionHooks} from "./hooks/MyActionHooks.js"

const hooks = new MyActionHooks({debug: console.log})

class MyAction {
  setup(builder) {
    builder
      .withHooks(hooks)
      .do("prepare", ctx => { ctx.count = 0 })
      .do("work", ctx => { ctx.count += 1 })
  }
}

const builder = new ActionBuilder(new MyAction())
const runner = new ActionRunner(builder)
const result = await runner.pipe([{}], 4)
```

### Writing Hooks

Hooks are classes exported from a module. The hook methods follow a naming convention: `event$activityName`.

```js
// hooks/MyActionHooks.js
export class MyActionHooks {
  constructor({ debug }) {
    this.debug = debug
  }

  // Hook that runs before the "prepare" activity
  async before$prepare(context) {
    this.debug("About to prepare", context)
  }

  // Hook that runs after the "prepare" activity
  async after$prepare(context) {
    this.debug("Finished preparing", context)
  }

  // Hook that runs before the "work" activity
  async before$work(context) {
    this.debug("Starting work", context)
  }

  // Hook that runs after the "work" activity
  async after$work(context) {
    this.debug("Work complete", context)
  }

  // Optional: setup hook runs once at initialization
  async setup(args) {
    this.debug("Hooks initialized")
  }

  // Optional: cleanup hook for teardown
  async cleanup(args) {
    this.debug("Hooks cleaned up")
  }
}
```

### Hook Naming Convention

Activity names are transformed to hook method names:

- Spaces are removed and words are camelCased: `"do work"` → `before$doWork` / `after$doWork`
- Non-word characters are stripped: `"step-1"` → `before$step1` / `after$step1`
- First word stays lowercase: `"Prepare Data"` → `before$prepareData` / `after$prepareData`

### Hook Timeout

By default, hooks have a 1-second (1000ms) timeout. If a hook exceeds this timeout, the pipeline will throw a `Sass` error. You can configure the timeout when creating the hooks:

```js
new ActionHooks({
  actionKind: "MyActionHooks",
  hooksFile: "./hooks.js",
  hookTimeout: 5000, // 5 seconds
  debug: console.log
})
```

### Nested Pipelines and Hooks

When you nest ActionBuilders (for branching or parallel execution), the parent's hooks are automatically passed to all children, ensuring consistent hook behavior throughout the entire pipeline hierarchy.

### Optional TypeScript (local, opt-in)

This project intentionally avoids committing TypeScript tool configuration. If you'd like to use TypeScript's checker locally (for editor integration or optional JSDoc checking), you can drop a `tsconfig.json` in your working copy — `tsconfig.json` is already in the repository `.gitignore`, so feel free to typecheck yourselves into oblivion.

Two common local options:

- Editor/resolve-only (no checking): set `moduleResolution`/`module` and `noEmit` so the editor resolves imports consistently without typechecking.
- Local JSDoc checks: set `allowJs: true` and `checkJs: true` with `noEmit: true` and `strict: false` to let the TypeScript checker validate JSDoc without enforcing strict typing.

Examples of minimal configs and one-liners to run them are in the project discussion; use them locally if you want an optional safety net. The repository will not require or enforce these files.

## Testing

Run the comprehensive test suite with Node's built-in test runner:

```bash
npm test
```

The test suite includes 200+ tests covering all core classes and behaviors:

- **Activity** - Activity definitions, ACTIVITY flags (WHILE, UNTIL, IF, BREAK, CONTINUE, SPLIT), and execution
- **ActionBuilder** - Fluent builder API, activity registration, and hooks configuration
- **ActionWrapper** - Activity iteration and integration with ActionBuilder
- **ActionRunner** - Pipeline execution, loop semantics, nested builders, and error handling
- **ActionHooks** - Hook lifecycle, loading from files, and timeout handling
- **Piper** - Concurrent processing, worker pools, and lifecycle hooks

Tests are organized in `tests/unit/` with one file per class. All tests use Node's native test runner and assertion library.

## Publishing

This repository is prepared for npm publishing. The package uses ESM and targets Node 20+. The `files` field includes the `src/` folder and types. If you publish, ensure the `version` in `package.json` is updated and you have an npm token configured on the CI runner.

A simple publish checklist:

- Bump the package version
- Run `npm run lint` and `npm test`
- Build/typecheck if you add a build step
- Tag and push a Git release
- Run `npm publish --access public`

## Contributing

Contributions and issues are welcome. Please open issues for feature requests or bugs. If you're submitting a PR, include tests for new behavior where possible.

## License

This project is published under the Unlicense (see `UNLICENSE.txt`).

## Most Portum

As this is my repo, I have some opinions I would like to express and be made clear.

- We use ESLint around here. I have a very opinionated and hand-rolled `eslint.config.js` that is a requirement to be observed for this repo. Prettier can fuck off. It is the worst tooling I have ever had the misfortune of experiencing (no offence to Prettier) and I will not suffer its poor conventions in my repos in any way except to be denigrated (again, no offence). If you come culting some cargo about that that product, you are reminded that this is released under the Unlicense and are invited to fork off and drown the beautiful code in your poisonous Kool-Aid. Oh, yeah!
- TypeScript is the devil and is the antithesis of pantser coding. It is discouraged to think that I have gone through rigourous anything that isn't development by sweat. If you're a plotter, I a-plot you for your work, and if you would like to extend this project with your rulers, your abacusi, and your Kanji tattoos that definitely mean exactly what you think they do, I invite you to please do, but in your own repos.
- Thank you, I love you. BYEBYE!

🤗

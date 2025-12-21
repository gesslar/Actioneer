# Actioneer

Actioneer is a small, focused Node.js action orchestration library. It provides a fluent builder for composing activities and a concurrent runner with lifecycle hooks and simple loop semantics (while/until). The project is written as ES modules and targets Node 20+.

This repository extracts the action orchestration pieces from a larger codebase and exposes a compact API for building pipelines of work that can run concurrently with hook support and nested pipelines.

## Install

From npm:

```bash
npm install @gesslar/actioneer
```

## Quick start

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
const result = await runner.pipe([{}], 4) // run up to 4 contexts concurrently
console.log(result)
```

## Types (TypeScript / VS Code)

This package ships basic TypeScript declaration files under `src/types` and exposes them via the package `types` entrypoint. VS Code users will get completions and quick help when consuming the package:

```ts
import { ActionBuilder, ActionRunner } from "@gesslar/actioneer"
```

If you'd like more complete typings or additional JSDoc, open an issue or send a PR — contributions welcome.

## Activity Modes

Actioneer supports four distinct execution modes for activities, allowing you to control how operations are executed:

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
3. The **rejoiner** function receives the original context and the array of processed results
4. The rejoiner combines the results and returns the updated context

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

- **Only one mode per activity**: You cannot combine WHILE, UNTIL, and SPLIT. Attempting to use multiple modes will throw an error: `"You can't combine activity kinds. Pick one: WHILE, UNTIL, or SPLIT!"`
- **SPLIT requires both functions**: The splitter and rejoiner are both mandatory for SPLIT mode
- **Predicates must return boolean**: For WHILE and UNTIL modes, predicates should return `true` or `false`

### Mode Summary Table

| Mode        | Signature                                                  | Predicate Timing | Use Case                             |
| ----------- | ---------------------------------------------------------- | ---------------- | ------------------------------------ |
| **Default** | `.do(name, operation)`                                     | N/A              | Execute once per context             |
| **WHILE**   | `.do(name, ACTIVITY.WHILE, predicate, operation)`          | Before iteration | Loop while condition is true         |
| **UNTIL**   | `.do(name, ACTIVITY.UNTIL, predicate, operation)`          | After iteration  | Loop until condition is true         |
| **SPLIT**   | `.do(name, ACTIVITY.SPLIT, splitter, rejoiner, operation)` | N/A              | Parallel execution with split/rejoin |

## ActionHooks

Actioneer supports lifecycle hooks that can execute before and after each activity in your pipeline. Hooks are loaded from a module and can be configured either by file path or by providing a pre-instantiated hooks object.

### Hook System Overview

The hook system allows you to:

- Execute code before and after each activity in your pipeline
- Implement setup and cleanup logic
- Add observability and logging to your pipelines
- Modify or inspect the context flowing through activities

### Configuring Hooks

You can attach hooks to an ActionBuilder in two ways:

#### 1. Load hooks from a file

```js
import { ActionBuilder, ActionRunner } from "@gesslar/actioneer"

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

#### 2. Provide a pre-instantiated hooks object

```js
import { ActionBuilder, ActionRunner } from "@gesslar/actioneer"
import { MyActionHooks } from "./hooks/MyActionHooks.js"

const hooks = new MyActionHooks({ debug: console.log })

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

Run the small smoke tests with Node's built-in test runner:

```bash
npm test
```

The test suite is intentionally small; it verifies public exports and a few core behaviors. Add more unit tests under `tests/` if you need deeper coverage.

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

# Actioneer

Actioneer is a small, focused action orchestration library for Node.js and browser environments. It provides a fluent builder for composing activities and a concurrent runner with lifecycle hooks and control flow semantics (while/until/if/break/continue). The project is written as ES modules and targets Node 24+ and modern browsers.

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

## Documentation

Full guides and API reference live at **[actioneer.gesslar.io](https://actioneer.gesslar.io)**. Highlights:

- [Activity Modes](https://actioneer.gesslar.io/guides/activity-modes/) — the six execution modes (`WHILE`, `UNTIL`, `IF`, `BREAK`, `CONTINUE`, `SPLIT`)
- [Control Flow](https://actioneer.gesslar.io/guides/control-flow/) — `BREAK` and `CONTINUE` inside loops
- [Parallelism with SPLIT](https://actioneer.gesslar.io/guides/split/) — split/rejoin and settled results
- [run() vs pipe()](https://actioneer.gesslar.io/guides/run-vs-pipe/) — single vs concurrent execution
- [Finalizing with done()](https://actioneer.gesslar.io/guides/done/) — cleanup and result shaping
- [Lifecycle Hooks](https://actioneer.gesslar.io/guides/hooks/) — `before$` / `after$` hooks
- [API Reference](https://actioneer.gesslar.io/reference/action-builder/) — `ActionBuilder`, `ActionRunner`, `Activity`, `ActionHooks`, `Piper`

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

This repository is prepared for npm publishing. The package uses ESM and targets Node 24+. The `files` field includes the `src/` folder and types. If you publish, ensure the `version` in `package.json` is updated and you have an npm token configured on the CI runner.

A simple publish checklist:

- Bump the package version
- Run `npm run lint` and `npm test`
- Build/typecheck if you add a build step
- Tag and push a Git release
- Run `npm publish --access public`

## Contributing

Contributions and issues are welcome. Please open issues for feature requests or bugs. If you're submitting a PR, include tests for new behavior where possible.

## Most Portum

As this is my repo, I have some opinions I would like to express and be made clear.

- We use ESLint around here. I have a very opinionated and hand-rolled `eslint.config.js` that is a requirement to be observed for this repo. Prettier can fuck off. It is the worst tooling I have ever had the misfortune of experiencing (no offence to Prettier) and I will not suffer its poor conventions in my repos in any way except to be denigrated (again, no offence). If you come culting some cargo about that that product, you are reminded that this is released under the Unlicense and are invited to fork off and drown the beautiful code in your poisonous Kool-Aid. Oh, yeah!
- TypeScript is the devil and is the antithesis of pantser coding. It is discouraged to think that I have gone through rigourous anything that isn't development by sweat. If you're a plotter, I a-plot you for your work, and if you would like to extend this project with your rulers, your abacusi, and your Kanji tattoos that definitely mean exactly what you think they do, I invite you to please do, but in your own repos.
- Thank you, I love you. BYEBYE!

🤗

## License

`@gesslar/actioneer` is released under the [0BSD](LICENSE.txt).

This package includes or depends on third-party components under their own
licenses:

| Dependency | License |
| --- | --- |
| [@gesslar/toolkit](https://github.com/gesslar/toolkit) | 0BSD |

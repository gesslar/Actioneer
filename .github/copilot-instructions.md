# Actioneer - AI Coding Agent Instructions

## Project Overview
Actioneer is a sophisticated Node.js action orchestration framework that provides fluent builders, pipeline execution, and hook-based lifecycle management. It's extracted from a larger toolkit (`@gesslar/toolkit`) and focuses specifically on action/task automation with concurrency control.

## Architecture Patterns

### Core Components Flow
```
ActionBuilder → ActionWrapper → ActionRunner → Piper
     ↓              ↓             ↓           ↓
  Fluent API   → Activities   → Execution  → Pipeline
```

**Key Classes:**
- `ActionBuilder` - Fluent builder pattern for defining action pipelines
- `ActionWrapper` - Container for registered activities with iterator interface
- `ActionRunner` - Orchestrates execution, extends Piper for concurrency
- `Activity` - Individual task definition with loop semantics and hooks
- `ActionHooks` - Lifecycle hook management with timeout control
- `Piper` - Generic concurrent pipeline processor (base class)

### Export Pattern
Uses **default exports** in individual files, re-exported as **named exports** in `index.js`:
```js
// In lib files: export default class ActionBuilder
// In index.js: export {default as ActionBuilder} from "./lib/ActionBuilder.js"
```

## Development Workflows

### Pipeline Creation Pattern
```js
const pipeline = new ActionBuilder(myAction)
  .do("prepare", ctx => ctx.initialise())
  .do("step", ACTIVITY.WHILE, predicate, ctx => ctx.consume())
  .do("finalise", ctx => ctx.complete())
  .build()

const runner = new ActionRunner(pipeline, {debug, hooks})
const result = await runner.pipe([contexts], maxConcurrent)
```

### Activity Loop Semantics
- **No kind** - Execute once
- **ACTIVITY.WHILE** - Loop while predicate returns true
- **ACTIVITY.UNTIL** - Loop until predicate returns true
- Uses bitflags: `WHILE: 1<<1, UNTIL: 1<<2`

### Hook Integration
Hook methods follow naming pattern: `{before|after}$${activityName}`
```js
class MyHooks {
  async before$prepare(context) { /* setup */ }
  async after$prepare(context) { /* cleanup */ }
}
```

## Code Conventions

### Private Field Pattern
Consistently uses private field syntax with hash prefix:
```javascript
class ActionBuilder {
  #activities = new Map()
  #debug = null
  // Public methods access via this.#privateField
}
```

### Error Handling
Uses `Sass.new()` for contextual error wrapping (when available):
```js
throw Sass.new("Processing pipeline item.", error)
```

### Debug Integration
All classes accept debug function parameter:
```javascript
constructor({debug = (() => {})}) {
  this.#debug = debug
  this.#debug("Message with %o placeholder", level, ...args)
}
```

## Build & Test Setup

### ESLint Configuration
- Strict stylistic rules in `eslint.config.js`
- JSDoc enforcement for public methods
- Stylistic: 2-space indent, double quotes, no semicolons
- Custom keyword spacing rules (tight control flow syntax)

### npm Scripts
```bash
npm run lint          # Check code style
npm run lint:fix      # Auto-fix style issues
npm test              # Run unit tests (node --test)
npm run submit        # Publish to npm (--access public)
```

### Package Structure
- **ES Modules**: `"type": "module"` in package.json
- **Node 20+**: Minimum engine requirement
- **TypeScript**: Definitions in `src/types/index.d.ts`
- **No Side Effects**: Pure functional exports

## Key Integration Points

### Action Definition Pattern
Actions must implement `setup()` method:
```js
class MyAction {
  setup(builder) {
    builder
      .do("step1", ctx => this.process(ctx))
      .do("step2", ACTIVITY.WHILE, ctx => !ctx.done, ctx => this.iterate(ctx))
  }
}
```

### Concurrent Execution
`Piper` base class provides:
- Worker pool pattern with `maxConcurrent` limit
- Setup/process/teardown lifecycle hooks
- Result aggregation and error handling
- `settleAll()` pattern for parallel promise handling

### Nested Pipeline Support
Activities can contain other `ActionWrapper` instances:
```js
.do("parallel", subWrapper) // Nested execution via new ActionRunner
```

## Development Notes

### Testing Expectations
Based on `WIRE_UP_AND_TESTING.md`:
- Test both individual and semantic bundle imports
- Cover edge cases (null, undefined, empty values)
- Test error scenarios and Sass trace preservation
- Use descriptive test names and realistic usage patterns

### Performance Considerations
- Uses `Map` for activity storage (insertion order preservation)
- Generator pattern for activity iteration (using generator methods)
- Concurrent processing with configurable limits
- Timeout controls for hook execution (default 1000ms)

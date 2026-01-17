# ActionBuilder.done() Method

The `.done()` method allows you to register a callback that executes after all activities in the pipeline have completed. It pairs nicely with the `.do()` method, creating a natural `do/done` flow.

## Usage

```javascript
import {ActionBuilder, ActionRunner} from "@gesslar/actioneer"

const action = {
  setup(builder) {
    builder
      .do("process", ctx => {
        ctx.data = "processed"
        return ctx
      })
      .done(ctx => {
        // This runs after all activities complete
        console.log("Pipeline completed!")
        ctx.finalized = true
        return ctx
      })
  }
}

const builder = new ActionBuilder(action)
const runner = new ActionRunner(builder)
const result = await runner.run({})

console.log(result) // {data: "processed", finalized: true}
```

## Features

- **Transform results**: The done callback can modify or transform the final context
- **Async support**: The callback can be async/await
- **Error handling**: Errors thrown in the done callback will be wrapped and propagated
- **Chaining**: Returns the builder instance for fluent chaining
- **Works with loops**: Executes after WHILE/UNTIL loops complete

## Examples

### Transform Final Result

```javascript
builder
  .do("calculate", () => [1, 2, 3, 4, 5])
  .done(arr => arr.reduce((sum, n) => sum + n, 0))
// Result: 15
```

### Cleanup After Processing

```javascript
builder
  .do("openConnection", async ctx => {
    ctx.connection = await database.connect()
    return ctx
  })
  .do("fetchData", async ctx => {
    ctx.data = await ctx.connection.query("SELECT * FROM users")
    return ctx
  })
  .done(async ctx => {
    await ctx.connection.close()
    delete ctx.connection
    return ctx
  })
```

### Add Metadata

```javascript
builder
  .do("process", processData)
  .done(ctx => ({
    ...ctx,
    completedAt: new Date(),
    version: "1.0.0"
  }))
```

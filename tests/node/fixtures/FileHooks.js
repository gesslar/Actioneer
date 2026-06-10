// Fixture hooks module loaded by withHooksFile() in
// tests/node/hooks-from-file.test.js
export class FileHooks {
  setup = async () => {
    this.resource = {id: "from-setup"}
  }

  before$go = ctx => {
    ctx.injected = this.resource?.id
  }

  after$go = (before, result) => {
    result.stamped = true
  }
}

// Browser-compatible base classes
import ActionBuilder from "./browser/lib/ActionBuilder.js"
import ActionHooks from "./lib/ActionHooks.js"

// Node-enhanced ActionHooks (extends browser, adds FileObject support). Wiring
// it into the builder makes withHooksFile() load hooks from disk under the Node
// entry point, while the browser entry keeps the pre-instantiated-only default.
ActionBuilder.HooksClass = ActionHooks

export {ActionBuilder, ActionHooks}
export {default as ActionRunner} from "./browser/lib/ActionRunner.js"
export {default as ActionWrapper} from "./browser/lib/ActionWrapper.js"
export {default as Activity, ACTIVITY} from "./browser/lib/Activity.js"
export {default as Piper} from "./browser/lib/Piper.js"

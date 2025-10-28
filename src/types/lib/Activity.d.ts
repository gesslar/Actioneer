/**
 * Activity bit flags recognised by the builder. The flag decides
 * loop semantics for an activity.
 */
export type ACTIVITY = number
/** @typedef {import("./ActionHooks.js").default} ActionHooks */
/**
 * Activity bit flags recognised by the builder. The flag decides
 * loop semantics for an activity.
 *
 * @readonly
 * @enum {number}
 */
export const ACTIVITY: Readonly<{
  WHILE: number;
  UNTIL: number;
}>
export default class Activity {
  /**
   * Construct an Activity definition wrapper.
   *
   * @param {{action: unknown, name: string, op: (context: unknown) => unknown|Promise<unknown>|unknown, kind?: number, pred?: (context: unknown) => boolean|Promise<boolean>, hooks?: ActionHooks}} init - Initial properties describing the activity operation, loop semantics, and predicate
   */
  constructor({ action, name, op, kind, pred, hooks }: {
    action: unknown;
    name: string;
    op: (context: unknown) => unknown | Promise<unknown> | unknown;
    kind?: number;
    pred?: (context: unknown) => boolean | Promise<boolean>;
    hooks?: ActionHooks;
  })
  /**
   * The activity name.
   *
   * @returns {string} - Activity identifier
   */
  get name(): string
  /**
   * Bitflag kind for loop semantics.
   *
   * @returns {number|null} - Combined flags (e.g., WHILE or UNTIL)
   */
  get kind(): number | null
  /**
   * The predicate function for WHILE/UNTIL flows.
   *
   * @returns {(context: unknown) => boolean|Promise<boolean>|undefined} - Predicate used to continue/stop loops
   */
  get pred(): (context: unknown) => boolean | Promise<boolean> | undefined
  /**
   * The operator kind name (Function or ActionWrapper).
   *
   * @returns {string} - Kind name extracted via Data.typeOf
   */
  get opKind(): string
  /**
   * The operator to execute (function or nested wrapper).
   *
   * @returns {unknown} - Activity operation
   */
  get op(): unknown
  /**
   * The action instance this activity belongs to.
   *
   * @returns {unknown} - Bound action instance
   */
  get action(): unknown
  /**
   * Execute the activity with before/after hooks.
   *
   * @param {unknown} context - Mutable context flowing through the pipeline
   * @returns {Promise<{activityResult: unknown}>} - Activity result wrapper with new context
   */
  run(context: unknown): Promise<{
    activityResult: unknown;
  }>
  /**
   * Attach hooks to this activity instance.
   *
   * @param {unknown} hooks - Hooks instance with optional before$/after$ methods
   * @returns {this} - This activity for chaining
   */
  setActionHooks(hooks: unknown): this
  #private
}
export type ActionHooks = import('./ActionHooks.js').default
//# sourceMappingURL=Activity.d.ts.map

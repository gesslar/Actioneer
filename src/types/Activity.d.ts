export const ACTIVITY: { WHILE: number; UNTIL: number }

declare class Activity {
  constructor(init: {
    action: unknown,
    name: string,
    op: (context: unknown) => unknown | Promise<unknown> | unknown,
    kind?: number,
    pred?: (context: unknown) => Promise<boolean>
  })
  get name(): string
  get kind(): number | null
  get pred(): ((context: unknown) => boolean | Promise<boolean>) | undefined
  get opKind(): string
  get op(): unknown
  get action(): unknown
  run(context: unknown): Promise<{ activityResult: unknown }>
  setActionHooks(hooks: unknown): this
}

export default Activity

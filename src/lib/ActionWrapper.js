import Activity from "./Activity.js"

export default class ActionWrapper {
  #activities = new Map()
  #debug = null

  constructor({activities,debug}) {
    this.#debug = debug
    this.#activities = activities
    this.#debug(
      "Instantiating ActionWrapper with %o activities.",
      2,
      activities.size,
    )
  }

  *#_activities() {
    for(const [_,activity] of this.#activities) {
      const result = new Activity(activity)

      yield result
    }
  }

  get activities() {
    return this.#_activities()
  }
}

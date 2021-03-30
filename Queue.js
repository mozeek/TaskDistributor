//todo: task priority

export default class Queue {
  #tasks = new Set() //active tasks
  #resolvers = new Set() //free resolvers

  #take(from) {
    const elem = from.values().next().value
    from.delete(elem)
    return elem
  }

  #resolveTask(task, resolver) {
    return resolver(task.take())
  }

  addTask(task) {
    const resolver = this.#take(this.#resolvers)
    if(resolver) return this.#resolveTask(task, resolver)
    return this.#tasks.add(task).size
  }

  rmTask(task) {
    return this.#tasks.delete(task)
  }

  addResolver(resolver) {
    const task = this.#take(this.#tasks)
    if(task) return this.#resolveTask(task, resolver)
    this.#resolvers.add(resolver)
  }

  rmResolver(resolver) {
    return this.#resolvers.delete(resolver)
  }

}

import Task from './Task.js'
import Queue from './Queue.js'
import Resolver from './Resolver.js'

export default class TaskManager {
  #tasks = new Map()
  #resolvers = new Map()
  #queues = new Map()
  #counter = {
    resolvers: 0,
    tasks: 0
  }

  defaultTaskOptions = {
    maxResolveAwaitTime: 20000,
    replaceOnResolvetimeError: 3,
    repeatOnceResolved: 0,
    repeatCooldown: 0
  }

  defaultResolverOptions = {
    repeatOnceFinished: 0,
    repeatCooldown: 0
  }

  #getQueueForTaskType(type) {
    return this.#queues.get(type) || this.#queues.set(type, new Queue).get(type)
  }

  createResolver(type, opts = {}, resolvator) {
    opts = {...this.defaultResolverOptions, ...opts}
    const id = this.#counter.resolvers++
    const queue = this.#getQueueForTaskType(type)
    return new Resolver(id, type, resolvator, opts, queue, this.#resolvers)
  }

  createTask(type, ctx, opts = {}) {
    opts = {...this.defaultTaskOptions, ...opts}
    const id = this.#counter.tasks++
    const queue = this.#getQueueForTaskType(type)
    return new Task(id, type, ctx, opts, this, queue, this.#tasks)
  }

  getTaskByID(id) {
    return this.#tasks.get(id)
  }

  getTasksSize() {
    return this.#tasks.size
  }

  getQueueSiseForTaskType(type) {
    return this.#getQueueForTaskType(type).getSise()
  }

  getStatistic() {
    const tasks = {}
    tasks.created = this.#counter.tasks
    tasks.active = this.#tasks.size
    tasks.deleted = tasks.created - tasks.active
    tasks.states = {}
    Object.values(Task.state).forEach(state => tasks.states[state] = 0)
    this.#tasks.forEach(task => tasks.states[task.status]++)

    const resolvers = {}
    resolvers.created = this.#counter.resolvers
    resolvers.active = this.#resolvers.size
    resolvers.deleted = resolvers.created - resolvers.active
    resolvers.states = {}
    Object.values(Resolver.states).forEach(state => resolvers.states[state] = 0)
    this.#resolvers.forEach(resolver => resolvers.states[resolver.state]++)

    const types = []
    Array.from(this.#queues.entries()).forEach(v => {
      const type = v[0]
      const [activeTasks, freeResolvers] = v[1].getSize()
      types.push([type, activeTasks, freeResolvers, freeResolvers - activeTasks])
    })

    return {tasks, resolvers, types}
  }

}

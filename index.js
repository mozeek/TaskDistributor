import Task from './Task.js'
import Queue from "./Queue.js"

export default class TaskManager {
  #queues = new Map()
  #tasks = new Map()
  #counter = 0

  defaultTaskOptions = {
    maxResolveAwaitTime: 20000,
    replaceOnResolvetimeError: 3,
    repeatOnceResolved: 0,
    repeatCooldown: 0
  }

  #getQueueForTaskType(type) {
    return this.#queues.get(type) || this.#queues.set(type, new Queue).get(type)
  }

  addResolver(type, resolver) {
    return this.#getQueueForTaskType(type).addResolver(resolver)
  }

  createTask(type, ctx, opts) {
    const id = this.#counter++
    const queue = this.#getQueueForTaskType(type)
    const task = new Task(id, type, ctx, opts, this, queue)
    this.#tasks.set(id, task)
    task.on(Task.state.FINISH, () => this.#tasks.delete(id))
    return task
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
    const created = this.#counter
    const active = this.#tasks.size
    const deleted = active - created
    const total = {created, active, deleted}
    const states = {}
    Object.values(Task.state).forEach(state => states[state] = 0)
    this.#tasks.forEach(task => states[task.status]++)
    const types = []
    Array.from(this.#queues.entries()).forEach(v => {
      const type = v[0]
      const [activeTasks, freeResolvers] = v[1].getSize()
      types.push([type, activeTasks, freeResolvers, freeResolvers - activeTasks])
    })
    return {total, states, types}
  }

}

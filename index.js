import Task from './Task.js'

export default class TaskManager {
  #clients; #tasks; #counter = 0
  constructor() {
    this.#tasks = new Map
    this.#clients = new Map
  }

  #getTaskClients(type) {
    return this.#clients.get(type) || this.#clients.set(type, {
      freeResolvers: [],
      activeTasks: []
    }).get(type)
  }

  #pushAwaitingTask(type, task) { //todo: rename
    this.#getTaskClients(type).activeTasks.push(task)
  }

  #pushFreeResolver(type, resolver) {
    return this.#getTaskClients(type).freeResolvers.push(resolver)
  }

  #getActiveTask(type) {
    return this.#getTaskClients(type).activeTasks.shift()
  }

  #getResolver(type) {
    return this.#getTaskClients(type).freeResolvers.shift()
  }

  #create(type, ctx) {
    const id = this.#counter++
    const task = new Task(id, type, ctx)
    this.#tasks.set(id, task)
    return task
  }

  getTaskByID(id) {
    return this.#tasks.get(id)
  }

  registrateResolver(type, resolver) {
    const task = this.#getActiveTask(type)
    if(task) resolver(task)
    else this.#pushFreeResolver(type, resolver)
  }

  request(type, ctx) { //request to resolve task
    const task = this.#create(type, ctx)
    const resolver = this.#getResolver(type)
    if(resolver) process.nextTick(() => resolver(task))
    else this.#pushAwaitingTask(type, task)
    return task
  }

  resolve(id, results) {
    const task = this.getTaskByID(id)
    if(!task) return null
    else task.resolve(results)
  }

}
import Task from './Task.js'

export default class TaskManager {
  #queueForTaskType; #tasks; #counter = 0
  constructor() {
    this.#tasks = new Map
    this.#queueForTaskType = new Map
    this.defaultTaskOptions = {
      maxResolveTime: 20000,
      replaceOnRuntimeError: 2
      // replaceOnTimeout: 2
    }
  }

  #getQueuesForTaskType(type) {
    return this.#queueForTaskType.get(type) || this.#queueForTaskType.set(type, {
      freeResolvers: [],
      activeTasks: []
    }).get(type)
  }

  #addNewTaskToQueue(type, task, priority) {
    const tasks = this.#getQueuesForTaskType(type).activeTasks
    switch(priority) {
      default: case 0: return tasks.push(task)
      case 1: tasks.splice(tasks.length-1, 0, task); return tasks.length
      case 2: tasks.unshift(task); return 0
    }
  }

  #addFreeTaskResolver(type, resolver) {
    return this.#getQueuesForTaskType(type).freeResolvers.push(resolver)
  }

  #updateQueuePositionsForTaskType(type) {
    this.#getQueuesForTaskType(type).activeTasks.forEach((t, i) => {
      t.updateQueuePosition(i+1)
    })
  }

  #getActiveTask(type, resolver) {
    const task = this.#getQueuesForTaskType(type).activeTasks.shift()
    if(!task) return null
    process.nextTick(() => this.#updateQueuePositionsForTaskType(type))
    //we notity task that we want to take it.
    //If task can not be taken (cancelled, (...done, taken already => this should not happen)) it'll return false
    if(!task.take(resolver)) return this.#getActiveTask(type)
    return task
  }

  #getFreeResolverForTaskType(type) {
    const resolver = this.#getQueuesForTaskType(type).freeResolvers.shift()
    if(!resolver) return false
    // console.log(resolver)
    if(resolver.isStillActive()) return resolver
    else return this.#getFreeResolverForTaskType(type)
  }

  #create(type, ctx, opts) {
    const id = this.#counter++
    const task = new Task(id, type, ctx, opts, this)
    this.#tasks.set(id, task)
    return task
  }

  getTaskByID(id) {
    return this.#tasks.get(id)
  }

  registrateResolverForTaskType(resolver, type) {
    const task = this.#getActiveTask(type, resolver)
    if(!task) return this.#addFreeTaskResolver(type, resolver)
    process.nextTick(() => resolver(task))
    return 0
  }

  placeTaskInQueue(task, priority) {
    const resolver = this.#getFreeResolverForTaskType(task.type)
    if(resolver) process.nextTick(() => resolver(task.take()))
    else task.updateQueuePosition(this.#addNewTaskToQueue(task.type, task, priority))
    return task
  }

  createTask(type, ctx, opts) {
    return this.#create(type, ctx, opts)
  }

  resolveTaskID(id, results) {
    const task = this.getTaskByID(id)
    if(!task) return null
    else task.resolve(results)
  }

}
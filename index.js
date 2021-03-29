import Task from './Task.js'
import Queue from "./Queue.js"

export default class TaskManager {
  #queues = new Map()
  #tasks = new Map()
  #counter = 0

  defaultTaskOptions = {
    maxResolveAwaitTime: 20000,
    replaceOnResolvetimeError: 2
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
    this.#tasks.set('id', task)
    task.on('done', () => this.#tasks.delete(id))
    return task
  }

  getTaskByID(id) {
    return this.#tasks.get(id)
  }

}

const tm = new TaskManager()
tm.createTask('test', 'ctx').queue().once('done', results => console.log(results))
tm.addResolver('test', (ctx, done, err) => {
  console.log(ctx)
  resolve(task.ctx)
})
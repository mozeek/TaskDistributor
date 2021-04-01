const FREE = 'free',
      QUEUED = 'queued',
      FINISHED = 'finished',
      PROCESS = 'process'

export default class Resolver {
  #resolvator; #queue; #resolvers
  static states = {FREE, QUEUED, PROCESS, FINISHED}
  constructor(id, type, resolvator, options, queue, resolvers) {
    this.#resolvator = resolvator
    this.#queue = queue
    this.#resolvers = resolvers
    this.id = id
    this.opts = options
    this.state = FREE
    this.currentTask = null
    this.type = type
    this.cycle = 0
    this.listeners = [ ]

    this.#resolvers.set(this.id, this)
  }

  onceFinish(cb) {
    this.listeners.push(cb)
  }

  #finish() {
    this.state = FINISHED
    this.#resolvers.delete(this.id)
    while(this.listeners.length) this.listeners.pop()()
  }

  resolve(data, fin) {
    if(this.state !== PROCESS) return
    this.currentTask.answer(data, fin)
    if(!fin) return
    if(this.cycle++ > this.opts.repeatOnceFinished) {
      this.state = FREE
      this.currentTask = null
      return setTimeout(() => this.queue(), this.opts.repeatCooldown)
    }
    this.#finish()
  }

  cancel(reason) {
    if(this.state === QUEUED) return this.unqueue()
    if(this.state === PROCESS) return this.currentTask.decline(reason)
    this.#finish()
  }

  requestResolve(task) {
    this.currentTask = task
    this.state = PROCESS
    this.#resolvator(
      { ctx: this.currentTask.ctx, id: this.currentTask.id },
      this.resolve.bind(this),
      this.cancel.bind(this))
  }

  queue() {
    if(this.state !== FREE)
      return console.warn('task is not in free state')
    this.#queue.addResolver(this)
    this.state = FREE
  }

  unqueue() {
    this.#queue.rmResolver(this)
    this.state = FREE
  }

}
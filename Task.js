import EventEmitter from "events"

const VACANT = 'vacant',
      QUEUED = 'queued',
      RESOLVING = 'resolving',
      DONE = 'done'

export default class Task extends EventEmitter  {
  #manager; #queue; #timeout
  constructor(id, type, ctx, opts = {}, manager, queue) {
    super();
    this.#manager = manager
    this.#queue = queue
    this.id = id
    this.type = type
    this.ctx = ctx
    this.status = VACANT
    this.previousStatus = null
    this.result = null

    const defaults = manager.defaultTaskOptions
    this.maxResolveAwaitTime = opts.maxResolveAwaitTime
      || defaults.maxResolveAwaitTime
    this.replaceOnResolvetimeError = opts.replaceOnResolvetimeError
      || defaults.replaceOnResolvetimeError

  }

  queue() {
    if(this.status === QUEUED)
      return console.warn('trying to queued task that has already been queued')
    //todo: callback from addTask to notify about position changes...
    this.#queue.addTask(this)
    this.#changeStatus(QUEUED)
    return this
  }

  unqueue(changeStatus) {
    //we may not want to change status if we unqueue because of error
    if(this.status !== QUEUED) return false
    if(changeStatus) this.#changeStatus(VACANT)
    return this.#queue.rmTask(this)
  }

  recreate() {
    return this.manager.createTask(this.type, this.ctx, this.opts)
  }

  #done(err, result) {
    this.#clearTimeout()
    this.unqueue()
    this.result = [err, result]
    this.#changeStatus('done', this.result)
    this.removeAllListeners()
  }

  #clearTimeout() {
    clearTimeout(this.#timeout)
    this.#timeout = null
  }

  resolve(results) {
    if(this.status !== RESOLVING) return false
    this.#done(false, results)
  }

  cancel(reason = 'cancelled') {
    this.#done(reason)
  }

  #emitResolvetimeError(type) {
    if(--this.replaceOnResolvetimeError) {
      this.#clearTimeout()
      this.queue()
    } else {
      this.#done(type)
    }
  }

  #changeStatus(status, ...ctx) {
    this.previousStatus = this.status
    this.status = status
    this.emit('status', this.status, this.previousStatus)
    this.emit(status, ...ctx)
  }

  #setResolveTimeout(time) {
    if(!time) return
    this.#timeout = setTimeout(() =>
      this.status === RESOLVING &&
      this.emitResolvetimeError('timeout'), time)
  }

  take(resolver = {}) {
    if(this.status !== VACANT && this.status !== QUEUED)
      return console.warn('trying take task that ' + this.status)
    this.#changeStatus(RESOLVING, resolver.id, resolver.name)
    this.#setResolveTimeout(this.maxResolveAwaitTime)
    return [
      this.ctx,
      this.resolve.bind(this),
      this.#emitResolvetimeError.bind(this)
    ]
  }

  async onResults(cb) {
    return new Promise((resolve, reject) => {
      const sendResults = results => {
        if(results.success) resolve(this.result.data)
        else reject(results.data)
      }
      if(this.result) sendResults(this.result)
      this.once('done', () => sendResults(this.result))
    })
  }

}
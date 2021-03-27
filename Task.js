import EventEmitter from "events"

export default class Task extends EventEmitter  {
  constructor(id, type, ctx, opts = {}, manager) {
    super();
    this.manager = manager
    this.id = id
    this.type = type
    this.ctx = ctx
    this.previousStatus = null
    this.status = 'created' //taken done replaced timeout
    this.result = null
    this.queuePosition = -1
    this.maxResolveTime = opts.maxResolveTime || this.manager.defaultTaskOptions.maxResolveTime
    // this.replaceOnTimeout = opts.replaceOnTimeout || this.manager.defaultTaskOptions.replaceOnTimeout
    this.replaceOnRuntimeError = opts.replaceOnRuntimeError || this.manager.defaultTaskOptions.replaceOnRuntimeError
    this.timeout = null
  }

  place() {
    if(this.status === 'placed')
      return console.warn('trying to place the task that already placed')
    if(status !== 'created') this.changeStatus('replaced')
    else this.changeStatus('placed')
    this.manager.placeTaskInQueue(this)
    return this
  }

  updateQueuePosition(newPosition) {
    this.emit('queuePosition', newPosition)
    this.queuePosition = newPosition
  }

  recreate() {
    return this.manager.createTask(this.type, this.ctx)
  }

  #done(result = {}) {
    this.#clearTimeout()
    this.result = result
    this.changeStatus('done')
    this.removeAllListeners()
  }

  #clearTimeout() {
    if(!this.timeout) return
    clearTimeout(this.timeout)
    this.timeout = null
  }

  resolve(results) {
    if(this.status !== 'taken') return false
    this.#done({err: false, data: results})
  }

  cancel(reason = 'cancelled') {
    this.#done({err: true, data: reason})
  }

  resolvetimeError(type) {
    if(--this.replaceOnRuntimeError) {
      this.#clearTimeout()
      this.place()
    } else {
      this.#done({err:true, data:type})
    }
  }


  changeStatus(status) {
    this.previousStatus = this.status
    this.status = status
    this.emit('status', this)
    this.emit(status, this)
  }

  take(resolver = {}) {
    if(this.status !== 'placed' && this.status !== 'created') return false
    this.changeStatus('taken', resolver)
    this.updateQueuePosition(0)
    if(this.maxResolveTime) this.timeout = setTimeout(() => {
      if(this.status !== 'taken') return
      this.resolvetimeError('timeout')
    }, this.maxResolveTime)
    return this
  }

  async getResults() {
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
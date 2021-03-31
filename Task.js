import EventEmitter from "events"

//todo: callback from addTask to notify about position changes...
//todo: this.mode = multiresults singleresuls
//litenable mod – only close task if resolver send FIN result
//or client .cancel() the task
//todo: depending on task and user status (creator, resolver)
//return only available actions...
//all task api are opened internally by default and closed to user by task manager?
//TaskClientProxy, TaskResolverProxy? preformance?

//vacant >> queued > resolving >> <<< results > done
const VACANT = 'vacant',
      QUEUED = 'queued',
      RESOLVING = 'resolving',
      RESULT = 'result',
      FINISH = 'finish'

export default class Task extends EventEmitter  {
  #manager; #queue; #timeout; #repeatCooldownTimeout; #managerTasks
  static state = {VACANT, QUEUED, RESOLVING, RESULT, FINISH}
  constructor(id, type, ctx, opts = {}, manager, queue, managerTasks) {
    super();
    this.#manager = manager
    this.#queue = queue
    this.#managerTasks = managerTasks
    this.id = id
    this.type = type
    this.ctx = ctx
    this.status = VACANT
    this.result = null
    this.cycle = 0
    this.tryes = 0
    this.opts = {}

    this.#managerTasks.set(this.id, task)
  }

  queue() {
    if(this.status === QUEUED)
      return console.warn('trying to queue task that has already been queued')
    //change status before .addTask to .take() take effect...
    this.#changeStatus(QUEUED)
    this.#queue.addTask(this)
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

  #finish() {
    this.#changeStatus(FINISH, this)
    this.removeAllListeners()
    this.#managerTasks.delete(this.id)
  }

  #clearTimeout() {
    clearTimeout(this.#timeout)
    this.#timeout = null
  }

  #setResults(err, results) {
    this.result = [err, results]
    this.#changeStatus(RESULT, this.result)
  }

  resolve(results) {
    if(this.status !== RESOLVING)
      return console.warn('trying resolve task that is not in resolving state')
    this.#clearTimeout()
    this.#setResults(false, results)
    if(this.cycle++ > this.opts.repeatOnceResolved) return this.#finish()
    return this.#repeatCooldownTimeout = setTimeout(() =>
      this.#repeat(), this.opts.repeatCooldown)
  }

  #repeat() {
    //task may be changed after cooldown timeout (client disconnect or cancell task)
    if(this.status !== RESULT)
      return console.warn('trying repeat task that is not in right state')
    this.queue()
  }

  cancel(reason = 'cancelled by creator') {
      this.unqueue()
      this.#setResults(reason)
      this.#finish()
  }

  decline(reason) {
    if(this.status !== RESOLVING)
      return console.warn('declining task that is not resolving')
    if(this.tryes++ < this.opts.replaceOnResolvetimeError) return this.queue()
    this.#setResults(reason)
    this.#finish()
  }

  #changeStatus(status, ...ctx) {
    this.status = status
    this.emit('status', this.status)
    this.emit(status, ...ctx)
  }

  #setResolveTimeout(time) {
    if(!time) return
    this.#timeout = setTimeout(() =>
      this.status === RESOLVING &&
      this.decline('timeout'), time)
  }

  take(resolver = {}) {
    if(this.status !== VACANT && this.status !== QUEUED)
      return console.warn('trying take task that ' + this.status)
    this.#changeStatus(RESOLVING, resolver.id, resolver.name)
    this.#setResolveTimeout(this.opts.maxResolveAwaitTime)
    return {
      data: {id: this.id, ctx: this.ctx},
      deciline: this.decline.bind(this),
      resolve: this.resolve.bind(this)
    }
  }

}
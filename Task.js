import EventEmitter from "events"

//todo: callback from addTask to notify about position changes...
//todo: this.mode = multiresults singleresuls
//litenable mod – only close task if resolver send FIN result
//or client .cancel() the task
//todo: depending on task and user status (creator, resolver)
//return only available actions...
//all task api are opened internally by default and closed to user by task manager?
//TaskClientProxy, TaskResolverProxy? preformance?
//todo: use promises! mb extend from promise so whole task is a promise...

//events:            ↓ response/error ↑
//vacant >> queued   >     taken      > resolved > finish
const
  VACANT      = 'vacant',
  QUEUED      = 'queued',
  TAKEN       = 'taken', // < ERROR < ANSWER
  RESOLUTION  = 'resolution',
  ENDED       = 'ended'

const
  ANSWER      = 'answer',
  ERROR       = 'err'

export default class Task extends EventEmitter  {
  #manager; #queue; #resolutionTimeout; #repeatCooldownTimeout; #managerTasks
  static state = {VACANT, QUEUED, TAKEN, RESOLUTION, ENDED}
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
    this.opts = opts

    this.#managerTasks.set(this.id, this)
  }

  queue() {
    if(this.status === QUEUED)
      return console.warn('trying to queue task that has already been queued')
    this.#changeStatus(QUEUED)
    this.#queue.addTask(this)
    return this
  }

  unqueue() {
    if(this.status !== QUEUED) return false
    this.#changeStatus(VACANT)
    return this.#queue.rmTask(this)
  }

  recreate() {
    return this.manager.createTask(this.type, this.ctx, this.opts)
  }

  #end() {
    this.#changeStatus(ENDED, this.result)
    this.removeAllListeners()
    this.#managerTasks.delete(this.id)
  }

  #clearResolutionTimeout() {
    clearTimeout(this.#resolutionTimeout)
    this.#resolutionTimeout = null
  }

  #taskGotNewData(err, results) {
    this.result = [err, results]
    if(err) this.emit(ERROR, err)
    else this.emit(ANSWER, results)
  }

  answer(data, fin) {
    if(this.status !== TAKEN)
      return console.warn('trying resolve task that has not been taken')
    this.#clearResolutionTimeout()
    this.#taskGotNewData(false, data)
    if(!fin) return
    this.#changeStatus(RESOLUTION, data)
    if(++this.cycle > this.opts.repeatOnceResolved) return this.#end()
    return this.#repeatCooldownTimeout = setTimeout(() =>
      this.#repeat(), this.opts.repeatCooldown)
  }

  #repeat() {
    //task may be changed after cooldown timeout (client disconnect or cancell task)
    if(this.status !== RESOLUTION)
      return console.warn('trying repeat task that is not in right state')
    this.queue()
  }

  cancel(reason = 'cancelled by creator') {
    this.unqueue()
    this.#taskGotNewData(reason)
    this.#end()
  }

  decline(reason) {
    if(this.status !== RESOLUTION)
      return console.warn('declining task that is not resolving')
    this.#taskGotNewData(reason)
    if(this.tryes++ < this.opts.replaceOnResolvetimeError) return this.queue()
    else this.#end()
  }

  #changeStatus(status, ...ctx) {
    this.status = status
    this.emit('status', this.status)
    this.emit(status, ...ctx)
  }

  #setResolveTimeout(time) {
    if(!time) return
    this.#resolutionTimeout = setTimeout(() =>
      this.status === RESOLUTION &&
      this.decline('timeout'), time)
  }

  take(resolver = {}) {
    if(this.status !== VACANT && this.status !== QUEUED)
      return console.warn('trying take task that ' + this.status)
    this.#changeStatus(TAKEN, resolver.id, resolver.name)
    this.#setResolveTimeout(this.opts.maxResolveAwaitTime)
    return this
  }

}
import EventEmitter from "events"

export default class Task extends EventEmitter  {
  constructor(id, type, ctx, replace) {
    super();
    this.replace = replace
    this.id = id
    this.type = type
    this.ctx = ctx
    this.previousStatus = null
    this.status = 'created' //taken done replaced timeout
    this.result = null
  }

  #done(result = {}) {
    this.result = result
    this.changeStatus('done')
    this.removeAllListeners()
  }

  resolve(results) {
    this.#done({err: false, data: results})
  }

  cancel() {
    this.#done({err: true, data: 'cancelled'})
  }

  changeStatus(status) {
    this.previousStatus = this.status
    this.status = status
    this.emit('statusChange', this)
    this.emit(status, this)
  }

  take(resolver = {}) {
    this.resolver = resolver
    this.changeStatus('taken')
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
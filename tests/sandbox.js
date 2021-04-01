import TaskManager from "../index.js"

const tm = new TaskManager()
const t = tm.createTask('test', 'test').queue()

t.on('status', console.log)
t.on('answer', console.log)
t.on('end', task => {
  console.log('ended')
  console.log(task.result)
})

tm.createResolver('test', null, (data, reply, reject) => {
  console.log(data)
  reply('hello')
  reply('hello2')
  reply('hello3')
  reply('final hello', true)
}).queue()

console.log(tm.getStatistic().tasks)
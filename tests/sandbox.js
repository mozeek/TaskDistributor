import TaskManager from "../index.js"

const tm = new TaskManager()
tm.createTask('test', 'ctx', {repeatOnceResolved: 3})
  .queue()
  .on('result', results => console.log(results))
// tm.createTask('test', 'ctx').queue().once('result', results => console.log(results))
// tm.createTask('test', 'ctx').queue().once('result', results => console.log(results))
tm.addResolver('test', task => {
  task.resolve(task.ctx)
})
tm.addResolver('test', task => {
  console.log(task.ctx)
  setTimeout(() => task.resolve(task.ctx), 1020)
})

setTimeout(() =>
  tm.addResolver('test', task => {
    console.log(task.ctx)
    task.resolve(task.ctx)
  }), 1000
)
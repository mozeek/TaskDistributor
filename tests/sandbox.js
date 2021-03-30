import TaskManager from "../index.js"

const tm = new TaskManager()
tm.createTask('test', 'ctx', {repeatOnceResolved: 3}).queue().on('result', results => console.log(results))
// tm.createTask('test', 'ctx').queue().once('result', results => console.log(results))
// tm.createTask('test', 'ctx').queue().once('result', results => console.log(results))
tm.addResolver('test', (ctx, done, err) => {
  console.log(ctx)
  done(ctx)
})
tm.addResolver('test', (ctx, done, err) => {
  console.log(ctx)
  setTimeout(() => done(ctx), 1020)
})

setTimeout(() =>
  tm.addResolver('test', (ctx, done, err) => {
    console.log(ctx)
    done(ctx)
  }), 1000
)
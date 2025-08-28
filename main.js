const out = document.getElementById('out');
function println(...xs) {
  console.log(...xs);
  out.append(xs.join(' ') + '\n');
}
println(`crossOriginIsolated: ${globalThis.crossOriginIsolated}`);
println('...');

const device = await(await navigator.gpu.requestAdapter()).requestDevice();
const b0 = device.createBuffer({
  size: 4,
  usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
});
const bW = device.createBuffer({
  size: 4,
  usage: GPUBufferUsage.MAP_WRITE | GPUBufferUsage.COPY_SRC,
});
const bR = device.createBuffer({
  size: 4,
  usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
});
// Wait to make sure the device is fully ready
await device.queue.onSubmittedWorkDone();

const suite = new Benchmark.Suite;
function add(name, fn) {
  suite.add(name, {
    defer: true,
    delay: 0.1,
    async fn(deferred) {
      await fn();
      deferred.resolve();
    },
  });
}

add('no submit + map write', async () => {
  await bW.mapAsync(GPUMapMode.WRITE);
  bW.unmap();
});
add('no submit + map write + getMappedRange', async () => {
  await bW.mapAsync(GPUMapMode.WRITE);
  bW.getMappedRange();
  bW.unmap();
});
add('submit unrelated + map write + getMappedRange', async () => {
  const enc = device.createCommandEncoder();
  enc.copyBufferToBuffer(b0, 0, bR, 0, 4);
  device.queue.submit([enc.finish()]);
  await bW.mapAsync(GPUMapMode.WRITE);
  bW.getMappedRange();
  bW.unmap();
});
add('submit related + map write + getMappedRange', async () => {
  const enc = device.createCommandEncoder();
  enc.copyBufferToBuffer(bW, 0, b0, 0, 4);
  device.queue.submit([enc.finish()]);
  await bW.mapAsync(GPUMapMode.WRITE);
  bW.getMappedRange();
  bW.unmap();
});

suite
  .on('cycle', function (event) {
    println('-', `${(event.target.stats.mean * 1e3).toFixed(4)}ms`, '-', event.target);
  })
  .on('complete', function () {
    println('\ndone, full results in console');
    for (let i = 0; i < this.length; ++i) {
    }
  })
  .run({ async: true });

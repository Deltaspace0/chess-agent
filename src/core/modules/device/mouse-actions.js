import { mouse, straightTo } from '@nut-tree-fork/nut-js';
import { parentPort } from 'worker_threads';

parentPort.on('message', async (data) => {
  const { action, arg, key } = data;
  if (action === 'move') {
    await mouse.move(arg);
  } else if (action === 'move-straight') {
    await mouse.move(straightTo(arg));
  } else if (action === 'click') {
    await mouse.click(arg);
  } else if (action === 'press') {
    await mouse.pressButton(arg);
  } else if (action === 'release') {
    await mouse.releaseButton(arg);
  } else if (action === 'speed') {
    mouse.config.mouseSpeed = arg;
  }
  parentPort.postMessage({ action, key });
});

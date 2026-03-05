import { mouse, straightTo } from '@nut-tree-fork/nut-js';

process.parentPort.on('message', async (data) => {
  const { action, arg, key } = data.data;
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
  }
  process.parentPort.postMessage({ action, key });
});

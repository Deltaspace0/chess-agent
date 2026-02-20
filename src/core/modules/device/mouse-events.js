import { uIOhook } from 'uiohook-napi';

uIOhook.on('mousedown', () => process.parentPort.postMessage('mousedown'));
uIOhook.on('mouseup', () => process.parentPort.postMessage('mouseup'));
uIOhook.on('mousemove', () => process.parentPort.postMessage('mousemove'));
uIOhook.on('wheel', () => process.parentPort.postMessage('mousewheel'));
uIOhook.start();

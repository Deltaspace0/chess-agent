const { contextBridge } = require('electron');
const { ipcRenderer } = require('electron/renderer');

const preferenceListeners = {};
const signalListeners = {};
ipcRenderer.on('preference', (_, name, value) => {
  if (name in preferenceListeners) {
    for (const listener of preferenceListeners[name]) {
      listener(value);
    }
  }
});
ipcRenderer.on('signal', (_, name, value) => {
  if (name in signalListeners) {
    for (const listener of signalListeners[name]) {
      listener(value);
    }
  }
});
contextBridge.exposeInMainWorld('electronAPI', {
  onPreference: (name, listener) => {
    if (!(name in preferenceListeners)) {
      preferenceListeners[name] = new Set();
    }
    preferenceListeners[name].add(listener);
    return () => preferenceListeners[name].delete(listener);
  },
  onSignal: (name, listener) => {
    if (!(name in signalListeners)) {
      signalListeners[name] = new Set();
    }
    signalListeners[name].add(listener);
    return () => signalListeners[name].delete(listener);
  },
  setPreference: (...value) => ipcRenderer.send('preference', ...value),
  sendSignal: (...value) => ipcRenderer.send('signal', ...value)
});

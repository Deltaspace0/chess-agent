const { contextBridge } = require('electron');
const { ipcRenderer } = require('electron/renderer');

function sendValue(channel) {
  return (...value) => ipcRenderer.send(channel, ...value);
}

const preferenceListeners = {};
const signalListeners = {};
ipcRenderer.on('update-preference', (_, name, value) => {
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
  preferenceValue: sendValue('preference-value'),
  sendSignal: sendValue('signal')
});

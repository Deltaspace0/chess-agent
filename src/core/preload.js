const { contextBridge } = require('electron');
const { ipcRenderer } = require('electron/renderer');

function addListener(channel) {
  const ipcListeners = new Set();
  ipcRenderer.addListener(channel, (_, ...value) => {
    for (const listener of ipcListeners) {
      listener(...value);
    }
  });
  return (listener) => {
    ipcListeners.add(listener);
    return () => ipcListeners.delete(listener);
  };
}

function sendValue(channel) {
  return (...value) => ipcRenderer.send(channel, ...value);
}

const preferenceListeners = {};
const variableListeners = {};
ipcRenderer.on('update-preference', (_, name, value) => {
  if (name in preferenceListeners) {
    for (const listener of preferenceListeners[name]) {
      listener(value);
    }
  }
});
ipcRenderer.on('update-variable', (_, name, value) => {
  if (name in variableListeners) {
    for (const listener of variableListeners[name]) {
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
  onVariable: (name, listener) => {
    if (!(name in variableListeners)) {
      variableListeners[name] = new Set();
    }
    variableListeners[name].add(listener);
    return () => variableListeners[name].delete(listener);
  },
  onPromotion: addListener('promotion'),
  onEngineData: addListener('engine-data'),
  preferenceValue: sendValue('preference-value'),
  pieceDropped: sendValue('piece-dropped'),
  pieceDroppedEdit: sendValue('piece-dropped-edit'),
  sendToEngine: sendValue('send-to-engine'),
  setPosition: sendValue('set-position'),
  setPositionInfo: sendValue('set-position-info'),
  doAction: sendValue('action')
});

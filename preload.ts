const { contextBridge } = require('electron');
const { ipcRenderer } = require('electron/renderer');

contextBridge.exposeInMainWorld('electronAPI', {
  onUpdateStatus: (callback) => ipcRenderer.on('update-status', (_event, value) => callback(value)),
  onUpdateAutoResponse: (callback) => ipcRenderer.on('update-autoresponse', (_event, value) => callback(value)),
  onUpdatePerspective: (callback) => ipcRenderer.on('update-perspective', (_event, value) => callback(value)),
  onUpdateDragging: (callback) => ipcRenderer.on('update-dragging', (_event, value) => callback(value)),
  onDetectingRegion: (callback) => ipcRenderer.on('detecting-region', (_event, value) => callback(value)),
  onUpdateDuration: (callback) => ipcRenderer.on('update-duration', (_event, value) => callback(value)),
  onUpdatePosition: (callback) => ipcRenderer.on('update-position', (_event, value) => callback(value)),
  onEvaluation: (callback) => ipcRenderer.on('evaluation', (_event, value) => callback(value)),
  autoResponseValue: (value) => ipcRenderer.send('autoresponse-value', value),
  perspectiveValue: (value) => ipcRenderer.send('perspective-value', value),
  draggingValue: (value) => ipcRenderer.send('dragging-value', value),
  durationValue: (value) => ipcRenderer.send('duration-value', value),
  mouseSpeedValue: (value) => ipcRenderer.send('mousespeed-value', value),
  newRegion: () => ipcRenderer.invoke('new-region'),
  reloadHashes: () => ipcRenderer.invoke('reload-hashes'),
  scanMove: () => ipcRenderer.invoke('scan-move'),
  skipMove: () => ipcRenderer.invoke('skip-move'),
  undoMove: () => ipcRenderer.invoke('undo-move'),
  bestMove: () => ipcRenderer.invoke('best-move'),
  resetPosition: () => ipcRenderer.invoke('reset-position'),
  recognizeBoard: () => ipcRenderer.invoke('recognize-board')
});

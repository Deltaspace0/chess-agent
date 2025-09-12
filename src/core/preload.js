const { contextBridge } = require('electron');
const { ipcRenderer } = require('electron/renderer');

function addListener(channel) {
  return (listener) => ipcRenderer.on(channel, (_, value) => listener(value));
}

function sendValue(channel) {
  return (...value) => ipcRenderer.send(channel, ...value);
}

function invoke(channel) {
  return () => ipcRenderer.invoke(channel);
}

const preferenceListeners = {};
ipcRenderer.on('update-preference', (_, name, value) => {
  if (name in preferenceListeners) {
    preferenceListeners[name](value);
  }
});
contextBridge.exposeInMainWorld('electronAPI', {
  onUpdatePreference: (name, listener) => {
    preferenceListeners[name] = listener;
  },
  onUpdateStatus: addListener('update-status'),
  onUpdateRegion: addListener('update-region'),
  onUpdatePosition: addListener('update-position'),
  onEvaluation: addListener('evaluation'),
  onHighlightMoves: addListener('highlight-moves'),
  onPrincipalVariations: addListener('principal-variations'),
  onPromotion: addListener('promotion'),
  preferenceValue: sendValue('preference-value'),
  pieceDropped: sendValue('piece-dropped'),
  promoteTo: sendValue('promote-to'),
  newRegion: invoke('new-region'),
  showRegion: invoke('show-region'),
  removeRegion: invoke('remove-region'),
  loadHashes: invoke('load-hashes'),
  scanMove: invoke('scan-move'),
  skipMove: invoke('skip-move'),
  undoMove: invoke('undo-move'),
  bestMove: invoke('best-move'),
  resetPosition: invoke('reset-position'),
  recognizeBoard: invoke('recognize-board')
});

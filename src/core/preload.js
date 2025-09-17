const { contextBridge } = require('electron');
const { ipcRenderer } = require('electron/renderer');

function addListener(channel) {
  let ipcListener = null;
  return (listener) => {
    if (ipcListener) {
      ipcRenderer.off(channel, ipcListener);
    }
    ipcListener = (_, ...value) => listener(...value);
    ipcRenderer.on(channel, ipcListener);
  };
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
  onUpdatePositionInfo: addListener('update-position-info'),
  onUpdateEngineInfo: addListener('update-engine-info'),
  onHighlightMoves: addListener('highlight-moves'),
  onPrincipalVariations: addListener('principal-variations'),
  onPromotion: addListener('promotion'),
  onEngineData: addListener('engine-data'),
  preferenceValue: sendValue('preference-value'),
  pieceDropped: sendValue('piece-dropped'),
  pieceDroppedEdit: sendValue('piece-dropped-edit'),
  promoteTo: sendValue('promote-to'),
  sendToEngine: sendValue('send-to-engine'),
  setPosition: sendValue('set-position'),
  setPositionInfo: sendValue('set-position-info'),
  newRegion: invoke('new-region'),
  showRegion: invoke('show-region'),
  removeRegion: invoke('remove-region'),
  loadHashes: invoke('load-hashes'),
  scanMove: invoke('scan-move'),
  skipMove: invoke('skip-move'),
  undoMove: invoke('undo-move'),
  bestMove: invoke('best-move'),
  resetPosition: invoke('reset-position'),
  clearPosition: invoke('clear-position'),
  recognizeBoard: invoke('recognize-board'),
  dialogEngine: invoke('dialog-engine'),
  reloadEngine: invoke('reload-engine')
});

const { contextBridge } = require('electron');
const { ipcRenderer } = require('electron/renderer');

function addListener(channel) {
  return (listener) => ipcRenderer.on(channel, (_, value) => listener(value));
}

function sendValue(channel) {
  return (value) => ipcRenderer.send(channel, value);
}

function invoke(channel) {
  return () => ipcRenderer.invoke(channel);
}

contextBridge.exposeInMainWorld('electronAPI', {
  onUpdateStatus: addListener('update-status'),
  onUpdateAutoResponse: addListener('update-autoresponse'),
  onUpdateAutoScan: addListener('update-autoscan'),
  onUpdatePerspective: addListener('update-perspective'),
  onUpdateDragging: addListener('update-dragging'),
  onUpdateActionRegion: addListener('update-actionregion'),
  onUpdateShowEvalBar: addListener('update-show-evalbar'),
  onUpdateShowArrows: addListener('update-show-arrows'),
  onUpdateShowLines: addListener('update-show-lines'),
  onUpdateShowNotation: addListener('update-show-notation'),
  onUpdateRegion: addListener('update-region'),
  onUpdateDuration: addListener('update-duration'),
  onUpdateMultiPV: addListener('update-multipv'),
  onUpdateMouseSpeed: addListener('update-mousespeed'),
  onUpdatePosition: addListener('update-position'),
  onEvaluation: addListener('evaluation'),
  onHighlightMoves: addListener('highlight-moves'),
  onPrincipalVariations: addListener('principal-variations'),
  autoResponseValue: sendValue('autoresponse-value'),
  autoScanValue: sendValue('autoscan-value'),
  perspectiveValue: sendValue('perspective-value'),
  draggingValue: sendValue('dragging-value'),
  actionRegionValue: sendValue('actionregion-value'),
  showEvalBarValue: sendValue('show-evalbar-value'),
  showArrowsValue: sendValue('show-arrows-value'),
  showLinesValue: sendValue('show-lines-value'),
  showNotationValue: sendValue('show-notation-value'),
  durationValue: sendValue('duration-value'),
  multiPVValue: sendValue('multipv-value'),
  mouseSpeedValue: sendValue('mousespeed-value'),
  pieceDropped: sendValue('piece-dropped'),
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

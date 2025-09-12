import { app, BrowserWindow, ipcMain } from 'electron';
import { mouse, sleep, Region } from '@nut-tree-fork/nut-js';
import path from 'path';
import { fileURLToPath } from 'url';
import ActionRegionManager from './modules/ActionRegionManager.ts';
import Board from './modules/Board.ts';
import Engine from './modules/Engine.ts';
import Game from './modules/Game.ts';
import PreferencesManager from './modules/PreferencesManager.ts';
import Recognizer from './modules/Recognizer.ts';
import RegionManager from './modules/RegionManager.ts';
import Solver from './modules/Solver.ts';
import { sliders, actionRegions } from '../config.ts';

async function createWindow(): Promise<BrowserWindow> {
  const win = new BrowserWindow({
    width: 400,
    height: 600,
    icon: 'images/chess-icon.png',
    resizable: false,
    webPreferences: {
      preload: path.join(path.dirname(fileURLToPath(import.meta.url)), 'preload.js')
    }
  });
  win.removeMenu();
  win.setAlwaysOnTop(true, 'normal');
  await win.loadURL('http://localhost:5173');
  return win;
}

function getRegionSelector(position: string): (region: Region) => Region {
  const index = Number(position[1]);
  if (position[0] === 'N') {
    return ({ left, top, width, height }) => {
      return new Region(left+width*(index-1)/8, top-height/16, width/8, height/16);
    }
  }
  if (position[0] === 'S') {
    return ({ left, top, width, height }) => {
      return new Region(left+width*(index-1)/8, top+height, width/8, height/16);
    }
  }
  if (position[0] === 'W') {
    return ({ left, top, width, height }) => {
      return new Region(left-width/16, top+height*(index-1)/8, width/16, height/8);
    }
  }
  return ({ left, top, width, height }) => {
    return new Region(left+width, top+height*(index-1)/8, width/16, height/8);
  }
}

(async () => {
  const preferencesManager = new PreferencesManager();
  preferencesManager.loadFromFile('config.json');
  await app.whenReady();
  const win = await createWindow();
  app.on('window-all-closed', () => {
    if (preferencesManager.getPreference('saveConfigToFile')) {
      preferencesManager.saveToFile('config.json');
    }
    app.quit();
  });
  const updateStatus = (status: string) => {
    console.log(status);
    win.webContents.send('update-status', status);
  };
  const board = new Board();
  board.onMouseDownSquare(() => recognizer.stopScanning());
  const engine = new Engine();
  engine.onPrincipalMoves((value) => {
    const moves = value.map((x) => x.split(' ').slice(0, 3));
    const variations = value.map((x) => game.formatEvalMoves(x));
    win.webContents.send('highlight-moves', moves);
    win.webContents.send('principal-variations', variations);
  });
  engine.onEvaluation((value) => {
    win.webContents.send('evaluation', value);
  });
  engine.reset();
  const game = new Game();
  game.onUpdatePosition((value) => {
    win.webContents.send('update-position', value);
  });
  game.reset();
  const recognizer = new Recognizer();
  const solver = new Solver({ engine, game, recognizer });
  solver.onUpdateStatus(updateStatus);
  solver.onBestMove(async (move) => {
    const draggingMode = preferencesManager.getPreference('draggingMode');
    await board.playMove(move, draggingMode);
    await sleep(50);
    if (!draggingMode) {
      solver.processMove(move);
    }
  });
  solver.onPromotion(() => win.webContents.send('promotion'));
  const actionRegionManager = new ActionRegionManager();
  actionRegionManager.addActionRegion({
    callback: () => solver.recognizeBoard(),
    regionSelector: getRegionSelector(actionRegions.recognizeBoard)
  });
  actionRegionManager.addActionRegion({
    callback: () => solver.playBestMove(),
    regionSelector: getRegionSelector(actionRegions.playBestMove)
  });
  actionRegionManager.addActionRegion({
    callback: () => solver.resetPosition(),
    regionSelector: getRegionSelector(actionRegions.resetPosition)
  });
  actionRegionManager.addActionRegion({
    callback: () => {
      const autoResponse = preferencesManager.getPreference('autoResponse');
      preferencesManager.setPreference('autoResponse', !autoResponse);
    },
    regionSelector: getRegionSelector(actionRegions.autoResponse)
  });
  actionRegionManager.addActionRegion({
    callback: () => solver.undoMove(),
    regionSelector: getRegionSelector(actionRegions.undoMove)
  });
  actionRegionManager.addActionRegion({
    callback: () => solver.skipMove(),
    regionSelector: getRegionSelector(actionRegions.skipMove)
  });
  actionRegionManager.addActionRegion({
    callback: () => void solver.scanMove(),
    regionSelector: getRegionSelector(actionRegions.scanMove)
  });
  actionRegionManager.addActionRegion({
    callback: () => {
      const duration = preferencesManager.getPreference('analysisDuration');
      const index = sliders.analysisDurations.indexOf(duration);
      const newIndex = (index+1)%sliders.analysisDurations.length;
      const newDuration = sliders.analysisDurations[newIndex];
      preferencesManager.setPreference('analysisDuration', newDuration);
      updateStatus(`Analysis duration: ${newDuration} ms`);
    },
    regionSelector: getRegionSelector(actionRegions.analysisDuration)
  });
  actionRegionManager.addActionRegion({
    callback: () => void regionManager.selectNewRegion(),
    regionSelector: getRegionSelector(actionRegions.selectNewRegion)
  });
  actionRegionManager.addActionRegion({
    callback: () => {
      const draggingMode = !preferencesManager.getPreference('draggingMode');
      preferencesManager.setPreference('draggingMode', draggingMode);
      console.log(`${draggingMode ? 'Dragging' : 'Clicking'} mode`);
    },
    regionSelector: getRegionSelector(actionRegions.draggingMode)
  });
  actionRegionManager.addActionRegion({
    callback: () => {
      const isWhite = !preferencesManager.getPreference('isWhitePerspective');
      preferencesManager.setPreference('isWhitePerspective', isWhite);
      console.log(`${isWhite ? 'White' : 'Black'} perspective`);
    },
    regionSelector: getRegionSelector(actionRegions.perspective)
  });
  actionRegionManager.addActionRegion({
    callback: () => solver.promoteTo('q'),
    regionSelector: getRegionSelector(actionRegions.promoteQueen)
  });
  actionRegionManager.addActionRegion({
    callback: () => solver.promoteTo('r'),
    regionSelector: getRegionSelector(actionRegions.promoteRook)
  });
  actionRegionManager.addActionRegion({
    callback: () => solver.promoteTo('b'),
    regionSelector: getRegionSelector(actionRegions.promoteBishop)
  });
  actionRegionManager.addActionRegion({
    callback: () => solver.promoteTo('n'),
    regionSelector: getRegionSelector(actionRegions.promoteKnight)
  });
  const regionManager = new RegionManager();
  regionManager.onUpdateStatus(updateStatus);
  regionManager.onUpdateRegion((region) => {
    preferencesManager.setPreference('region', region);
  });
  regionManager.onUpdateRegionStatus((value) => {
    const region = preferencesManager.getPreference('region');
    actionRegionManager.setRegion(value === 'selecting' ? null : region);
    win.webContents.send('update-region', value);
  });
  regionManager.setRegion(preferencesManager.getPreference('region'));
  preferencesManager.onUpdate((name, value) => {
    win.webContents.send('update-preference', name, value);
  });
  preferencesManager.onUpdatePreference('autoResponse', (value) => {
    solver.setAutoResponse(value);
  });
  preferencesManager.onUpdatePreference('autoScan', (value) => {
    solver.setAutoScan(value);
  });
  preferencesManager.onUpdatePreference('autoQueen', (value) => {
    solver.setAutoQueen(value);
  });
  preferencesManager.onUpdatePreference('isWhitePerspective', (value) => {
    board.setPerspective(value);
    game.setPerspective(value);
  });
  preferencesManager.onUpdatePreference('actionRegion', (value) => {
    actionRegionManager.setActive(value);
  });
  preferencesManager.onUpdatePreference('analysisDuration', (value) => {
    engine.setAnalysisDuration(value);
  });
  preferencesManager.onUpdatePreference('multiPV', (value) => {
    engine.setMultiPV(value);
  });
  preferencesManager.onUpdatePreference('mouseSpeed', (value) => {
    mouse.config.mouseSpeed = value;
  });
  preferencesManager.onUpdatePreference('region', (value) => {
    actionRegionManager.setRegion(value);
    board.setRegion(value);
    recognizer.setRegion(value);
  });
  ipcMain.on('preference-value', (_, name, value) => {
    preferencesManager.setPreference(name, value);
  });
  ipcMain.on('piece-dropped', (_, value) => solver.processMove(value));
  ipcMain.on('promote-to', (_, value) => solver.promoteTo(value));
  ipcMain.handle('new-region', () => regionManager.selectNewRegion());
  ipcMain.handle('show-region', () => regionManager.showRegion());
  ipcMain.handle('remove-region', () => regionManager.setRegion(null));
  ipcMain.handle('load-hashes', () => {
    const perspective = preferencesManager.getPreference('isWhitePerspective');
    recognizer.load(perspective).then(
      () => updateStatus('Loaded piece hashes'),
      () => updateStatus('Failed to load piece hashes'));
  });
  ipcMain.handle('scan-move', () => solver.scanMove());
  ipcMain.handle('skip-move', () => solver.skipMove());
  ipcMain.handle('undo-move', () => solver.undoMove());
  ipcMain.handle('best-move', () => solver.playBestMove());
  ipcMain.handle('reset-position', () => solver.resetPosition());
  ipcMain.handle('recognize-board', () => solver.recognizeBoard());
  updateStatus('Ready');
  while (true) {
    const move = await board.detectMove();
    solver.processMove(move);
  }
})();

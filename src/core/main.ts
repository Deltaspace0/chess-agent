import { app, BrowserWindow, ipcMain } from 'electron';
import { mouse, Region } from '@nut-tree-fork/nut-js';
import path from 'path';
import { fileURLToPath } from 'url';
import Board from './Board.ts';
import Engine from './Engine.ts';
import Game from './Game.ts';
import PreferencesManager from './PreferencesManager.ts';
import Recognizer from './Recognizer.ts';
import RegionManager from './RegionManager.ts';
import Solver from './Solver.ts';

async function createWindow(): Promise<BrowserWindow> {
  const win = new BrowserWindow({
    width: 400,
    height: 600,
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

(async () => {
  const preferencesManager = new PreferencesManager();
  preferencesManager.loadFromFile('config.json');
  mouse.config.mouseSpeed = preferencesManager.getPreference('mouseSpeed');
  await app.whenReady();
  const win = await createWindow();
  win.webContents.send('update-mousespeed', mouse.config.mouseSpeed);
  win.webContents.send('update-show-evalbar',
    preferencesManager.getPreference('showEvalBar'));
  win.webContents.send('update-show-arrows',
    preferencesManager.getPreference('showArrows'));
  win.webContents.send('update-show-lines',
    preferencesManager.getPreference('showLines'));
  win.webContents.send('update-show-notation',
    preferencesManager.getPreference('showNotation'));
  app.on('window-all-closed', () => {
    preferencesManager.saveToFile('config.json');
    app.quit();
  });
  const updateStatus = (status: string) => {
    console.log(status);
    win.webContents.send('update-status', status);
  };
  const board = new Board();
  board.onUpdatePerspective((value) => {
    win.webContents.send('update-perspective', value);
    preferencesManager.setPreference('isWhitePerspective', value);
  });
  board.onUpdateDragging((value) => {
    win.webContents.send('update-dragging', value);
    preferencesManager.setPreference('draggingMode', value);
  });
  board.setPerspective(preferencesManager.getPreference('isWhitePerspective'));
  board.setDraggingMode(preferencesManager.getPreference('draggingMode'));
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
  engine.onUpdateDuration((value) => {
    win.webContents.send('update-duration', value);
    preferencesManager.setPreference('analysisDuration', value);
  });
  engine.onUpdateMultiPV((value) => {
    win.webContents.send('update-multipv', value);
    preferencesManager.setPreference('multiPV', value);
  });
  engine.setAnalysisDuration(preferencesManager.getPreference('analysisDuration'));
  engine.setMultiPV(preferencesManager.getPreference('multiPV'));
  engine.reset();
  const game = new Game(board);
  game.onUpdatePosition((value) => {
    win.webContents.send('update-position', value);
  });
  game.reset();
  const recognizer = new Recognizer();
  const solver = new Solver({ engine, game, recognizer });
  solver.onUpdateStatus(updateStatus);
  solver.onBestMove((move) => board.playMove(move));
  solver.onUpdateAutoResponse((value) => {
    win.webContents.send('update-autoresponse', value);
    preferencesManager.setPreference('autoResponse', value);
  });
  solver.onUpdateAutoScan((value) => {
    win.webContents.send('update-autoscan', value);
    preferencesManager.setPreference('autoScan', value);
  });
  solver.setAutoResponse(preferencesManager.getPreference('autoResponse'));
  solver.setAutoScan(preferencesManager.getPreference('autoScan'));
  const regionManager = new RegionManager();
  regionManager.addActionRegion({
    callback: () => solver.recognizeBoard(),
    regionSelector: ({ left, top, width, height }) => {
      return new Region(left, top+height, width/8, height/16);
    }
  });
  regionManager.addActionRegion({
    callback: () => solver.playBestMove(),
    regionSelector: ({ left, top, width, height }) => {
      return new Region(left+width/8, top+height, width/8, height/16);
    }
  });
  regionManager.addActionRegion({
    callback: () => solver.resetPosition(),
    regionSelector: ({ left, top, width, height }) => {
      return new Region(left+width*2/8, top+height, width/8, height/16);
    }
  });
  regionManager.addActionRegion({
    callback: () => solver.toggleAutoResponse(),
    regionSelector: ({ left, top, width, height }) => {
      return new Region(left+width*3/8, top+height, width/8, height/16);
    }
  });
  regionManager.addActionRegion({
    callback: () => solver.undoMove(),
    regionSelector: ({ left, top, width, height }) => {
      return new Region(left+width*4/8, top+height, width/8, height/16);
    }
  });
  regionManager.addActionRegion({
    callback: () => solver.skipMove(),
    regionSelector: ({ left, top, width, height }) => {
      return new Region(left+width*5/8, top+height, width/8, height/16);
    }
  });
  regionManager.addActionRegion({
    callback: () => solver.scanMove(),
    regionSelector: ({ left, top, width, height }) => {
      return new Region(left+width*6/8, top+height, width/8, height/16);
    }
  });
  regionManager.addActionRegion({
    callback: () => {
      const analysisDuration = engine.switchAnalysisDuration();
      console.log(`Analysis duration: ${analysisDuration} ms`);
    },
    regionSelector: ({ left, top, width, height }) => {
      return new Region(left+width*7/8, top+height, width/8, height/16);
    }
  });
  regionManager.addActionRegion({
    callback: () => void regionManager.selectNewRegion(),
    regionSelector: ({ left, top, width, height }) => {
      return new Region(left+width, top, width/16, height/8);
    }
  });
  regionManager.addActionRegion({
    callback: () => {
      const draggingMode = board.toggleDraggingMode();
      console.log(`${draggingMode ? 'Dragging' : 'Clicking'} mode`);
    },
    regionSelector: ({ left, top, width, height }) => {
      return new Region(left+width, top+height/8, width/16, height/8);
    }
  });
  regionManager.addActionRegion({
    callback: () => {
      const isWhite = board.togglePerspective();
      console.log(`${isWhite ? 'White' : 'Black'} perspective`);
    },
    regionSelector: ({ left, top, width, height }) => {
      return new Region(left+width, top+height*7/8, width/16, height/8);
    }
  });
  regionManager.onUpdateStatus(updateStatus);
  regionManager.onUpdateActive((value) => {
    win.webContents.send('update-actionregion', value);
    preferencesManager.setPreference('actionRegion', value);
  });
  regionManager.onUpdateRegion((region) => {
    board.setRegion(region);
    recognizer.setRegion(region);
  });
  regionManager.onUpdateRegionStatus((value) => {
    win.webContents.send('update-region', value);
  });
  regionManager.setActive(preferencesManager.getPreference('actionRegion'));
  ipcMain.on('autoresponse-value', (_, value) => solver.setAutoResponse(value));
  ipcMain.on('autoscan-value', (_, value) => solver.setAutoScan(value));
  ipcMain.on('perspective-value', (_, value) => board.setPerspective(value));
  ipcMain.on('dragging-value', (_, value) => board.setDraggingMode(value));
  ipcMain.on('actionregion-value', (_, value) => regionManager.setActive(value));
  ipcMain.on('show-evalbar-value', (_, value) => {
    preferencesManager.setPreference('showEvalBar', value);
    win.webContents.send('update-show-evalbar', value);
  });
  ipcMain.on('show-arrows-value', (_, value) => {
    preferencesManager.setPreference('showArrows', value);
    win.webContents.send('update-show-arrows', value);
  });
  ipcMain.on('show-lines-value', (_, value) => {
    preferencesManager.setPreference('showLines', value);
    win.webContents.send('update-show-lines', value);
  });
  ipcMain.on('show-notation-value', (_, value) => {
    preferencesManager.setPreference('showNotation', value);
    win.webContents.send('update-show-notation', value);
  });
  ipcMain.on('duration-value', (_, value) => engine.setAnalysisDuration(value));
  ipcMain.on('multipv-value', (_, value) => engine.setMultiPV(value));
  ipcMain.on('mousespeed-value', (_, value) => {
    mouse.config.mouseSpeed = value;
    preferencesManager.setPreference('mouseSpeed', value);
    win.webContents.send('update-mousespeed', value);
  });
  ipcMain.on('piece-dropped', (_, value) => solver.processMove(value));
  ipcMain.handle('new-region', () => regionManager.selectNewRegion());
  ipcMain.handle('show-region', () => regionManager.showRegion());
  ipcMain.handle('remove-region', () => regionManager.removeRegion());
  ipcMain.handle('load-hashes', () => {
    recognizer.load().then(
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

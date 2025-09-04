import { app, BrowserWindow, ipcMain } from 'electron';
import { mouse, Region } from '@nut-tree-fork/nut-js';
import path from 'path';
import { fileURLToPath } from 'url';
import Board from './Board.ts';
import Engine from './Engine.ts';
import Game from './Game.ts';
import Recognizer from './Recognizer.ts';
import RegionManager from './RegionManager.ts';
import Solver from './Solver.ts';
import { defaultValues } from '../config.ts';

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
  mouse.config.mouseSpeed = defaultValues.mouseSpeed;
  await app.whenReady();
  const win = await createWindow();
  app.on('window-all-closed', () => {
    app.quit();
  });
  const updateStatus = (status: string) => {
    console.log(status);
    win.webContents.send('update-status', status);
  };
  const board = new Board();
  board.onUpdatePerspective((value) => {
    win.webContents.send('update-perspective', value);
  });
  board.onUpdateDragging((value) => {
    win.webContents.send('update-dragging', value);
  });
  const engine = new Engine();
  engine.onPrincipalMoves((value) => {
    win.webContents.send('highlight-moves', value.map((x) => x.split(' ').slice(0, 3)));
    win.webContents.send('principal-variations', value.map((x) => game.formatEvalMoves(x)));
  });
  engine.onEvaluation((value) => {
    win.webContents.send('evaluation', value);
  });
  engine.onUpdateDuration((value) => {
    win.webContents.send('update-duration', value);
  });
  engine.reset();
  const game = new Game();
  game.onUpdatePosition((value) => {
    win.webContents.send('update-position', value);
  });
  game.reset();
  const recognizer = new Recognizer();
  const regionManager = new RegionManager();
  const solver = new Solver({ board, engine, game, recognizer, regionManager });
  solver.onUpdateStatus(updateStatus);
  solver.onUpdateAutoResponse((value) => {
    win.webContents.send('update-autoresponse', value);
  });
  solver.onUpdateAutoScan((value) => {
    win.webContents.send('update-autoscan', value);
  });
  solver.onUpdateRegionStatus((value) => {
    win.webContents.send('update-region', value);
  });
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
    callback: () => solver.selectNewRegion(),
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
  regionManager.setActive(defaultValues.actionRegion);
  ipcMain.on('autoresponse-value', (_event, value) => solver.setAutoResponse(value));
  ipcMain.on('autoscan-value', (_event, value) => solver.setAutoScan(value));
  ipcMain.on('perspective-value', (_event, value) => board.setPerspective(value));
  ipcMain.on('dragging-value', (_event, value) => board.setDraggingMode(value));
  ipcMain.on('duration-value', (_event, value) => engine.setAnalysisDuration(value));
  ipcMain.on('multipv-value', (_event, value) => engine.setMultiPV(value));
  ipcMain.on('mousespeed-value', (_event, value) => mouse.config.mouseSpeed = value);
  ipcMain.on('actionregion-value', (_event, value) => regionManager.setActive(value));
  ipcMain.on('piece-dropped', (_event, value) => solver.processMove(value));
  ipcMain.handle('new-region', () => solver.selectNewRegion());
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
  await solver.observeMoves();
})();

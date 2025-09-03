import { app, BrowserWindow, ipcMain } from 'electron';
import { mouse } from '@nut-tree-fork/nut-js';
import path from 'path';
import { fileURLToPath } from 'url';
import Board from './src/core/Board.ts';
import Engine from './src/core/Engine.ts';
import Game from './src/core/Game.ts';
import Recognizer from './src/core/Recognizer.ts';
import RegionManager from './src/core/RegionManager.ts';
import Solver from './src/core/Solver.ts';
import { defaultValues } from './src/config.ts';

async function createWindow(): Promise<BrowserWindow> {
  const win = new BrowserWindow({
    width: 400,
    height: 600,
    resizable: false,
    webPreferences: {
      preload: path.join(path.dirname(fileURLToPath(import.meta.url)), 'preload.ts')
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
  ipcMain.on('autoresponse-value', (_event, value) => solver.setAutoResponse(value));
  ipcMain.on('autoscan-value', (_event, value) => solver.setAutoScan(value));
  ipcMain.on('perspective-value', (_event, value) => board.setPerspective(value));
  ipcMain.on('dragging-value', (_event, value) => board.setDraggingMode(value));
  ipcMain.on('duration-value', (_event, value) => engine.setAnalysisDuration(value));
  ipcMain.on('multipv-value', (_event, value) => engine.setMultiPV(value));
  ipcMain.on('mousespeed-value', (_event, value) => mouse.config.mouseSpeed = value);
  ipcMain.on('actionregion-value', (_event, value) => solver.setActionRegionsEnabled(value));
  ipcMain.handle('new-region', () => solver.selectNewRegion());
  ipcMain.handle('reload-hashes', () => {
    recognizer.load().then(
      () => updateStatus('Reloaded piece hashes'),
      () => updateStatus('Failed to reload piece hashes'));
  });
  ipcMain.handle('scan-move', () => solver.scanMove());
  ipcMain.handle('skip-move', () => solver.skipMove());
  ipcMain.handle('undo-move', () => solver.undoMove());
  ipcMain.handle('best-move', () => solver.playBestMove());
  ipcMain.handle('reset-position', () => solver.resetPosition());
  ipcMain.handle('recognize-board', () => solver.recognizeBoard());
  updateStatus('Ready');
  await solver.observe();
})();

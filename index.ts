import { app, BrowserWindow, ipcMain } from 'electron';
import { mouse, screen, Region } from '@nut-tree-fork/nut-js';
import path from 'path';
import { fileURLToPath } from 'url';
import Board from './src/core/Board.ts';
import Engine from './src/core/Engine.ts';
import Game from './src/core/Game.ts';
import Recognizer from './src/core/Recognizer.ts';
import Solver from './src/core/Solver.ts';
import { detectRegion } from './src/core/util.ts';
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
  await app.whenReady();
  const win = await createWindow();
  const updateStatus = (status: string) => {
    console.log(status);
    win.webContents.send('update-status', status);
  };
  mouse.config.mouseSpeed = defaultValues.mouseSpeed;
  const game = new Game();
  game.onUpdatePosition((value) => {
    win.webContents.send('update-position', value);
  });
  game.reset();
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
  updateStatus('Select chess board region');
  let boardRegion: Region | null = null;
  while (boardRegion === null) {
    boardRegion = await detectRegion();
  }
  await screen.highlight(boardRegion);
  const recognizer = new Recognizer(boardRegion);
  const board = new Board(boardRegion);
  board.onUpdatePerspective((value) => {
    win.webContents.send('update-perspective', value);
  });
  board.onUpdateDragging((value) => {
    win.webContents.send('update-dragging', value);
  });
  const solver = new Solver({
    region: boardRegion,
    game: game,
    engine: engine,
    recognizer: recognizer,
    board: board
  });
  solver.onUpdateStatus(updateStatus);
  solver.onUpdateAutoResponse((value) => {
    win.webContents.send('update-autoresponse', value);
  });
  solver.onUpdateAutoScan((value) => {
    win.webContents.send('update-autoscan', value);
  });
  solver.onDetectingRegion((value) => {
    win.webContents.send('update-region', value ? 'new' : 'none');
  });
  app.on('window-all-closed', () => {
    app.quit();
  });
  updateStatus('Ready');
  ipcMain.on('autoresponse-value', (_event, value) => solver.setAutoResponse(value));
  ipcMain.on('autoscan-value', (_event, value) => solver.setAutoScan(value));
  ipcMain.on('perspective-value', (_event, value) => board.setPerspective(value));
  ipcMain.on('dragging-value', (_event, value) => board.setDraggingMode(value));
  ipcMain.on('duration-value', (_event, value) => engine.setAnalysisDuration(value));
  ipcMain.on('multipv-value', (_event, value) => engine.setMultiPV(value));
  ipcMain.on('mousespeed-value', (_event, value) => mouse.config.mouseSpeed = value);
  ipcMain.on('actionregion-value', (_event, value) => solver.setActionRegionsEnabled(value));
  ipcMain.handle('new-region', () => solver.detectNewRegion());
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
  win.webContents.send('update-region', 'none');
  await solver.observe();
})();

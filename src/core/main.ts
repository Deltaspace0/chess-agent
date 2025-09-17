import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import { mouse, sleep, Region } from '@nut-tree-fork/nut-js';
import path from 'path';
import { fileURLToPath } from 'url';
import ActionRegionManager from './modules/ActionRegionManager.ts';
import Agent from './modules/Agent.ts';
import Board from './modules/Board.ts';
import Engine from './modules/Engine.ts';
import EngineExternal from './modules/EngineExternal.ts';
import EngineWorker from './modules/EngineWorker.ts';
import Game from './modules/Game.ts';
import PreferenceManager from './modules/PreferenceManager.ts';
import Recognizer from './modules/Recognizer.ts';
import RegionManager from './modules/RegionManager.ts';
import { sliders, actionRegions } from '../config.ts';

type ActionName = keyof typeof actionRegions;

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
  const preferenceManager = new PreferenceManager();
  preferenceManager.loadFromFile('config.json');
  await app.whenReady();
  const win = await createWindow();
  let appRunning = true;
  const sendToApp = (channel: string, ...args: unknown[]) => {
    if (appRunning) {
      win.webContents.send(channel, ...args);
    }
  }
  app.on('window-all-closed', () => {
    if (preferenceManager.getPreference('saveConfigToFile')) {
      preferenceManager.saveToFile('config.json');
    }
    appRunning = false;
    app.quit();
  });
  const updateStatus = (status: string) => {
    console.log(status);
    sendToApp('update-status', status);
  };
  const board = new Board();
  board.onMouseDownSquare(() => recognizer.stopScanning());
  const engineExternal = new EngineExternal();
  engineExternal.addListener('stdin', (data) => {
    sendToApp('engine-data', 'external', '<<< '+data);
  });
  engineExternal.addListener('stdout', (data) => {
    sendToApp('engine-data', 'external', '>>> '+data);
  });
  engineExternal.addListener('stderr', (data) => {
    sendToApp('engine-data', 'external', '!>> '+data);
  });
  const engineWorker = new EngineWorker();
  engineWorker.addListener('stdin', (data) => {
    sendToApp('engine-data', 'internal', '<<< '+data);
  });
  engineWorker.addListener('stdout', (data) => {
    sendToApp('engine-data', 'internal', '>>> '+data);
  });
  engineWorker.addListener('stderr', (data) => {
    sendToApp('engine-data', 'internal', '!>> '+data);
  });
  const engine = new Engine(engineWorker);
  engine.onPrincipalMoves((value) => {
    const moves = value.map((x) => x.split(' ').slice(0, 3));
    const variations = value.map((x) => game.formatEvalMoves(x));
    sendToApp('highlight-moves', moves);
    sendToApp('principal-variations', variations);
  });
  engine.onEngineInfo((value) => {
    sendToApp('update-engine-info', value);
  });
  const game = new Game();
  game.onUpdatePosition((value) => {
    sendToApp('update-position-info', game.getPositionInfo());
    sendToApp('update-position', value);
  });
  game.reset();
  const recognizer = new Recognizer();
  const handleLoadHashes = () => {
    const perspective = preferenceManager.getPreference('isWhitePerspective');
    recognizer.load(perspective).then(
      () => updateStatus('Loaded piece hashes'),
      () => updateStatus('Failed to load piece hashes'));
  };
  const agent = new Agent({ engine, game, recognizer });
  agent.onUpdateStatus(updateStatus);
  agent.onBestMove(async (move) => {
    const draggingMode = preferenceManager.getPreference('draggingMode');
    await board.playMove(move, draggingMode);
    await sleep(50);
    if (!draggingMode) {
      agent.processMove(move);
    }
  });
  agent.onPromotion(() => sendToApp('promotion'));
  const actionCallbacks: Record<ActionName, () => void> = {
    recognizeBoard: () => agent.recognizeBoard(),
    playBestMove: () => agent.playBestMove(),
    resetPosition: () => agent.resetPosition(),
    autoResponse: () => {
      const autoResponse = preferenceManager.getPreference('autoResponse');
      preferenceManager.setPreference('autoResponse', !autoResponse);
    },
    undoMove: () => agent.undoMove(),
    skipMove: () => agent.skipMove(),
    scanMove: () => void agent.scanMove(),
    analysisDuration: () => {
      const duration = preferenceManager.getPreference('analysisDuration');
      const index = sliders.analysisDuration.indexOf(duration);
      const newIndex = (index+1)%sliders.analysisDuration.length;
      const newDuration = sliders.analysisDuration[newIndex];
      preferenceManager.setPreference('analysisDuration', newDuration);
      updateStatus(`Analysis duration: ${newDuration} ms`);
    },
    selectNewRegion: () => void regionManager.selectNewRegion(),
    draggingMode: () => {
      const draggingMode = !preferenceManager.getPreference('draggingMode');
      preferenceManager.setPreference('draggingMode', draggingMode);
      console.log(`${draggingMode ? 'Dragging' : 'Clicking'} mode`);
    },
    loadHashes: handleLoadHashes,
    perspective: () => {
      const isWhite = !preferenceManager.getPreference('isWhitePerspective');
      preferenceManager.setPreference('isWhitePerspective', isWhite);
      console.log(`${isWhite ? 'White' : 'Black'} perspective`);
    },
    promoteQueen: () => agent.promoteTo('q'),
    promoteRook: () => agent.promoteTo('r'),
    promoteBishop: () => agent.promoteTo('b'),
    promoteKnight: () => agent.promoteTo('n')
  };
  const actionRegionManager = new ActionRegionManager();
  for (const name of Object.keys(actionCallbacks) as ActionName[]) {
    actionRegionManager.addActionRegion({
      callback: actionCallbacks[name],
      regionSelector: getRegionSelector(actionRegions[name])
    });
  }
  const regionManager = new RegionManager();
  regionManager.onUpdateStatus(updateStatus);
  regionManager.onUpdateRegion((region) => {
    preferenceManager.setPreference('region', region);
  });
  regionManager.onUpdateRegionStatus((value) => {
    const region = preferenceManager.getPreference('region');
    actionRegionManager.setRegion(value === 'selecting' ? null : region);
    sendToApp('update-region', value);
  });
  regionManager.setRegion(preferenceManager.getPreference('region'));
  preferenceManager.onUpdate((name, value) => {
    sendToApp('update-preference', name, value);
  });
  const preferenceListeners: Partial<PreferenceListeners> = {
    alwaysOnTop: (value) => win.setAlwaysOnTop(value, 'normal'),
    autoResponse: (value) => agent.setAutoResponse(value),
    autoScan: (value) => agent.setAutoScan(value),
    autoQueen: (value) => agent.setAutoQueen(value),
    isWhitePerspective: (value) => {
      board.setPerspective(value);
      game.setPerspective(value);
    },
    actionRegion: (value) => actionRegionManager.setActive(value),
    analysisDuration: (value) => engine.setAnalysisDuration(value),
    multiPV: (value) => engine.setMultiPV(value),
    engineThreads: (value) => engine.setThreads(value),
    mouseSpeed: (value) => { mouse.config.mouseSpeed = value; },
    region: (value) => {
      actionRegionManager.setRegion(value);
      board.setRegion(value);
      recognizer.setRegion(value);
    },
    enginePath: (value) => {
      if (!value) {
        engine.setProcess(engineWorker);
        engineExternal.kill();
        updateStatus('Ready');
      } else {
        const result = engineExternal.spawn(value);
        if (result) {
          engine.setProcess(engineExternal);
          updateStatus('Ready');
        } else {
          updateStatus('Failed to load external engine');
        }
      }
    }
  };
  for (const [name, listener] of Object.entries(preferenceListeners)) {
    preferenceManager.onUpdatePreference(name as Preference, listener);
  }
  ipcMain.on('preference-value', (_, name, value) => {
    preferenceManager.setPreference(name, value);
  });
  ipcMain.on('piece-dropped', (_, value) => {
    const { sourceSquare, targetSquare } = value;
    agent.processMove(sourceSquare+targetSquare);
  });
  ipcMain.on('piece-dropped-edit', (_, value) => agent.putPiece(value));
  ipcMain.on('promote-to', (_, value) => agent.promoteTo(value));
  ipcMain.on('send-to-engine', (_, name, data) => {
    if (name === 'internal') {
      engineWorker.send(data);
    } else if (name === 'external') {
      engineExternal.send(data);
    }
  });
  ipcMain.on('set-position', (_, value) => agent.loadPosition(value));
  ipcMain.on('set-position-info', (_, value) => agent.loadPositionInfo(value));
  ipcMain.handle('new-region', () => regionManager.selectNewRegion());
  ipcMain.handle('show-region', () => regionManager.showRegion());
  ipcMain.handle('remove-region', () => regionManager.setRegion(null));
  ipcMain.handle('load-hashes', handleLoadHashes);
  ipcMain.handle('scan-move', () => agent.scanMove());
  ipcMain.handle('skip-move', () => agent.skipMove());
  ipcMain.handle('undo-move', () => agent.undoMove());
  ipcMain.handle('best-move', () => agent.playBestMove());
  ipcMain.handle('reset-position', () => agent.resetPosition());
  ipcMain.handle('clear-position', () => agent.clearPosition());
  ipcMain.handle('recognize-board', () => agent.recognizeBoard());
  ipcMain.handle('dialog-engine', async () => {
    const result = await dialog.showOpenDialog({ properties: ['openFile'] });
    if (result.filePaths.length > 0) {
      preferenceManager.setPreference('enginePath', result.filePaths[0]);
    }
  });
  updateStatus('Ready');
  while (true) {
    const move = await board.detectMove();
    agent.processMove(move);
  }
})();

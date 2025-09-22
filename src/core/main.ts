import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import { mouse } from '@nut-tree-fork/nut-js';
import path from 'path';
import { fileURLToPath } from 'url';
import ActionRegionManager from './modules/ActionRegionManager.ts';
import Agent from './modules/Agent.ts';
import Board from './modules/Board.ts';
import Engine from './modules/engine/Engine.ts';
import EngineExternal from './modules/engine/EngineExternal.ts';
import EngineInternal from './modules/engine/EngineInternal.ts';
import Game from './modules/Game.ts';
import PreferenceManager from './modules/PreferenceManager.ts';
import Recognizer from './modules/Recognizer.ts';
import RegionManager from './modules/RegionManager.ts';
import { actionNames, actionRegions, defaultVariables } from '../config.ts';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const preloadPath = path.join(dirname, 'preload.js');

async function createWindow(): Promise<BrowserWindow> {
  const win = new BrowserWindow({
    width: 400,
    height: 600,
    icon: 'images/chess-icon.png',
    resizable: false,
    webPreferences: {
      preload: preloadPath
    }
  });
  win.removeMenu();
  await win.loadURL('http://localhost:5173/src/app/main/');
  return win;
}

async function createEngineWindow(): Promise<BrowserWindow> {
  const win = new BrowserWindow({
    minWidth: 320,
    minHeight: 320,
    show: false,
    icon: 'images/chess-icon.png',
    webPreferences: {
      preload: preloadPath
    }
  });
  win.addListener('close', (e) => {
    win.hide();
    e.preventDefault();
  });
  win.removeMenu();
  await win.loadURL('http://localhost:5173/src/app/engine/');
  return win;
}

function getRegionSelector(position: string): (region: Region) => Region {
  const index = Number(position[1]);
  if (position[0] === 'N') {
    return ({ left, top, width, height }) => ({
      left: left+width*(index-1)/8,
      top: top-height/16,
      width: width/8,
      height: height/16
    });
  }
  if (position[0] === 'S') {
    return ({ left, top, width, height }) => ({
      left: left+width*(index-1)/8,
      top: top+height,
      width: width/8,
      height: height/16
    });
  }
  if (position[0] === 'W') {
    return ({ left, top, width, height }) => ({
      left: left-width/16,
      top: top+height*(index-1)/8,
      width: width/16,
      height: height/8
    });
  }
  return ({ left, top, width, height }) => ({
    left: left+width,
    top: top+height*(index-1)/8,
    width: width/16,
    height: height/8
  });
}

(async () => {
  const preferenceManager = new PreferenceManager();
  preferenceManager.loadFromFile('config.json');
  await app.whenReady();
  const win = await createWindow();
  let appRunning = true;
  win.once('close', () => {
    if (preferenceManager.getPreference('saveConfigToFile')) {
      preferenceManager.saveToFile('config.json');
    }
    appRunning = false;
    app.quit();
  });
  const engineWin = await createEngineWindow();
  const sendToApp = (channel: string, ...args: unknown[]) => {
    if (appRunning) {
      win.webContents.send(channel, ...args);
      engineWin.webContents.send(channel, ...args);
    }
  }
  const updateStatus = (status: string) => {
    console.log(status);
    sendToApp('update-variable', 'status', status);
  };
  const board = new Board();
  board.onMove((move) => agent.processMove(move));
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
  engineExternal.addListener('exit', (code) => {
    updateStatus('Please reload the engine');
    sendToApp('engine-data', 'external-event', 'exit');
    sendToApp('engine-data', 'external', `Exit code: ${code}`);
    for (const name of ['highlightMoves', 'principalVariations', 'engineInfo']) {
      sendToApp('update-variable', name, defaultVariables[name as Variable]);
    }
  });
  const spawnExternalEngine = (path: string) => {
    if (engineExternal.spawn(path)) {
      engine.setProcess(engineExternal);
      sendToApp('engine-data', 'external-event', 'start');
      updateStatus('Ready');
    } else {
      sendToApp('engine-data', 'external-event', 'exit');
      updateStatus('Failed to load external engine');
    }
  };
  const engineInternal = new EngineInternal();
  engineInternal.addListener('stdin', (data) => {
    sendToApp('engine-data', 'internal', '<<< '+data);
  });
  engineInternal.addListener('stdout', (data) => {
    sendToApp('engine-data', 'internal', '>>> '+data);
  });
  engineInternal.addListener('stderr', (data) => {
    sendToApp('engine-data', 'internal', '!>> '+data);
  });
  const engine = new Engine();
  engine.onPrincipalMoves((value) => {
    const moves = value.map((x) => x.split(' ').slice(0, 3));
    const variations = value.map((x) => game.formatEvalMoves(x));
    sendToApp('update-variable', 'highlightMoves', moves);
    sendToApp('update-variable', 'principalVariations', variations);
  });
  engine.onEngineInfo((value) => {
    sendToApp('update-variable', 'engineInfo', value);
  });
  const game = new Game();
  game.onUpdatePosition((value) => {
    sendToApp('update-variable', 'positionInfo', game.getPositionInfo());
    sendToApp('update-variable', 'positionFEN', value);
  });
  game.reset();
  const recognizer = new Recognizer();
  const agent = new Agent({ engine, game, recognizer });
  agent.onUpdateStatus(updateStatus);
  agent.onBestMove((move) => {
    if (preferenceManager.getPreference('region')) {
      board.playMove(move);
    } else {
      updateStatus('Select region first to play moves');
    }
  });
  agent.onPromotion(() => sendToApp('promotion'));
  const actionCallbacks: Record<Action, () => void> = {
    newRegion: () => void regionManager.selectNewRegion(),
    showRegion: () => regionManager.showRegion(),
    removeRegion: () => regionManager.setRegion(null),
    loadHashes: () => {
      const perspective = preferenceManager.getPreference('perspective');
      recognizer.load(perspective).then(
        () => updateStatus('Loaded piece hashes'),
        () => updateStatus('Failed to load piece hashes'));
    },
    scanMove: () => void agent.scanMove(),
    skipMove: () => agent.skipMove(),
    undoMove: () => agent.undoMove(),
    bestMove: () => agent.playBestMove(),
    resetPosition: () => agent.resetPosition(),
    clearPosition: () => agent.clearPosition(),
    recognizeBoard: () => agent.recognizeBoard(),
    dialogEngine: async () => {
      const result = await dialog.showOpenDialog(engineWin, {
        properties: ['openFile']
      });
      if (result.filePaths.length > 0) {
        preferenceManager.setPreference('enginePath', result.filePaths[0]);
      }
    },
    reloadEngine: () => {
      const path = preferenceManager.getPreference('enginePath');
      if (path) {
        spawnExternalEngine(path);
      }
    },
    showEngine: () => engineWin.show(),
    promoteQueen: () => agent.promoteTo('q'),
    promoteRook: () => agent.promoteTo('r'),
    promoteBishop: () => agent.promoteTo('b'),
    promoteKnight: () => agent.promoteTo('n')
  };
  const preferenceTogglers: Partial<Record<Preference, () => void>> = {
    autoResponse: () => {
      const autoResponse = !preferenceManager.getPreference('autoResponse');
      preferenceManager.setPreference('autoResponse', autoResponse);
      updateStatus(`Auto response is ${autoResponse ? 'on' : 'off'}`);
    },
    perspective: () => {
      const isWhite = !preferenceManager.getPreference('perspective');
      preferenceManager.setPreference('perspective', isWhite);
      updateStatus(`${isWhite ? 'White' : 'Black'} perspective`);
    },
    draggingMode: () => {
      const draggingMode = !preferenceManager.getPreference('draggingMode');
      preferenceManager.setPreference('draggingMode', draggingMode);
      updateStatus(`${draggingMode ? 'Dragging' : 'Clicking'} mode`);
    },
    analysisDuration: () => {
      const duration = preferenceManager.getPreference('analysisDuration');
      const newDuration = duration > 300 ? 300 : 5000;
      preferenceManager.setPreference('analysisDuration', newDuration);
      updateStatus(`Analysis duration: ${newDuration} ms`);
    }
  };
  const actionRegionManager = new ActionRegionManager();
  for (const name of actionNames) {
    const regionLocation = actionRegions[name];
    if (regionLocation) {
      actionRegionManager.addActionRegion({
        callback: actionCallbacks[name],
        regionSelector: getRegionSelector(regionLocation)
      });
    }
  }
  for (const name of Object.keys(preferenceTogglers) as Preference[]) {
    actionRegionManager.addActionRegion({
      callback: preferenceTogglers[name]!,
      regionSelector: getRegionSelector(actionRegions[name]!)
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
    sendToApp('update-variable', 'regionStatus', value);
  });
  regionManager.setRegion(preferenceManager.getPreference('region'));
  preferenceManager.onUpdate((name, value) => {
    sendToApp('update-preference', name, value);
  });
  const preferenceListeners: Partial<PreferenceListeners> = {
    alwaysOnTop: (value) => {
      win.setAlwaysOnTop(value, 'normal');
      engineWin.setAlwaysOnTop(value, 'normal');
    },
    autoResponse: (value) => agent.setAutoResponse(value),
    autoScan: (value) => agent.setAutoScan(value),
    autoQueen: (value) => agent.setAutoQueen(value),
    perspective: (value) => {
      board.setPerspective(value);
      game.setPerspective(value);
    },
    draggingMode: (value) => board.setDraggingMode(value),
    actionRegion: (value) => actionRegionManager.setActive(value),
    analysisDuration: (value) => engine.setAnalysisDuration(value),
    multiPV: (value) => engine.setOption('multiPV', value),
    engineThreads: (value) => engine.setOption('threads', value),
    mouseSpeed: (value) => { mouse.config.mouseSpeed = value; },
    region: (value) => {
      actionRegionManager.setRegion(value);
      board.setRegion(value);
      recognizer.setRegion(value);
    },
    enginePath: (value) => {
      if (!value) {
        engine.setProcess(engineInternal);
        engineExternal.kill();
        updateStatus('Ready');
      } else {
        spawnExternalEngine(value);
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
      engineInternal.send(data);
    } else if (name === 'external') {
      engineExternal.send(data);
    }
  });
  ipcMain.on('set-position', (_, value) => agent.loadPosition(value));
  ipcMain.on('set-position-info', (_, value) => agent.loadPositionInfo(value));
  ipcMain.on('action', (_, value) => actionCallbacks[value as Action]());
  updateStatus('Ready');
})();

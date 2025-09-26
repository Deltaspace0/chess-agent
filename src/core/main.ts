import { app, BrowserWindow, dialog, ipcMain, Menu, screen } from 'electron';
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
import { PhysicalMouse } from './modules/Mouse.ts';
import { defaultVariables, possibleLocations } from '../config.ts';
import { selectRegion } from '../util.ts';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const preloadPath = path.join(dirname, 'preload.js');

async function createWindow(): Promise<BrowserWindow> {
  const win = new BrowserWindow({
    minWidth: 300,
    minHeight: 400,
    width: 380,
    height: 580,
    icon: 'images/chess-icon.png',
    useContentSize: true,
    webPreferences: {
      preload: preloadPath
    }
  });
  await win.loadURL('http://localhost:5173/src/app/main/');
  return win;
}

async function createEngineWindow(): Promise<BrowserWindow> {
  const win = new BrowserWindow({
    minWidth: 320,
    minHeight: 320,
    show: false,
    icon: 'images/chess-icon.png',
    useContentSize: true,
    webPreferences: {
      preload: preloadPath
    }
  });
  await win.loadURL('http://localhost:5173/src/app/engine/');
  return win;
}

async function createRegionWindow(parent: BrowserWindow): Promise<BrowserWindow> {
  const primaryDisplay = screen.getPrimaryDisplay();
  const win = new BrowserWindow({
    parent,
    alwaysOnTop: true,
    center: true,
    frame: false,
    width: primaryDisplay.size.width-4,
    height: primaryDisplay.size.height,
    resizable: false,
    show: false,
    skipTaskbar: true,
    transparent: true,
    webPreferences: {
      preload: preloadPath
    }
  });
  await win.loadURL('http://localhost:5173/src/app/region/');
  return win;
}

async function createActionWindow(parent: BrowserWindow): Promise<BrowserWindow> {
  const win = new BrowserWindow({
    parent,
    modal: true,
    minimizable: false,
    maximizable: false,
    resizable: false,
    width: 320,
    height: 320,
    show: false,
    icon: 'images/chess-icon.png',
    useContentSize: true,
    webPreferences: {
      preload: preloadPath
    }
  });
  await win.loadURL('http://localhost:5173/src/app/action/');
  return win;
}

(async () => {
  Menu.setApplicationMenu(null);
  const mouse = new PhysicalMouse();
  const preferenceManager = new PreferenceManager();
  preferenceManager.loadFromFile('config.json');
  await app.whenReady();
  const win = await createWindow();
  let appRunning = true;
  win.addListener('close', () => {
    if (preferenceManager.getPreference('saveConfigToFile')) {
      preferenceManager.saveToFile('config.json');
    }
    appRunning = false;
    app.quit();
  });
  const engineWin = await createEngineWindow();
  engineWin.addListener('close', (e) => {
    engineWin.hide();
    e.preventDefault();
  });
  const regionWin = await createRegionWindow(win);
  const hideRegionWindow = () => {
    regionWin.hide();
    win.show();
    mouse.setActive(true);
  };
  regionWin.addListener('close', (e) => {
    hideRegionWindow();
    e.preventDefault();
  });
  const actionWin = await createActionWindow(regionWin);
  actionWin.addListener('close', (e) => {
    actionWin.hide();
    e.preventDefault();
  });
  const sendToApp = (channel: string, ...args: unknown[]) => {
    if (appRunning) {
      win.webContents.send(channel, ...args);
      engineWin.webContents.send(channel, ...args);
      regionWin.webContents.send(channel, ...args);
      actionWin.webContents.send(channel, ...args);
    }
  }
  const updateStatus = (status: string) => {
    console.log(status);
    sendToApp('update-variable', 'status', status);
  };
  const board = new Board(mouse);
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
    showRegion: () => {
      regionWin.show();
      mouse.setActive(false);
    },
    hideRegion: () => hideRegionWindow(),
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
    promoteKnight: () => agent.promoteTo('n'),
    autoResponse: () => {
      const value = preferenceManager.togglePreference('autoResponse');
      updateStatus(`Auto response is ${value ? 'enabled' : 'disabled'}`);
    },
    perspective: () => {
      const value = preferenceManager.togglePreference('perspective');
      updateStatus(`${value ? 'White' : 'Black'} perspective`);
    },
    draggingMode: () => {
      const value = preferenceManager.togglePreference('draggingMode');
      updateStatus(`${value ? 'Dragging' : 'Clicking'} mode`);
    },
    actionRegion: () => {
      const value = preferenceManager.togglePreference('actionRegion');
      updateStatus(`Action regions are ${value ? 'enabled' : 'disabled'}`);
    },
    analysisDuration: () => {
      const duration = preferenceManager.getPreference('analysisDuration');
      const newDuration = duration > 300 ? 300 : 5000;
      preferenceManager.setPreference('analysisDuration', newDuration);
      updateStatus(`Analysis duration: ${newDuration} ms`);
    }
  };
  const actionRegionManager = new ActionRegionManager(mouse);
  for (const location of possibleLocations) {
    actionRegionManager.addActionRegion({
      callback: () => {
        const locations = preferenceManager.getPreference('actionLocations');
        const action = locations[location];
        if (action) {
          actionCallbacks[action]();
        }
      },
      getRegion: () => {
        const region = preferenceManager.getPreference('region');
        if (!region) {
          return null;
        }
        return selectRegion(region, location);
      }
    });
  }
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
    mouseSpeed: (value) => mouse.setSpeed(value),
    region: (value) => {
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
  ipcMain.on('edit-action-location', (_, value) => {
    sendToApp('update-variable', 'editedActionLocation', value);
    actionWin.show();
  });
  ipcMain.on('action', (_, value) => actionCallbacks[value as Action]());
  updateStatus('Ready');
})();

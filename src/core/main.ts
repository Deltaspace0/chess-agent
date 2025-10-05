import { app, BrowserWindow, dialog, ipcMain, Menu, screen } from 'electron';
import path from 'path';
import ActionRegionManager from './modules/ActionRegionManager.ts';
import { Agent } from './modules/Agent.ts';
import Board from './modules/Board.ts';
import Engine from './modules/engine/Engine.ts';
import EngineExternal from './modules/engine/EngineExternal.ts';
import EngineInternal from './modules/engine/EngineInternal.ts';
import Game from './modules/Game.ts';
import PreferenceManager from './modules/PreferenceManager.ts';
import Recognizer from './modules/Recognizer.ts';
import { ConcreteMouse } from './modules/device/Mouse.ts';
import { ConcreteScreen, getAdjustedRegion } from './modules/device/Screen.ts';
import { defaultVariables, possibleLocations } from '../config.ts';
import { selectRegion } from '../util.ts';

const preloadPath = path.join(import.meta.dirname, 'preload.js');
const iconPath = 'images/chess-icon.png';

async function createWindow(): Promise<BrowserWindow> {
  const win = new BrowserWindow({
    maximizable: false,
    minWidth: 240,
    minHeight: 240,
    width: 380,
    height: 580,
    maxWidth: 480,
    maxHeight: 640,
    icon: iconPath,
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
    icon: iconPath,
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
    minWidth: 320,
    width: 320,
    maxWidth: 320,
    minHeight: 100,
    height: 320,
    show: false,
    icon: iconPath,
    useContentSize: true,
    webPreferences: {
      preload: preloadPath
    }
  });
  await win.loadURL('http://localhost:5173/src/app/action/');
  return win;
}

async function createSettingsWindow(parent: BrowserWindow): Promise<BrowserWindow> {
  const win = new BrowserWindow({
    parent,
    modal: true,
    minimizable: false,
    resizable: false,
    width: 280,
    height: 240,
    show: false,
    icon: iconPath,
    useContentSize: true,
    webPreferences: {
      preload: preloadPath
    }
  });
  await win.loadURL('http://localhost:5173/src/app/settings/');
  return win;
}

(async () => {
  Menu.setApplicationMenu(null);
  const mouse = new ConcreteMouse();
  const screen = new ConcreteScreen();
  const preferenceManager = new PreferenceManager();
  await app.whenReady();
  const win = await createWindow();
  let appRunning = true;
  win.addListener('close', () => {
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
  regionWin.addListener('show', () => {
    setTimeout(() => regionWin.setOpacity(1), 100);
  });
  regionWin.addListener('hide', () => regionWin.setOpacity(0));
  regionWin.addListener('close', (e) => {
    hideRegionWindow();
    e.preventDefault();
  });
  const actionWin = await createActionWindow(regionWin);
  actionWin.addListener('close', (e) => {
    actionWin.hide();
    e.preventDefault();
  });
  const settingsWin = await createSettingsWindow(win);
  settingsWin.addListener('close', (e) => {
    settingsWin.hide();
    e.preventDefault();
  });
  const sendToApp = (channel: string, ...args: unknown[]) => {
    if (appRunning) {
      win.webContents.send(channel, ...args);
      engineWin.webContents.send(channel, ...args);
      regionWin.webContents.send(channel, ...args);
      actionWin.webContents.send(channel, ...args);
      settingsWin.webContents.send(channel, ...args);
    }
  };
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
    updateStatus('Engine has been closed');
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
  const reloadExternalEngine = () => {
    const path = preferenceManager.getPreference('enginePath');
    if (path) {
      spawnExternalEngine(path);
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
  const recognizer = new Recognizer(screen);
  const agent = new Agent({ engine, game, recognizer });
  const playBestMove = async () => {
    if (preferenceManager.getPreference('region')) {
      const move = await agent.findBestMove();
      if (move) {
        board.playMove(move);
      }
    }
  };
  agent.onUpdateStatus(updateStatus);
  agent.onMove(() => {
    if (!preferenceManager.getPreference('region')) {
      return;
    }
    if (preferenceManager.getPreference('autoResponse') && game.isMyTurn()) {
      playBestMove();
    } else if (preferenceManager.getPreference('autoScan')) {
      agent.scanMove();
    }
  });
  agent.onPromotion(() => {
    if (preferenceManager.getPreference('autoQueen')) {
      agent.promoteTo('q');
    } else {
      sendToApp('promotion');
    }
  });
  const actionCallbacks: Record<Action, () => void> = {
    showRegion: () => {
      regionWin.show();
      mouse.setActive(false);
    },
    hideRegion: () => hideRegionWindow(),
    loadHashes: () => {
      const perspective = preferenceManager.getPreference('perspective');
      recognizer.load(perspective)
        .then(() => updateStatus('Loaded piece hashes'))
        .catch((e) => {
          updateStatus('Failed to load piece hashes');
          console.log(e);
        });
    },
    scanMove: () => void agent.scanMove(),
    skipMove: () => agent.skipMove(),
    undoMove: () => agent.undoMove(),
    bestMove: () => playBestMove(),
    resetPosition: () => {
      agent.resetPosition();
      if (!engineExternal.isRunning()) {
        reloadExternalEngine();
      }
    },
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
    reloadEngine: () => reloadExternalEngine(),
    showEngine: () => engineWin.show(),
    showSettings: () => settingsWin.show(),
    loadConfig: async () => {
      const result = await dialog.showOpenDialog(settingsWin, {
        properties: ['openFile'],
        filters: [{ name: 'Configuration file', extensions: ['json'] }]
      });
      if (result.filePaths.length > 0) {
        preferenceManager.loadFromFile(result.filePaths[0]);
        updateStatus('Loaded configuration file');
        settingsWin.hide();
      }
    },
    saveConfig: async () => {
      const result = await dialog.showSaveDialog(settingsWin, {
        properties: ['createDirectory'],
        filters: [{ name: 'Configuration file', extensions: ['json'] }]
      });
      if (result.filePath) {
        preferenceManager.saveToFile(result.filePath);
        updateStatus('Saved configuration file');
        settingsWin.hide();
      }
    },
    resetConfig: () => preferenceManager.reset(),
    adjustRegion: async () => {
      const adjustedRegion = await getAdjustedRegion(screen);
      preferenceManager.setPreference('region', adjustedRegion);
    },
    promoteQueen: () => agent.promoteTo('q'),
    promoteRook: () => agent.promoteTo('r'),
    promoteBishop: () => agent.promoteTo('b'),
    promoteKnight: () => agent.promoteTo('n'),
    autoResponse: () => {
      const value = preferenceManager.togglePreference('autoResponse');
      updateStatus(`Auto response is ${value ? 'enabled' : 'disabled'}`);
    },
    autoScan: () => {
      const value = preferenceManager.togglePreference('autoScan');
      updateStatus(`Auto scan is ${value ? 'enabled' : 'disabled'}`);
    },
    autoQueen: () => {
      const value = preferenceManager.togglePreference('autoQueen');
      updateStatus(`Auto queen is ${value ? 'enabled' : 'disabled'}`);
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
      const value = preferenceManager.getPreference('analysisDuration');
      const newValue = value > 300 ? 300 : 5000;
      preferenceManager.setPreference('analysisDuration', newValue);
      updateStatus(`Analysis duration: ${newValue} ms`);
    },
    mouseSpeed: () => {
      const value = preferenceManager.getPreference('mouseSpeed');
      const newValue = value > 500 ? 500 : 10000;
      preferenceManager.setPreference('mouseSpeed', newValue);
      updateStatus(`Mouse speed: ${newValue}`);
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
    perspective: (value) => {
      board.setPerspective(value);
      game.setPerspective(value);
    },
    draggingMode: (value) => board.setDraggingMode(value),
    actionRegion: (value) => actionRegionManager.setActive(value),
    analysisDuration: (value) => engine.setOption('duration', value),
    multiPV: (value) => engine.setOption('multiPV', value),
    engineThreads: (value) => engine.setOption('threads', value),
    mouseSpeed: (value) => mouse.setSpeed(value),
    region: (value) => {
      board.setRegion(value);
      screen.setRegion(value);
    },
    enginePath: (value) => {
      if (!value) {
        engine.setProcess(engineInternal);
        engineExternal.kill();
        updateStatus('Ready');
      } else {
        spawnExternalEngine(value);
        engineInternal.kill();
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

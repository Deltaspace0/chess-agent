import { app, BrowserWindow, dialog, ipcMain, Menu, screen } from 'electron';
import { saveImage, type Image } from '@nut-tree-fork/nut-js';
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
const iconPath = path.join(import.meta.dirname,
  '..', '..', 'images', 'chess-icon.png');
const appPath = app.isPackaged ? 'dist/src/app' : 'http://localhost:5173/src/app';

async function createMainWindow(): Promise<BrowserWindow> {
  const win = new BrowserWindow({
    alwaysOnTop: true,
    maximizable: false,
    minWidth: 300,
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
  const pagePath = `${appPath}/main/index.html`;
  if (app.isPackaged) {
    await win.loadFile(pagePath);
  } else {
    await win.loadURL(pagePath);
  }
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
  const pagePath = `${appPath}/engine/index.html`;
  if (app.isPackaged) {
    await win.loadFile(pagePath);
  } else {
    await win.loadURL(pagePath);
  }
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
  const pagePath = `${appPath}/region/index.html`;
  if (app.isPackaged) {
    await win.loadFile(pagePath);
  } else {
    await win.loadURL(pagePath);
  }
  return win;
}

async function createActionWindow(parent: BrowserWindow): Promise<BrowserWindow> {
  const win = new BrowserWindow({
    parent,
    modal: true,
    minimizable: false,
    maximizable: false,
    minWidth: 360,
    width: 360,
    maxWidth: 360,
    minHeight: 100,
    height: 320,
    show: false,
    icon: iconPath,
    useContentSize: true,
    webPreferences: {
      preload: preloadPath
    }
  });
  const pagePath = `${appPath}/action/index.html`;
  if (app.isPackaged) {
    await win.loadFile(pagePath);
  } else {
    await win.loadURL(pagePath);
  }
  return win;
}

async function createSettingsWindow(parent: BrowserWindow): Promise<BrowserWindow> {
  const win = new BrowserWindow({
    parent,
    modal: true,
    minimizable: false,
    resizable: false,
    width: 280,
    height: 280,
    show: false,
    icon: iconPath,
    useContentSize: true,
    webPreferences: {
      preload: preloadPath
    }
  });
  const pagePath = `${appPath}/settings/index.html`;
  if (app.isPackaged) {
    await win.loadFile(pagePath);
  } else {
    await win.loadURL(pagePath);
  }
  return win;
}

function debounce<T>(callback: (x: T) => void) {
  let value: T;
  let sending = false;
  return (x: T) => {
    value = x;
    if (!sending) {
      sending = true;
      setTimeout(() => {
        callback(value);
        sending = false;
      }, 50);
    }
  };
}

(async () => {
  Menu.setApplicationMenu(null);
  const mouse = new ConcreteMouse();
  const screen = new ConcreteScreen();
  const preferenceManager = new PreferenceManager();
  await app.whenReady();
  mouse.start();
  const mainWin = await createMainWindow();
  let appRunning = true;
  mainWin.addListener('close', () => {
    appRunning = false;
    app.quit();
  });
  const engineWin = await createEngineWindow();
  engineWin.addListener('close', (e) => {
    if (!appRunning) {
      return;
    }
    engineWin.hide();
    e.preventDefault();
  });
  const regionWin = await createRegionWindow(mainWin);
  regionWin.addListener('show', () => {
    mouse.setActive(false);
    setTimeout(() => regionWin.setOpacity(1), 100);
  });
  regionWin.addListener('close', (e) => {
    if (!appRunning) {
      return;
    }
    regionWin.hide();
    regionWin.setOpacity(0);
    mainWin.show();
    mouse.setActive(true);
    e.preventDefault();
  });
  const actionWin = await createActionWindow(regionWin);
  actionWin.addListener('close', (e) => {
    if (!appRunning) {
      return;
    }
    actionWin.hide();
    regionWin.show();
    e.preventDefault();
  });
  const settingsWin = await createSettingsWindow(mainWin);
  settingsWin.addListener('show', () => mouse.setActive(false));
  settingsWin.addListener('close', (e) => {
    if (!appRunning) {
      return;
    }
    settingsWin.hide();
    mainWin.show();
    mouse.setActive(true);
    e.preventDefault();
  });
  const sendToApp = (channel: string, ...args: unknown[]) => {
    if (appRunning) {
      mainWin.webContents.send(channel, ...args);
      engineWin.webContents.send(channel, ...args);
      regionWin.webContents.send(channel, ...args);
      actionWin.webContents.send(channel, ...args);
      settingsWin.webContents.send(channel, ...args);
    }
  };
  const updateVariable = <T extends Variable>(name: T, value?: Variables[T]) => {
    sendToApp('update-variable', name, value);
  };
  const updateStatus = (status: string) => {
    console.log(status);
    updateVariable('status', status);
  };
  const sendEngineData = (name: string, data: string) => {
    updateVariable('engineData', { name, data });
  }
  mouse.addListener('mousemove', async () => {
    const region = preferenceManager.getPreference('region');
    if (!region) {
      updateVariable('mousePosition', defaultVariables.mousePosition);
      return;
    }
    if (!preferenceManager.getPreference('showCursor')) {
      return;
    }
    const coordinates = await mouse.getPosition();
    updateVariable('mousePosition', {
      x: (coordinates.x-region.left)/region.width,
      y: (coordinates.y-region.top)/region.height
    });
  });
  const board = new Board(mouse);
  board.onMove((move) => agent.processMove(move));
  board.onMouseDownSquare(() => recognizer.stopScanning());
  const engineExternal = new EngineExternal();
  engineExternal.addListener('stdin', (data) => {
    sendEngineData('external', '<<< '+data);
  });
  engineExternal.addListener('stdout', (data) => {
    sendEngineData('external', '>>> '+data);
  });
  engineExternal.addListener('stderr', (data) => {
    sendEngineData('external', '!>> '+data);
  });
  engineExternal.addListener('exit', (code) => {
    updateStatus('Engine has been closed');
    sendEngineData('external-event', 'exit');
    sendEngineData('external', `Exit code: ${code}`);
    const variableNames: Variable[] = [
      'highlightMoves',
      'principalVariations',
      'engineInfo'
    ]
    for (const name of variableNames) {
      updateVariable(name, defaultVariables[name]);
    }
  });
  const spawnExternalEngine = (path: string) => {
    if (engineExternal.spawn(path)) {
      engine.setProcess(engineExternal);
      sendEngineData('external-event', 'start');
      updateStatus('Ready');
    } else {
      sendEngineData('external-event', 'exit');
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
    sendEngineData('internal', '<<< '+data);
  });
  engineInternal.addListener('stdout', (data) => {
    sendEngineData('internal', '>>> '+data);
  });
  engineInternal.addListener('stderr', (data) => {
    sendEngineData('internal', '!>> '+data);
  });
  const engine = new Engine();
  engine.onPrincipalMoves(debounce((value) => {
    const moves = value.map((x) => x.split(' ').slice(0, 3));
    const variations = value.map((x) => game.formatEvalMoves(x));
    updateVariable('highlightMoves', moves);
    updateVariable('principalVariations', variations);
  }));
  engine.onEngineInfo(debounce((value) => {
    updateVariable('engineInfo', value);
  }));
  const game = new Game();
  game.onUpdatePosition((value) => {
    updateVariable('positionInfo', game.getPositionInfo());
    updateVariable('positionFEN', value);
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
      updateVariable('promotion');
    }
  });
  const actionCallbacks: Record<Action, () => void> = {
    showRegion: () => regionWin.show(),
    hideRegion: () => regionWin.close(),
    hideAction: () => actionWin.close(),
    loadHashes: () => {
      const perspective = preferenceManager.getPreference('perspective');
      recognizer.load(perspective)
        .then((model) => {
          preferenceManager.setPreference('recognizerModel', model);
          updateStatus('Loaded piece hashes');
        })
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
    recognizeBoardSkipMove: () => agent.recognizeBoard(true),
    dialogEngine: async () => {
      mouse.setActive(false);
      const result = await dialog.showOpenDialog(engineWin, {
        properties: ['openFile']
      });
      mouse.setActive(true);
      if (result.filePaths.length > 0) {
        preferenceManager.setPreference('enginePath', result.filePaths[0]);
      }
    },
    reloadEngine: () => reloadExternalEngine(),
    showEngine: () => engineWin.show(),
    showSettings: () => settingsWin.show(),
    hideSettings: () => settingsWin.close(),
    loadConfig: async () => {
      mouse.setActive(false);
      const result = await dialog.showOpenDialog(settingsWin, {
        properties: ['openFile'],
        filters: [{ name: 'Configuration file', extensions: ['json'] }]
      });
      mouse.setActive(true);
      if (result.filePaths.length > 0) {
        preferenceManager.loadFromFile(result.filePaths[0]);
        updateStatus('Loaded configuration file');
        settingsWin.hide();
      }
    },
    saveConfig: async () => {
      mouse.setActive(false);
      const result = await dialog.showSaveDialog(settingsWin, {
        properties: ['createDirectory'],
        filters: [{ name: 'Configuration file', extensions: ['json'] }]
      });
      mouse.setActive(true);
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
    savePicture: async () => {
      mouse.setActive(false);
      const amount = preferenceManager.getPreference('screenshotLength');
      if (amount > 1) {
        const images: Image[] = [];
        for (let i = 0; i < amount; i++) {
          await screen.sleep(50);
          const image = await screen.getImage();
          images.push(image);
        }
        const result = await dialog.showOpenDialog(mainWin, {
          properties: ['createDirectory', 'openDirectory']
        });
        if (result.filePaths.length > 0) {
          const directory = result.filePaths[0];
          for (let i = 0; i < images.length; i++) {
            const image = images[i];
            const imagePath = path.join(directory, `${i}.png`);
            await saveImage({ image, path: imagePath});
          }
          updateStatus('Saved screenshots');
        }
      } else {
        const image = await screen.getImage();
        const result = await dialog.showSaveDialog(mainWin, {
          properties: ['createDirectory'],
          filters: [{ name: 'Picture', extensions: ['png'] }]
        });
        if (result.filePath) {
          await saveImage({ image, path: result.filePath });
          updateStatus('Saved screenshot');
        }
      }
      mouse.setActive(true);
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
  actionRegionManager.onHover((name?: string) => {
    if (!name) {
      updateVariable('hoveredAction');
      return;
    }
    const locations = preferenceManager.getPreference('actionLocations');
    const action = locations[name as keyof ActionLocations];
    updateVariable('hoveredAction', action);
  });
  for (const location of possibleLocations) {
    actionRegionManager.addActionRegion({
      name: location,
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
      mainWin.setAlwaysOnTop(value, 'normal');
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
        engineInternal.refresh();
        engine.setProcess(engineInternal);
        engineExternal.kill();
        updateStatus('Ready');
      } else {
        spawnExternalEngine(value);
      }
    },
    recognizerModel: (value) => recognizer.setModel(value),
    recognizerPutKings: (value) => recognizer.setPutKings(value)
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
    updateVariable('editedActionLocation', value);
    actionWin.show();
  });
  ipcMain.on('action', (_, value) => actionCallbacks[value as Action]());
  updateStatus('Ready');
})();

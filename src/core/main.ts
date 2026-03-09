import {
  app,
  dialog,
  ipcMain,
  screen as electronScreen,
  BrowserWindow,
  Menu,
  type BrowserWindowConstructorOptions
} from 'electron';
import { saveImage, type Image } from '@nut-tree-fork/nut-js';
import path from 'path';
import { uIOhook, UiohookKey } from 'uiohook-napi';
import ActionRegionManager from './modules/ActionRegionManager.ts';
import { Agent } from './modules/Agent.ts';
import Board from './modules/Board.ts';
import EngineUCI from './modules/engine/EngineUCI.ts';
import EngineExternal from './modules/engine/EngineExternal.ts';
import EngineInternal from './modules/engine/EngineInternal.ts';
import Game from './modules/game/Game.ts';
import PreferenceManager from './modules/PreferenceManager.ts';
import Recognizer from './modules/Recognizer.ts';
import { ConcreteMouse } from './modules/device/Mouse.ts';
import { ConcreteScreen, getAdjustedRegion } from './modules/device/Screen.ts';
import {
  booleanPreferenceNames,
  possibleLocations,
  preferenceConfig
} from '../config.ts';
import { findRegion } from '../util.ts';

const PATHS = {
  PRELOAD: path.join(import.meta.dirname, 'preload.js'),
  ICON: path.join(import.meta.dirname, '..', '..', 'images', 'chess-icon.png'),
  APP: app.isPackaged ? 'dist/src/app' : 'http://localhost:5173/src/app'
} as const;

const debounce = <T>(callback: (x: T) => void, delay = 50) => {
  let timeoutId: NodeJS.Timeout;
  let lastValue: T;
  return (value: T) => {
    lastValue = value;
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => callback(lastValue), delay);
  };
};

const createWindow = async (
  pageName: string,
  config: BrowserWindowConstructorOptions
): Promise<BrowserWindow> => {
  const win = new BrowserWindow({
    ...config,
    icon: PATHS.ICON,
    webPreferences: { preload: PATHS.PRELOAD }
  });
  const pagePath = `${PATHS.APP}/${pageName}/index.html`;
  await (app.isPackaged ? win.loadFile(pagePath) : win.loadURL(pagePath));
  return win;
};

(async () => {
  Menu.setApplicationMenu(null);
  await app.whenReady();

  const mainWin = await createWindow('main', {
    alwaysOnTop: true,
    maximizable: false,
    minWidth: 300,
    minHeight: 240,
    width: 380,
    height: 580,
    maxWidth: 480,
    useContentSize: true
  });

  mainWin.addListener('focus', () => {
    if (selectingRegion) {
      overlayWin.focus();
    }
    overlayWin.moveTop();
  });

  mainWin.addListener('close', () => {
    appRunning = false;
    app.quit();
  });

  const engineWin = await createWindow('engine', {
    minWidth: 320,
    minHeight: 320,
    show: false,
    useContentSize: true
  });

  engineWin.addListener('close', (e) => {
    if (!appRunning) {
      return;
    }
    engineWin.hide();
    e.preventDefault();
  });

  const overlayWin = await createWindow('overlay', {
    alwaysOnTop: true,
    center: true,
    frame: false,
    width: electronScreen.getPrimaryDisplay().size.width-4,
    height: electronScreen.getPrimaryDisplay().size.height,
    resizable: false,
    skipTaskbar: true,
    transparent: true
  });

  overlayWin.addListener('close', (e) => {
    if (!appRunning) {
      return;
    }
    mainWin.show();
    overlayWin.setIgnoreMouseEvents(true);
    unsuppressMouse();
    selectingRegion = false;
    sendSignal('selectingRegion', false);
    e.preventDefault();
  });

  overlayWin.setIgnoreMouseEvents(true);

  uIOhook.start();
  uIOhook.on('keyup', async (e) => {
    if (e.keycode === UiohookKey.CapsLock) {
      setMouseActive(false);
    }
  });

  const mouse = new ConcreteMouse();
  const screen = new ConcreteScreen();
  const preferenceManager = new PreferenceManager();
  const board = new Board(mouse);
  const engineExternal = new EngineExternal();
  const engineInternal = new EngineInternal();
  const engineUCI = new EngineUCI();
  const game = new Game();
  const recognizer = new Recognizer(screen);
  const agent = new Agent({ engine: engineUCI, game, recognizer });
  let wasMouseActive = true;
  let appRunning = true;
  let selectingRegion = false;

  const sendToApp = (channel: string, ...args: unknown[]) => {
    if (appRunning) {
      [mainWin, engineWin, overlayWin].forEach((win) =>
        win.webContents.send(channel, ...args)
      );
    }
  };

  const sendSignal = <T extends Signal>(name: T, value?: Signals[T]) =>
    sendToApp('signal', name, value);

  const updateStatus = (status: string) => {
    console.log(status);
    sendSignal('status', status);
  };

  const sendEngineData = (name: string, data: string) =>
    sendSignal('engineData', { name, data });

  const setMouseActive = (value: boolean) => {
    mouse.setActive(value);
    sendSignal('mouseActive', value);
  };

  const suppressMouse = () => {
    wasMouseActive = mouse.getActive();
    setMouseActive(false);
  };

  const unsuppressMouse = () => setMouseActive(wasMouseActive);

  const getPreference = <T extends Preference>(name: T) =>
    preferenceManager.getPreference(name);

  const syncPreference = <T extends Preference>(name: T, value: Preferences[T]) => {
    sendToApp('preference', name, value);
    preferenceListeners[name]?.(value);
  };

  const syncPreferences = () => {
    const preferences = preferenceManager.getPreferences();
    Object.entries(preferences).forEach(([name, value]) => {
      syncPreference(name as Preference, value);
    });
  };

  const setPreference = <T extends Preference>(name: T, value: Preferences[T]) => {
    preferenceManager.setPreference(name, value);
    syncPreference(name, value);
  };

  mouse.addListener('mousemove', async () => {
    const region = getPreference('region');
    if (!region) {
      sendSignal('mousePosition');
      return;
    }
    if (!getPreference('showCursor')) {
      return;
    }
    const coordinates = await mouse.getPosition();
    sendSignal('mousePosition', {
      x: (coordinates.x - region.left) / region.width,
      y: (coordinates.y - region.top) / region.height
    });
  });

  board.addListener('move', (move, sendResult) => {
    sendResult(agent.processMove(move));
  });
  board.addListener('promotion', (piece) => agent.promoteTo(piece));

  const handleEngineData = (source: string) => ({
    stdin: (data: string) => sendEngineData(source, '<<< ' + data),
    stdout: (data: string) => sendEngineData(source, '>>> ' + data),
    stderr: (data: string) => sendEngineData(source, '!>> ' + data)
  });

  const extHandlers = handleEngineData('external');
  engineExternal.addListener('stdin', extHandlers.stdin);
  engineExternal.addListener('stdout', extHandlers.stdout);
  engineExternal.addListener('stderr', extHandlers.stderr);
  engineExternal.addListener('exit', (code) => {
    updateStatus('Engine has been closed');
    sendEngineData('external-event', 'exit');
    sendEngineData('external', `Exit code: ${code}`);
    sendSignal('engineInfo');
  });

  const intHandlers = handleEngineData('internal');
  engineInternal.addListener('stdin', intHandlers.stdin);
  engineInternal.addListener('stdout', intHandlers.stdout);
  engineInternal.addListener('stderr', intHandlers.stderr);

  engineUCI.addListener('info', debounce((value) => {
    const pv = value.principalVariations.map((x) =>
      game.formatPrincipalVariation(x)
    );
    sendSignal('engineInfo', { ...value, principalVariations: pv });
  }));

  game.addListener('position', (value) => sendSignal('positionFEN', value));
  game.reset();

  agent.addListener('status', updateStatus);
  agent.addListener('moves', async () => {
    if (!getPreference('region')) {
      return;
    }
    const isMyTurn = game.isMyTurn();
    if (getPreference('autoResponse')) {
      if (isMyTurn) {
        updateStatus('Playing best move...');
        await playBestMove();
      } else if (getPreference('autoPremove')) {
        updateStatus('Playing premove...');
        await playPremove();
      }
    }
    if (getPreference('autoRecognition') && !isMyTurn) {
      updateStatus('Recognizing after move...');
      agent.recognizeBoardAfterMove();
    }
  });

  agent.addListener('promotion', (move) => {
    if (getPreference('autoQueen')) {
      agent.promoteTo('q');
    } else {
      sendSignal('promotion');
      board.setPromotionMove(move);
    }
  });

  const playMove = async (move: string) => {
    try {
      await board.playMove(move);
    } catch {
      updateStatus('Stopped mouse');
    }
  };

  const playBestMove = async () => {
    if (!getPreference('region')) {
      return;
    }
    const move = await agent.findBestMove();
    if (move) {
      await playMove(move);
      agent.processMove(move);
    }
  };

  const playPremove = async () => {
    const move = await agent.findBestMove();
    if (!move) {
      return;
    }
    engineUCI.analyzePosition([move], 1);
    const nextMove = await agent.findBestMove();
    if (nextMove) {
      await playMove(nextMove);
    }
  };

  const spawnExternalEngine = (path: string) => {
    if (engineExternal.spawn(path)) {
      engineUCI.setProcess(engineExternal);
      sendEngineData('external-event', 'start');
      updateStatus('Ready');
    } else {
      sendEngineData('external-event', 'exit');
      updateStatus('Failed to load external engine');
    }
  };

  const reloadExternalEngine = () => {
    const path = getPreference('enginePath');
    if (path) {
      spawnExternalEngine(path);
    }
  };

  const actionListeners: Partial<Record<Action, () => void>> = {
    selectRegion: () => {
      overlayWin.setIgnoreMouseEvents(false);
      overlayWin.show();
      suppressMouse();
      selectingRegion = true;
      sendSignal('selectingRegion', true);
    },
    hideRegion: () => overlayWin.close(),
    loadHashes: () => {
      if (!getPreference('region')) {
        return;
      }
      const perspective = getPreference('perspective');
      recognizer.load(perspective)
        .then((model) => {
          setPreference('recognizerModel', model);
          updateStatus('Loaded piece hashes');
        })
        .catch((e) => {
          updateStatus('Failed to load piece hashes');
          console.log(e);
        });
    },
    resetHashes: () => setPreference('recognizerModel', null),
    skipMove: () => agent.skipMove(),
    undoMove: () => agent.undoMove(),
    bestMove: playBestMove,
    resetPosition: () => {
      agent.resetPosition();
      if (!engineExternal.isRunning()) {
        reloadExternalEngine();
      }
    },
    clearPosition: () => agent.clearPosition(),
    recognizeBoard: () => {
      if (!getPreference('region')) {
        updateStatus('No region selected');
        return;
      }
      if (!getPreference('recognizerModel')) {
        updateStatus('Load hashes first');
        return;
      }
      agent.recognizeBoard();
    },
    recognizeBoardSkipMove: () => agent.recognizeBoard(true),
    recognizeBoardAfterMove: () => agent.recognizeBoardAfterMove(),
    dialogEngine: async () => {
      suppressMouse();
      const result = await dialog.showOpenDialog(engineWin, {
        properties: ['openFile']
      });
      unsuppressMouse();
      if (result.filePaths[0]) {
        setPreference('enginePath', result.filePaths[0]);
      }
    },
    reloadEngine: reloadExternalEngine,
    showEngine: () => engineWin.show(),
    loadConfig: async () => {
      suppressMouse();
      const result = await dialog.showOpenDialog(mainWin, {
        properties: ['openFile'],
        filters: [{ name: 'Configuration file', extensions: ['json'] }]
      });
      overlayWin.moveTop();
      unsuppressMouse();
      if (!result.filePaths[0]) {
        return;
      }
      try {
        preferenceManager.loadFromFile(result.filePaths[0]);
        syncPreferences();
        updateStatus('Loaded configuration file');
      } catch (e) {
        console.error(e);
        updateStatus('Failed to load configuration');
      }
    },
    saveConfig: async () => {
      suppressMouse();
      const result = await dialog.showSaveDialog(mainWin, {
        properties: ['createDirectory'],
        filters: [{ name: 'Configuration file', extensions: ['json'] }]
      });
      overlayWin.moveTop();
      unsuppressMouse();
      if (result.filePath) {
        preferenceManager.saveToFile(result.filePath);
        updateStatus('Saved configuration file');
      }
    },
    resetConfig: () => {
      preferenceManager.reset();
      syncPreferences();
    },
    adjustRegion: async () => {
      const adjustedRegion = await getAdjustedRegion(screen);
      setPreference('region', adjustedRegion);
    },
    savePicture: async () => {
      suppressMouse();
      const amount = getPreference('screenshotLength');
      try {
        if (amount > 1) {
          const images: Image[] = [];
          for (let i = 0; i < amount; i++) {
            await screen.sleep(50);
            images.push(await screen.getImage());
          }
          const result = await dialog.showOpenDialog(mainWin, {
            properties: ['createDirectory', 'openDirectory']
          });
          const directory = result.filePaths[0];
          if (directory) {
            await Promise.all(images.map((image, i) =>
              saveImage({ image, path: path.join(directory, `${i}.png`) })
            ));
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
      } finally {
        unsuppressMouse();
      }
    },
    promoteQueen: () => agent.promoteTo('q'),
    promoteRook: () => agent.promoteTo('r'),
    promoteBishop: () => agent.promoteTo('b'),
    promoteKnight: () => agent.promoteTo('n'),
    analysisDuration: () => switchPreference('analysisDuration'),
    mouseSpeed: () => switchPreference('mouseSpeed')
  };

  for (const name of booleanPreferenceNames) {
    actionListeners[name as Action] = () => {
      const value = !getPreference(name);
      setPreference(name, value);
      const prefConfig = preferenceConfig[name];
      const prefix = prefConfig.statusPrefix ?? (prefConfig.label + ': ');
      const valueText = value
        ? (prefConfig.statusOnTrue ?? 'enabled')
        : (prefConfig.statusOnFalse ?? 'disabled');
      updateStatus(`${prefix}${valueText}${prefConfig.statusSuffix ?? ''}`);
    };
  }

  const actionRegionManager = new ActionRegionManager(mouse);
  actionRegionManager.addListener('hover', (name?: string) =>
    sendSignal('hoveredAction', name)
  );

  for (const location of possibleLocations) {
    actionRegionManager.addActionRegion({
      name: location,
      listener: () => {
        const action = getPreference('actionLocations')[location];
        if (!action) {
          return;
        }
        const listener = actionListeners[action];
        if (!listener) {
          updateStatus('No listener for action: '+action);
          return;
        }
        listener();
      },
      getRegion: () => {
        const region = getPreference('region');
        return region ? findRegion(region, location) : null;
      }
    });
  }

  const preferenceListeners: Partial<PreferenceListeners> = {
    alwaysOnTop: (value) => {
      mainWin.setAlwaysOnTop(value, 'normal');
      engineWin.setAlwaysOnTop(value, 'normal');
      overlayWin.moveTop();
    },
    autoPromotion: (value) => board.setAutoPromotion(value),
    perspective: (value) => {
      board.setPerspective(value);
      game.setPerspective(value);
    },
    draggingMode: (value) => board.setDraggingMode(value),
    actionRegion: (value) => actionRegionManager.setActive(value),
    analysisDuration: (value) => engineUCI.setOption('duration', value),
    multiPV: (value) => engineUCI.setOption('multiPV', value),
    engineThreads: (value) => engineUCI.setOption('threads', value),
    engineLevel: (value) => engineUCI.setOption('skillLevel', value),
    mouseSpeed: (value) => mouse.setSpeed(value),
    region: (value) => {
      board.setRegion(value);
      screen.setRegion(value);
    },
    enginePath: (value) => {
      if (!value) {
        engineInternal.refresh();
        engineUCI.setProcess(engineInternal);
        engineExternal.kill();
        updateStatus('Ready');
      } else {
        spawnExternalEngine(value);
      }
    },
    recognizerModel: (value) => recognizer.setModel(value),
    recognizerPutKings: (value) => recognizer.setPutKings(value),
    autoCastling: (value) => game.setAutoCastling(value)
  };

  const switchPreference = <T extends Preference>(name: T) => {
    const prefConfig = preferenceConfig[name];
    const values = prefConfig.switchValues;
    if (!values) {
      return;
    }
    const currentValue = getPreference(name);
    const nextIndex = (values.indexOf(currentValue)+1)%values.length;
    const nextValue = values[nextIndex];
    setPreference(name, nextValue);
    const prefix = prefConfig.statusPrefix ?? (prefConfig.label+': ');
    updateStatus(`${prefix}${nextValue}${prefConfig.statusSuffix ?? ''}`);
  };

  const signalListeners: Partial<SignalListeners> = {
    pieceDropped: ({ sourceSquare, targetSquare }) =>
      agent.processMove(`${sourceSquare}${targetSquare}`),
    pieceDroppedEdit: (value) => agent.putPiece(value),
    engineData: ({ name, data }) => {
      if (name === 'internal') {
        engineInternal.send(data);
      } else if (name === 'external') {
        engineExternal.send(data);
      }
    },
    positionFEN: (value) => agent.loadPosition(value),
    action: (value) => actionListeners[value]?.(),
    requestPreference: (name) =>
      sendToApp('preference', name, getPreference(name)),
    registerMove: (move) => agent.processMove(move),
    mouseActive: setMouseActive
  };

  ipcMain.on('signal', <T extends Signal>(_: unknown, name: T, value: Signals[T]) => {
    const listener = signalListeners[name];
    if (!listener) {
      throw new Error('No signal listener for ' + name);
    }
    listener(value);
  });
  ipcMain.on('preference', (_, name, value) => setPreference(name, value));

  mainWin.show();
  syncPreferences();
  updateStatus('Ready');
})();

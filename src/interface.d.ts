import type { Piece } from 'chess.js';
import type { RecognizerModel } from './core/modules/Recognizer.ts';
import { possibleLocations } from './config.ts';

declare global {
  interface Region {
    left: number;
    top: number;
    width: number;
    height: number;
  }

  interface Point {
    x: number;
    y: number;
  }

  type Preference = keyof Preferences;

  type BooleanPreference = {
    [T in Preference]: Preferences[T] extends boolean ? T : never;
  }[Preference];

  type NumberPreference = {
    [T in Preference]: Preferences[T] extends number ? T : never;
  }[Preference];

  type PreferenceListeners = {
    [T in Preference]: (value: Preferences[T]) => void;
  };

  type Location = typeof possibleLocations[number];
  type ActionLocations = { [T in Location]?: Action; };

  interface Preferences {
    alwaysOnTop: boolean;
    autoResponse: boolean;
    autoScan: boolean;
    autoQueen: boolean;
    perspective: boolean;
    draggingMode: boolean;
    actionRegion: boolean;
    actionLocations: ActionLocations;
    showEvalBar: boolean;
    showArrows: boolean;
    showNotation: boolean;
    showCursor: boolean;
    analysisDuration: number;
    multiPV: number;
    engineThreads: number;
    mouseSpeed: number;
    region: Region | null;
    enginePath: string | null;
    screenshotLength: number;
    recognizerModel: RecognizerModel | null;
    recognizerPutKings: boolean;
  }

  interface PreferenceConfig<T extends Preference> {
    label: string;
    description?: string;
    defaultValue: Preferences[T];
    sliderValues?: Preferences[T] extends number ? number[] : never;
  }

  interface BoardState {
    move: string | null;
    grid: (Piece | null)[][];
  }

  interface EngineInfo {
    depth?: number;
    evaluation?: string;
    nodes?: number;
    nodesPerSecond?: number;
    time?: number;
    name?: string;
    author?: string;
  }

  interface PositionInfo {
    whiteCastlingRights: { k: boolean, q: boolean };
    blackCastlingRights: { k: boolean, q: boolean };
    isWhiteTurn: boolean;
  }

  interface DroppedPiece {
    sourceSquare: string | null;
    targetSquare: string | null;
    piece: string;
  }

  type Signal = keyof Signals;
  type SignalListeners = { [T in Signal]: (value: Signals[T]) => void };

  interface Signals {
    status: string;
    positionFEN: string;
    positionInfo: PositionInfo;
    engineData: { name: string, data: string };
    engineInfo?: EngineInfo;
    highlightMoves?: string[][];
    principalVariations?: string[];
    editActionLocation: Location;
    mousePosition?: Point;
    hoveredAction?: string;
    promotion: void;
    pieceDropped: DroppedPiece;
    pieceDroppedEdit: DroppedPiece;
    action: Action;
  }

  type ToggleablePreference = keyof Pick<Preferences
    , 'autoResponse'
    | 'autoScan'
    | 'autoQueen'
    | 'perspective'
    | 'draggingMode'
    | 'actionRegion'
    | 'analysisDuration'
    | 'mouseSpeed'
  >;

  type Action
    = ToggleablePreference
    | 'showRegion'
    | 'hideRegion'
    | 'hideAction'
    | 'loadHashes'
    | 'scanMove'
    | 'skipMove'
    | 'undoMove'
    | 'bestMove'
    | 'resetPosition'
    | 'clearPosition'
    | 'recognizeBoard'
    | 'recognizeBoardSkipMove'
    | 'dialogEngine'
    | 'reloadEngine'
    | 'showEngine'
    | 'showSettings'
    | 'hideSettings'
    | 'loadConfig'
    | 'saveConfig'
    | 'resetConfig'
    | 'adjustRegion'
    | 'savePicture'
    | 'promoteQueen'
    | 'promoteRook'
    | 'promoteBishop'
    | 'promoteKnight';

  interface IElectronAPI {
    onPreference<T extends Preference>(
      name: T,
      listener: PreferenceListeners[T]
    ): () => void;
    onSignal<T extends Signal>(
      name: T,
      listener: SignalListeners[T]
    ): () => void;
    setPreference<T extends Preference>(name: T, value: Preferences[T]);
    sendSignal<T extends Signal>(name: T, value: Signals[T]);
  }

  interface Window {
    electronAPI: IElectronAPI
  }
}

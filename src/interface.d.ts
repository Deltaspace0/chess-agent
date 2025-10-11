import type { Piece } from 'chess.js';
import { possibleLocations } from './config';

declare global {
  interface Region {
    left: number;
    top: number;
    width: number;
    height: number;
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
    analysisDuration: number;
    multiPV: number;
    engineThreads: number;
    mouseSpeed: number;
    region: Region | null;
    enginePath: string | null;
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

  type Variable = keyof Variables;
  type VariableListeners = { [T in Variable]: (value: Variables[T]) => void };

  interface Variables {
    status: string;
    positionFEN: string;
    positionInfo: PositionInfo;
    engineInfo: EngineInfo;
    highlightMoves: string[][];
    principalVariations: string[];
    editedActionLocation: Location;
  }

  interface DroppedPiece {
    sourceSquare: string | null;
    targetSquare: string | null;
    piece: string;
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
    onVariable<T extends Variable>(
      name: T,
      listener: VariableListeners[T]
    ): () => void;
    onPromotion(listener: () => void): () => void;
    onEngineData(listener: (name: string, data: string) => void): () => void;
    preferenceValue<T extends Preference>(name: T, value: Preferences[T]);
    pieceDropped(value: DroppedPiece);
    pieceDroppedEdit(value: DroppedPiece);
    sendToEngine(name: string, data: string);
    setPosition(value: string);
    setPositionInfo(value: PositionInfo);
    editActionLocation(value: Location);
    doAction(name: Action);
  }

  interface Window {
    electronAPI: IElectronAPI
  }
}

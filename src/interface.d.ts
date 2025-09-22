import type { Piece } from 'chess.js';

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

  type PreferenceListeners = { [T in Preference]: (value: Preferences[T]) => void };

  interface Preferences {
    alwaysOnTop: boolean;
    autoResponse: boolean;
    autoScan: boolean;
    autoQueen: boolean;
    perspective: boolean;
    draggingMode: boolean;
    actionRegion: boolean;
    showEvalBar: boolean;
    showArrows: boolean;
    showLines: boolean;
    showNotation: boolean;
    analysisDuration: number;
    multiPV: number;
    engineThreads: number;
    mouseSpeed: number;
    region: Region | null;
    saveConfigToFile: boolean;
    enginePath: string | null;
  }

  interface PreferenceConfig<T extends Preference> {
    label: string;
    defaultValue: Preferences[T];
    type: Preferences[T] extends boolean
      ? 'boolean' : Preferences[T] extends number ? 'number' : 'other';
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
  type RegionStatus = 'none' | 'exist' | 'selecting';

  interface Variables {
    status: string;
    regionStatus: RegionStatus;
    positionFEN: string;
    positionInfo: PositionInfo;
    engineInfo: EngineInfo;
    highlightMoves: string[][];
    principalVariations: string[];
  }

  interface DroppedPiece {
    sourceSquare: string | null;
    targetSquare: string | null;
    piece: string;
  }

  type Action = 'newRegion'
    | 'showRegion'
    | 'removeRegion'
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
    | 'promoteQueen'
    | 'promoteRook'
    | 'promoteBishop'
    | 'promoteKnight';

  interface IElectronAPI {
    onUpdatePreference<T extends Preference>(name: T, listener: PreferenceListeners[T]);
    onUpdateVariable<T extends Variable>(name: T, listener: VariableListeners[T]);
    onPromotion(listener: () => void);
    onEngineData(listener: (name: string, data: string) => void);
    preferenceValue<T extends Preference>(name: T, value: Preferences[T]);
    pieceDropped(value: DroppedPiece);
    pieceDroppedEdit(value: DroppedPiece);
    sendToEngine(name: string, data: string);
    setPosition(value: string);
    setPositionInfo(value: PositionInfo);
    doAction(name: Action);
  }

  interface Window {
    electronAPI: IElectronAPI
  }
}

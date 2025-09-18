import type { Region } from '@nut-tree-fork/nut-js';
import type { Piece } from 'chess.js';

declare global {
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

  type Preference = keyof Preferences;
  type BooleanPreference = {
    [T in Preference]: Preferences[T] extends boolean ? T : never;
  }[Preference];
  type NumberPreference = {
    [T in Preference]: Preferences[T] extends number ? T : never;
  }[Preference];
  type PreferenceListeners = { [T in Preference]: (value: Preferences[T]) => void };
  type Listener<T> = (listener: (value: T) => void) => void;
  type RegionStatus = 'none' | 'exist' | 'selecting';

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

  interface IElectronAPI {
    onUpdatePreference<T extends Preference>(name: T, listener: PreferenceListeners[T]);
    onUpdateStatus: Listener<string>;
    onUpdateRegion: Listener<RegionStatus>;
    onUpdatePosition: Listener<string>;
    onUpdatePositionInfo: Listener<PositionInfo>;
    onUpdateEngineInfo: Listener<EngineInfo>;
    onHighlightMoves: Listener<string[][]>;
    onPrincipalVariations: Listener<string[]>;
    onPromotion: Listener<void>;
    onEngineData(listener: (name: string, data: string) => void);
    preferenceValue<T extends Preference>(name: T, value: Preferences[T]);
    pieceDropped(value: DroppedPiece);
    pieceDroppedEdit(value: DroppedPiece);
    promoteTo(value: string);
    sendToEngine(name: string, data: string);
    setPosition(value: string);
    setPositionInfo(value: PositionInfo);
    newRegion();
    showRegion();
    removeRegion();
    loadHashes();
    scanMove();
    skipMove();
    undoMove();
    bestMove();
    resetPosition();
    clearPosition();
    recognizeBoard();
    dialogEngine();
    reloadEngine();
  }

  interface Window {
    electronAPI: IElectronAPI
  }
}

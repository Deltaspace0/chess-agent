import type { Region } from '@nut-tree-fork/nut-js';
import type { Square, Piece, PieceSymbol, Color } from 'chess.js';

type RegionStatus = 'none' | 'exist' | 'selecting';

interface Preferences {
  autoResponse: boolean;
  autoScan: boolean;
  isWhitePerspective: boolean;
  draggingMode: boolean;
  actionRegion: boolean;
  showEvalBar: boolean;
  showArrows: boolean;
  showLines: boolean;
  showNotation: boolean;
  analysisDuration: number;
  multiPV: number;
  mouseSpeed: number;
  region: Region | null;
  saveConfigToFile: boolean;
}

interface BoardState {
  move: string | null;
  squares: [number, number][];
  grid: (Piece | null)[][];
}

type Preference = keyof Preferences;
type PreferenceListeners = { [T in Preference]: (value: Preferences[T]) => void };
type Listener<T> = (listener: (value: T) => void) => void;

interface IElectronAPI {
  onUpdatePreference<T extends Preference>(name: T, listener: PreferenceListeners[T]);
  onUpdateStatus: Listener<string>;
  onUpdateRegion: Listener<RegionStatus>;
  onUpdatePosition: Listener<string>;
  onEvaluation: Listener<string>;
  onHighlightMoves: Listener<string[][]>;
  onPrincipalVariations: Listener<string[]>;
  preferenceValue<T extends Preference>(name: T, value: Preferences[T]);
  pieceDropped(value: string);
  newRegion();
  showRegion();
  removeRegion();
  loadHashes();
  scanMove();
  skipMove();
  undoMove();
  bestMove();
  resetPosition();
  recognizeBoard();
}

declare global {
  interface Window {
    electronAPI: IElectronAPI
  }
}

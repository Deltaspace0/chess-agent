import type { Square, PieceSymbol, Color } from 'chess.js';

type RegionStatus = 'none' | 'exist' | 'selecting';
type Listener<T> = (callback: (value: T) => void) => void;
type Value<T> = (value: T) => void;

interface IElectronAPI {
  onUpdateStatus: Listener<string>;
  onUpdateAutoResponse: Listener<boolean>;
  onUpdateAutoScan: Listener<boolean>;
  onUpdatePerspective: Listener<boolean>;
  onUpdateDragging: Listener<boolean>;
  onUpdateRegion: Listener<RegionStatus>;
  onUpdateDuration: Listener<number>;
  onUpdatePosition: Listener<string>;
  onEvaluation: Listener<string>;
  onHighlightMoves: Listener<string[][]>;
  onPrincipalVariations: Listener<string[]>;
  autoResponseValue: Value<boolean>;
  autoScanValue: Value<boolean>;
  perspectiveValue: Value<boolean>;
  draggingValue: Value<boolean>;
  durationValue: Value<number>;
  multiPVValue: Value<number>;
  mouseSpeedValue: Value<number>;
  actionRegionValue: Value<boolean>;
  pieceDropped: Value<string>;
  newRegion: () => void;
  showRegion: () => void;
  removeRegion: () => void;
  loadHashes: () => void;
  scanMove: () => void;
  skipMove: () => void;
  undoMove: () => void;
  bestMove: () => void;
  resetPosition: () => void;
  recognizeBoard: () => void;
}

declare global {
  interface Window {
    electronAPI: IElectronAPI
  }
}

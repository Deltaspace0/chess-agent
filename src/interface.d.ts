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
  onUpdateActionRegion: Listener<boolean>;
  onUpdateShowEvalBar: Listener<boolean>;
  onUpdateShowArrows: Listener<boolean>;
  onUpdateShowLines: Listener<boolean>;
  onUpdateShowNotation: Listener<boolean>;
  onUpdateRegion: Listener<RegionStatus>;
  onUpdateDuration: Listener<number>;
  onUpdateMultiPV: Listener<number>;
  onUpdateMouseSpeed: Listener<number>;
  onUpdatePosition: Listener<string>;
  onEvaluation: Listener<string>;
  onHighlightMoves: Listener<string[][]>;
  onPrincipalVariations: Listener<string[]>;
  autoResponseValue: Value<boolean>;
  autoScanValue: Value<boolean>;
  perspectiveValue: Value<boolean>;
  draggingValue: Value<boolean>;
  actionRegionValue: Value<boolean>;
  showEvalBarValue: Value<boolean>;
  showArrowsValue: Value<boolean>;
  showLinesValue: Value<boolean>;
  showNotationValue: Value<boolean>;
  durationValue: Value<number>;
  multiPVValue: Value<number>;
  mouseSpeedValue: Value<number>;
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

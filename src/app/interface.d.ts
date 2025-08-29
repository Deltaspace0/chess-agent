import type { Square, PieceSymbol, Color } from 'chess.js';

interface SquarePiece {
  square: Square;
  type: PieceSymbol;
  color: Color
}

type RegionSelection = 'first' | 'new' | 'none';

interface IElectronAPI {
  onUpdateStatus: (callback: (value: string) => void) => void;
  onUpdateAutoResponse: (callback: (value: boolean) => void) => void;
  onUpdatePerspective: (callback: (value: boolean) => void) => void;
  onUpdateDragging: (callback: (value: boolean) => void) => void;
  onUpdateRegion: (callback: (value: RegionSelection) => void) => void;
  onUpdateDuration: (callback: (value: number) => void) => void;
  onUpdatePosition: (callback: (value: (SquarePiece | null)[]) => void) => void;
  onEvaluation: (callback: (value: string) => void) => void;
  autoResponseValue: (value: boolean) => void;
  perspectiveValue: (value: boolean) => void;
  draggingValue: (value: boolean) => void;
  durationValue: (value: number) => void;
  mouseSpeedValue: (value: number) => void;
  actionRegionValue: (value: boolean) => void;
  newRegion: () => void;
  reloadHashes: () => void;
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

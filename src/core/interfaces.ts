import type { Piece } from 'chess.js';

export interface BoardState {
  move: string | null;
  squares: [number, number][];
  grid: (Piece | null)[][];
}

export interface PerspectiveProvider {
  getPerspective(): boolean;
}

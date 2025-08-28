import { Chess } from 'chess.js';
import type { Color, Piece, PieceSymbol, Square } from 'chess.js';

interface SquarePiece {
  square: Square;
  type: PieceSymbol;
  color: Color
}

class Game {
  private chess: Chess;
  private chessPieces: (SquarePiece | null)[] = Array(64).fill(null);
  private positionCallback = () => this.updateChessPieces();

  constructor() {
    this.chess = new Chess();
  }

  private updateChessPieces() {
    const nextChessPieces: (SquarePiece | null)[] = [];
    const lostPieces: [number, SquarePiece][] = [];
    const grid = this.chess.board();
    const accountedPiecesGrid: boolean[][] = [];
    for (let i = 0; i < 8; i++) {
      accountedPiecesGrid.push(Array(8).fill(false));
    }
    for (const piece of this.chessPieces) {
      if (piece === null) {
        nextChessPieces.push(null);
        continue;
      }
      const row = 8-Number(piece.square[1]);
      const col = 'abcdefgh'.indexOf(piece.square[0]);
      const newPiece = grid[row][col];
      if (newPiece === null) {
        lostPieces.push([nextChessPieces.length, piece]);
        nextChessPieces.push(null);
        continue;
      }
      if (newPiece.type !== piece.type || newPiece.color !== piece.color) {
        nextChessPieces.push(null);
        continue;
      }
      nextChessPieces.push(piece);
      accountedPiecesGrid[row][col] = true;
    }
    const newPieces: SquarePiece[] = [];
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        if (accountedPiecesGrid[i][j]) {
          continue;
        }
        const piece = grid[i][j];
        if (piece === null) {
          continue;
        }
        let foundPiece = false;
        for (let k = 0; k < lostPieces.length; k++) {
          const [index, lostPiece] = lostPieces[k];
          if (lostPiece.type === piece.type && lostPiece.color === piece.color) {
            nextChessPieces[index] = piece;
            lostPieces.splice(k, 1);
            foundPiece = true;
            break;
          }
        }
        if (!foundPiece) {
          newPieces.push(piece);
        }
      }
    }
    for (const piece of newPieces) {
      nextChessPieces[nextChessPieces.indexOf(null)] = piece;
    }
    this.chessPieces = nextChessPieces;
  }

  ascii() {
    return this.chess.ascii();
  }

  clear() {
    this.chess.clear();
    this.positionCallback();
  }

  fen(): string {
    return this.chess.fen();
  }

  get(square: Square): Piece | undefined {
    return this.chess.get(square);
  }

  isGameOver(): boolean {
    return this.chess.isGameOver();
  }

  put(piece: Piece, square: Square): boolean {
    const result = this.chess.put(piece, square);
    if (result) {
      this.positionCallback();
    }
    return result;
  }

  reset(): void {
    this.chess.reset();
    this.positionCallback();
  }

  turn(): Color {
    return this.chess.turn();
  }

  undo(): void {
    this.chess.undo();
    this.positionCallback();
  }

  move(move: string): boolean {
    try {
      this.chess.move(move);
    } catch (e) {
      return false;
    }
    this.positionCallback();
    return true;
  }

  setTurn(color: Color): boolean {
    try {
      this.chess.setTurn(color);
    } catch (e) {
      return false;
    }
    return true;
  }

  isLegalMove(move: string): boolean {
    try {
      this.chess.move(move);
    } catch (e) {
      return false;
    }
    this.chess.undo();
    return true;
  }

  onUpdatePosition(callback: (grid: (SquarePiece | null)[]) => void) {
    this.positionCallback = () => {
      this.updateChessPieces();
      callback(this.chessPieces);
    };
  }
}

export default Game;

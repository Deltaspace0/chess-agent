import { Chess } from 'chess.js';
import type { Color, Piece, Square } from 'chess.js';
import type { BoardState } from '../../interface';
import { coordsToSquare, squareToCoords } from '../util.ts';
import { defaultValues } from '../../config.ts';

interface GameOptions {
  perspective?: boolean;
}

class Game {
  private chess: Chess;
  private perspective: boolean;
  private positionCallback = () => {};

  constructor(options?: GameOptions) {
    this.chess = new Chess();
    this.perspective = options?.perspective ?? defaultValues.isWhitePerspective;
  }

  private getPerspectiveColor(): Color {
    return 'bw'[Number(this.perspective)] as Color;
  }

  private setTurn(color: Color): boolean {
    try {
      this.chess.setTurn(color);
    } catch (e) {
      return false;
    }
    return true;
  }

  board(): (Piece | null)[][] {
    const board = this.chess.board();
    if (this.perspective) {
      return board;
    }
    return board.reverse().map((x) => x.reverse());
  }

  fen(): string {
    return this.chess.fen();
  }

  get(square: string): Piece | undefined {
    return this.chess.get(square as Square);
  }

  isGameOver(): boolean {
    return this.chess.isGameOver();
  }

  reset() {
    this.chess.reset();
    this.positionCallback();
  }

  undo() {
    this.chess.undo();
    this.positionCallback();
  }

  move(move: string): number | null {
    try {
      const moveObject = this.chess.move(move);
      this.positionCallback();
      if (moveObject.isPromotion()) {
        return -1;
      }
      if (moveObject.isEnPassant()) {
        return 3;
      }
      if (moveObject.isKingsideCastle() || moveObject.isQueensideCastle()) {
        return 4;
      }
      return 2;
    } catch (e) {
      return null;
    }
  }

  isMyTurn(): boolean {
    return this.chess.turn() === this.getPerspectiveColor();
  }

  setMyTurn(): boolean {
    return this.setTurn(this.getPerspectiveColor());
  }

  formatEvalMoves(input: string): string {
    const words = input.split(' ');
    const evaluation = Number(words[1]);
    const evalText = words[0] === 'mate' ? `M${evaluation}` : evaluation/100;
    const chess = new Chess();
    try {
      chess.load(this.chess.fen());
      for (const move of words.slice(2)) {
        chess.move(move);
      }
    } catch (e) {
      return '';
    }
    const headers = chess.getHeaders();
    for (const header in headers) {
      chess.setHeader(header, '');
    }
    return evalText+' '+chess.pgn({ newline: ' ' });
  }

  printBoard() {
    const ascii = this.chess.ascii()+'  ';
    if (this.perspective) {
      console.log(ascii);
      return;
    }
    console.log(ascii.split('').reverse().join(''));
  }

  getNextBoardStates(): BoardState[] {
    const boardStates = [];
    const moves = this.chess.moves({ verbose: true }).map((x) => x.lan);
    for (const move of moves) {
      this.chess.move(move);
      boardStates.push({
        move: move,
        squares: [
          squareToCoords(move.substring(0, 2), this.perspective),
          squareToCoords(move.substring(2), this.perspective)
        ],
        grid: this.board()
      });
      this.chess.undo();
    }
    return boardStates;
  }

  putPieces(pieces: [Piece, number, number][]) {
    this.chess.clear();
    for (const [piece, row, col] of pieces) {
      const square = coordsToSquare([row, col], this.perspective);
      const result = this.chess.put(piece, square as Square);
      if (!result) {
        const { type, color } = piece;
        console.log(`Failed to put ${type}${color} at ${square}`);
      }
    }
    this.positionCallback();
  }

  skipMove(): Color | null {
    const newColor = 'wb'[Number(this.chess.turn() === 'w')] as Color;
    const result = this.setTurn(newColor);
    return result ? newColor : null;
  }

  onUpdatePosition(callback: (fen: string) => void) {
    this.positionCallback = () => callback(this.chess.fen());
  }

  setPerspective(perspective: boolean) {
    this.perspective = perspective;
  }
}

export default Game;

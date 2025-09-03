import { Chess } from 'chess.js';
import type { Color, Piece, Square } from 'chess.js';

class Game {
  private chess: Chess;
  private positionCallback = () => {};

  constructor() {
    this.chess = new Chess();
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

  moves(): string[] {
    return this.chess.moves({ verbose: true }).map((x) => x.lan);
  }

  setTurn(color: Color): boolean {
    try {
      this.chess.setTurn(color);
    } catch (e) {
      return false;
    }
    return true;
  }

  boardAfterMove(move: string | null): (Piece | null)[][] {
    if (!move) {
      return this.chess.board();
    }
    this.chess.move(move);
    const grid = this.chess.board();
    this.chess.undo();
    return grid;
  }

  formatEvalMoves(input: string): string {
    const words = input.split(' ');
    const evaluation = Number(words[1]);
    const evalText = words[0] === 'mate' ? `M${evaluation}` : evaluation/100;
    const chess = new Chess();
    chess.load(this.chess.fen());
    try {
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

  onUpdatePosition(callback: (fen: string) => void) {
    this.positionCallback = () => callback(this.chess.fen());
  }
}

export default Game;

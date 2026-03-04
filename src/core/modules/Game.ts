import { Chess } from 'chess.js';
import type { Color, Piece, PieceSymbol, Square } from 'chess.js';
import type { AgentGame } from './Agent.ts';
import { coordsToSquare } from '../../util.ts';
import { preferenceConfig } from '../../config.ts';

class Game implements AgentGame {
  private chess: Chess;
  private perspective = preferenceConfig.perspective.defaultValue;
  private autoCastling = preferenceConfig.autoCastling.defaultValue;
  private positionCallback = () => {};

  constructor() {
    this.chess = new Chess();
  }

  private getPerspectiveColor(): Color {
    return 'bw'[Number(this.perspective)] as Color;
  }

  private getOppPerspectiveColor(): Color {
    return 'wb'[Number(this.perspective)] as Color;
  }

  private setTurn(color: Color): boolean {
    try {
      this.chess.setTurn(color);
    } catch {
      return false;
    }
    this.positionCallback();
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

  clear() {
    this.chess.clear();
    this.positionCallback();
  }

  undo() {
    this.chess.undo();
    this.positionCallback();
  }

  move(move: string): boolean {
    try {
      this.chess.move(move);
      this.positionCallback();
      return true;
    } catch {
      return false;
    }
  }

  load(fen: string) {
    this.chess.load(fen);
    this.positionCallback();
  }

  isLegalMove(move: string): boolean {
    try {
      this.chess.move(move);
      this.chess.undo();
    } catch {
      return false;
    }
    return true;
  }

  kingsExist(): boolean {
    if (this.chess.findPiece({ type: 'k', color: 'w' }).length === 0) {
      return false;
    }
    return this.chess.findPiece({ type: 'k', color: 'b' }).length > 0;
  }

  getPositionInfo(): PositionInfo {
    return {
      whiteCastlingRights: this.chess.getCastlingRights('w'),
      blackCastlingRights: this.chess.getCastlingRights('b'),
      isWhiteTurn: this.chess.turn() === 'w'
    };
  }

  setPositionInfo(info: PositionInfo): boolean {
    if (!this.chess.setCastlingRights('w', info.whiteCastlingRights)) {
      return false;
    }
    if (!this.chess.setCastlingRights('b', info.blackCastlingRights)) {
      return false;
    }
    return this.setTurn(info.isWhiteTurn ? 'w' : 'b');
  }

  isMyTurn(): boolean {
    return this.chess.turn() === this.getPerspectiveColor();
  }

  setMyTurn(): boolean {
    return this.setTurn(this.getPerspectiveColor());
  }

  setOppTurn(): boolean {
    return this.setTurn(this.getOppPerspectiveColor());
  }

  formatPrincipalVariation(pv: PrincipalVariation): PrincipalVariation {
    const evalWords = pv.evaluation.split(' ');
    const evalNumber = Number(evalWords[1]);
    const evalText = evalWords[0] === 'mate'
      ? `M${evalNumber}`
      : `${evalNumber/100}`;
    const chess = new Chess();
    try {
      chess.load(this.chess.fen());
      for (const move of pv.variation.split(' ')) {
        chess.move(move);
      }
    } catch {
      return pv;
    }
    const headers = chess.getHeaders();
    for (const header in headers) {
      chess.setHeader(header, '');
    }
    return { ...pv, pgn: evalText+' '+chess.pgn({ newline: ' ' }) };
  }

  findMovesForPieces(pieces: [Piece, number, number][]): string[] | null {
    const targetBoard: (Piece | null)[][] = [];
    for (let i = 0; i < 8; i++) {
      targetBoard.push(Array(8).fill(null));
    }
    for (const [piece, row, col] of pieces) {
      targetBoard[row][col] = piece;
    }
    const changedSquares = new Set<Square>();
    const sourceSquares = new Set<Square>();
    const startBoardState = this.board();
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        const type1 = startBoardState[i][j]?.type;
        const color1 = startBoardState[i][j]?.color;
        const type2 = targetBoard[i][j]?.type;
        const color2 = targetBoard[i][j]?.color;
        if (type1 !== type2 || color1 !== color2) {
          const square = coordsToSquare([i, j], this.perspective) as Square;
          changedSquares.add(square);
          sourceSquares.add(square);
        }
      }
    }
    if (changedSquares.size > 10) {
      return null;
    }
    const getPriority = (move: string) => {
      const hasSource = changedSquares.has(move.substring(0, 2) as Square);
      const hasTarget = changedSquares.has(move.substring(2, 4) as Square);
      return Number(hasSource)+Number(hasTarget);
    };
    const moves: string[] = [];
    const moveStack: string[][] = [];
    let iterations = 0;
    while (iterations < 50) {
      const boardState = this.board();
      iterations++;
      let targetReached = true;
      for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
          const type1 = boardState[i][j]?.type;
          const color1 = boardState[i][j]?.color;
          const type2 = targetBoard[i][j]?.type;
          const color2 = targetBoard[i][j]?.color;
          if (type1 !== type2 || color1 !== color2) {
            targetReached = false;
            break;
          }
        }
        if (!targetReached) {
          break;
        }
      }
      if (targetReached) {
        for (let i = 0; i < moves.length; i++) {
          this.chess.undo();
        }
        return moves;
      }
      const possibleMoves: string[] = [];
      for (const square of sourceSquares) {
        for (const move of this.chess.moves({ square, verbose: true })) {
          possibleMoves.push(move.lan);
        }
      }
      possibleMoves.sort((a, b) => getPriority(a)-getPriority(b));
      const nextMove = possibleMoves.pop();
      if (moveStack.length > 2 || !nextMove) {
        let finishSearch = true;
        while (moveStack.length) {
          const prevMove = moves.pop();
          this.chess.undo();
          sourceSquares.add(prevMove!.substring(2, 4) as Square);
          const move = moveStack[moveStack.length-1].pop();
          if (!move) {
            moveStack.pop();
            continue;
          }
          moves.push(move);
          this.chess.move(move);
          sourceSquares.add(move.substring(2, 4) as Square);
          finishSearch = false;
          break;
        }
        if (finishSearch) {
          return null;
        }
        continue;
      }
      moveStack.push(possibleMoves);
      moves.push(nextMove);
      this.chess.move(nextMove);
      sourceSquares.add(nextMove.substring(2, 4) as Square);
    }
    for (let i = 0; i < moves.length; i++) {
      this.chess.undo();
    }
    return null;
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
    if (this.autoCastling) {
      this.chess.setCastlingRights('w', { 'k': true, 'q': true });
      this.chess.setCastlingRights('b', { 'k': true, 'q': true });
    }
    this.positionCallback();
  }

  putPieceEdit({ sourceSquare, targetSquare, piece }: DroppedPiece): boolean {
    const chess = new Chess();
    chess.load(this.chess.fen(), { skipValidation: true });
    if (sourceSquare) {
      chess.remove(sourceSquare as Square);
    }
    if (targetSquare) {
      const result = chess.put({
        color: piece[0] as Color,
        type: piece[1].toLowerCase() as PieceSymbol
      }, targetSquare as Square);
      if (!result) {
        return false;
      }
    }
    const whiteKingPosition = chess.findPiece({ type: 'k', color: 'w' })[0];
    if (whiteKingPosition && chess.isAttacked(whiteKingPosition, 'b')) {
      try {
        chess.setTurn('w');
      } catch {
        return false;
      }
    }
    const blackKingPosition = chess.findPiece({ type: 'k', color: 'b' })[0];
    if (blackKingPosition && chess.isAttacked(blackKingPosition, 'w')) {
      try {
        chess.setTurn('b');
      } catch {
        return false;
      }
    }
    this.chess.load(chess.fen(), { skipValidation: true });
    if (this.autoCastling) {
      this.chess.setCastlingRights('w', { 'k': true, 'q': true });
      this.chess.setCastlingRights('b', { 'k': true, 'q': true });
    }
    this.positionCallback();
    return true;
  }

  skipMove(): Color | null {
    const newColor = this.chess.turn() === 'w' ? 'b' : 'w' as Color;
    const result = this.setTurn(newColor);
    return result ? newColor : null;
  }

  onUpdatePosition(callback: (fen: string) => void) {
    this.positionCallback = () => callback(this.chess.fen());
  }

  setPerspective(perspective: boolean) {
    this.perspective = perspective;
  }

  setAutoCastling(autoCastling: boolean) {
    this.autoCastling = autoCastling;
  }
}

export default Game;

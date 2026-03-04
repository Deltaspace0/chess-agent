import type { Color, Piece } from 'chess.js';
import { sleep } from '@nut-tree-fork/nut-js';

export interface AgentEngine {
  reset(fen?: string): void;
  clear(): void;
  undo(): string;
  sendMove(move: string, skipAnalysis?: boolean): string;
  getEngineInfo(): EngineInfo;
  onEngineInfo(callback: (value: EngineInfo) => void): void;
  offEngineInfo(callback: (value: EngineInfo) => void): void;
}

export interface AgentGame {
  fen(): string;
  get(square: string): Piece | undefined;
  isGameOver(): boolean;
  reset(): void;
  clear(): void;
  undo(): void;
  move(move: string): boolean;
  load(fen: string): void;
  isLegalMove(move: string): boolean;
  kingsExist(): boolean;
  setPositionInfo(info: PositionInfo): boolean;
  setMyTurn(): boolean;
  setOppTurn(): boolean;
  putPieces(pieces: [Piece, number, number][]): void;
  putPieceEdit(droppedPiece: DroppedPiece): boolean;
  skipMove(): Color | null;
  findMovesForPieces(pieces: [Piece, number, number][]): string[] | null;
}

export interface AgentRecognizer<T> {
  recognizeBoard(hashes?: T): Promise<[Piece, number, number][]>;
  isWaitingMove(): boolean;
  stopWaitingMove(): void;
  waitMove(): Promise<T>
}

interface AgentModules<T> {
  engine: AgentEngine;
  game: AgentGame;
  recognizer: AgentRecognizer<T>;
}

export class Agent<T> {
  private engine: AgentEngine;
  private game: AgentGame;
  private recognizer: AgentRecognizer<T>;
  private promotionMove: string = '';
  private stopBestMove: (() => void) | null = null;
  private moveCallback: (value: string[]) => void = () => {};
  private promotionCallback: (move: string) => void = () => {};
  private statusCallback: (status: string) => void = console.log;

  constructor(modules: AgentModules<T>) {
    this.engine = modules.engine;
    this.game = modules.game;
    this.recognizer = modules.recognizer;
  }

  private syncEngine() {
    if (this.game.kingsExist()) {
      this.engine.reset(this.game.fen());
    } else {
      this.engine.clear();
    }
  }

  private async recognizeDirect(hashes?: T): Promise<[Piece, number, number][]> {
    this.statusCallback('Recognizing board...');
    try {
      const pieces = await this.recognizer.recognizeBoard(hashes);
      return pieces;
    } catch (e) {
      console.error(e);
      this.statusCallback('Failed to recognize board');
      throw e;
    }
  }

  private processMoves(moves: string[]) {
    let gameOver = false;
    for (let i = 0; i < moves.length; i++) {
      this.game.move(moves[i]);
      gameOver = this.game.isGameOver();
      this.engine.sendMove(moves[i], i < moves.length-1 || gameOver);
    }
    this.recognizer.stopWaitingMove();
    if (gameOver) {
      this.statusCallback('Game is over');
    } else {
      this.statusCallback('Ready');
    }
    this.moveCallback(moves);
  }

  processMove(move: string): boolean {
    if (move === 'undo') {
      this.undoMove();
      this.moveCallback([move]);
      return true;
    }
    const piece = this.game.get(move.substring(0, 2));
    const isPromotion = '18'.includes(move[3]) && piece?.type === 'p';
    if (isPromotion && move.length < 5) {
      if (!this.game.isLegalMove(move+'q')) {
        this.statusCallback(`Illegal move: ${move}`);
        return false;
      }
      if (this.promotionMove.length === 5) {
        move = this.promotionMove;
      } else {
        this.promotionMove = move;
        this.promotionCallback(move);
        return true;
      }
    }
    this.promotionMove = '';
    if (!this.game.move(move)) {
      if (piece) {
        this.statusCallback(`Illegal move: ${move}`);
      }
      return false;
    }
    const gameOver = this.game.isGameOver();
    const moves = this.engine.sendMove(move, gameOver);
    console.log(`Moves: ${moves}`);
    this.recognizer.stopWaitingMove();
    if (gameOver) {
      this.statusCallback('Game is over');
      return true;
    }
    this.moveCallback([move]);
    return true;
  }

  async findBestMove(): Promise<string | null> {
    if (this.stopBestMove) {
      this.stopBestMove();
      return null;
    }
    if (this.game.isGameOver()) {
      return null;
    }
    let { bestMove, ponderMove } = this.engine.getEngineInfo();
    if (!bestMove) {
      this.statusCallback('Waiting for best move...');
      [bestMove, ponderMove] = await new Promise((resolve) => {
        const resolveInfo = (bestMove?: string, ponderMove?: string) => {
          this.engine.offEngineInfo(listener);
          resolve([bestMove, ponderMove]);
        };
        this.stopBestMove = () => resolveInfo();
        const listener = ({ bestMove, ponderMove }: EngineInfo) => {
          if (bestMove !== undefined) {
            resolveInfo(bestMove, ponderMove);
          }
        };
        this.engine.onEngineInfo(listener);
      });
    }
    this.stopBestMove = null;
    if (!bestMove) {
      this.statusCallback('Canceled best move');
      return null;
    }
    this.statusCallback(`Best move: ${bestMove}, ponder: ${ponderMove}`);
    if (bestMove !== null) {
      this.promotionMove = bestMove;
    }
    return bestMove;
  }

  async recognizeBoard(opponentToMove?: boolean, hashes?: T) {
    const pieces = await this.recognizeDirect(hashes);
    if (!opponentToMove) {
      const moves = this.game.findMovesForPieces(pieces);
      if (moves) {
        this.processMoves(moves);
        return;
      }
    }
    this.game.putPieces(pieces);
    const result = opponentToMove
      ? this.game.setOppTurn()
      : this.game.setMyTurn();
    if (result) {
      this.statusCallback('Ready');
    } else {
      this.statusCallback('Failed to set turn');
    }
    this.syncEngine();
    this.moveCallback([]);
  }

  async recognizeBoardAfterMove(opponentToMove?: boolean) {
    if (this.recognizer.isWaitingMove()) {
      return;
    }
    const waitPromise = this.recognizer.waitMove();
    if (!opponentToMove) {
      await sleep(50);
      const pieces = await this.recognizeDirect();
      const moves = this.game.findMovesForPieces(pieces);
      if (moves && moves.length) {
        this.processMoves(moves);
        return;
      }
    }
    this.statusCallback('Waiting for move...');
    try {
      const hashes = await waitPromise;
      return this.recognizeBoard(opponentToMove, hashes);
    } catch (e) {
      if (e instanceof Error && e.message === 'stop') {
        this.statusCallback('Stopped waiting');
      } else {
        console.log(e);
        this.statusCallback('Error during move waiting');
      }
    }
  }

  skipMove() {
    this.recognizer.stopWaitingMove();
    const result = this.game.skipMove();
    if (!result) {
      this.statusCallback(`Failed to skip turn`);
      return;
    }
    this.syncEngine();
    this.statusCallback(`${result === 'w' ? 'White' : 'Black'} to move`);
  }

  undoMove() {
    this.recognizer.stopWaitingMove();
    this.game.undo();
    const moves = this.engine.undo();
    console.log(`Moves: ${moves}`);
  }

  resetPosition() {
    this.recognizer.stopWaitingMove();
    this.game.reset();
    this.engine.reset();
    this.statusCallback('Reset');
  }

  clearPosition() {
    this.recognizer.stopWaitingMove();
    this.game.clear();
    this.syncEngine();
    this.statusCallback('Clear');
  }

  loadPosition(fen: string) {
    this.recognizer.stopWaitingMove();
    try {
      this.game.load(fen);
    } catch {
      this.statusCallback('Invalid FEN');
      return;
    }
    this.engine.reset(fen);
    this.statusCallback('New position');
  }

  loadPositionInfo(info: PositionInfo) {
    this.recognizer.stopWaitingMove();
    if (this.game.setPositionInfo(info)) {
      this.syncEngine();
    }
  }

  putPiece(droppedPiece: DroppedPiece) {
    this.recognizer.stopWaitingMove();
    if (this.game.putPieceEdit(droppedPiece)) {
      this.syncEngine();
    }
  }

  promoteTo(piece: string) {
    if (this.promotionMove) {
      this.processMove(this.promotionMove+piece);
    }
  }

  onMoves(callback: (value: string[]) => void) {
    this.moveCallback = callback;
  }

  onPromotion(callback: (move: string) => void) {
    this.promotionCallback = callback;
  }

  onUpdateStatus(callback: (status: string) => void) {
    this.statusCallback = callback;
  }
}

import type { Color, Piece } from 'chess.js';
import { sleep } from '@nut-tree-fork/nut-js';
import EventEmitter from 'events';

interface AgentEventMap {
  moves: [moves: string[]];
  promotion: [move: string];
  status: [status: string];
}

export interface AgentEngine {
  reset(fen?: string): void;
  clear(): void;
  undo(): string;
  sendMove(move: string, skipAnalysis?: boolean): string;
  getEngineInfo(): EngineInfo;
  addListener(event: 'info', listener: (value: EngineInfo) => void): void;
  removeListener(event: 'info', listener: (value: EngineInfo) => void): void;
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

export class Agent<T> extends EventEmitter<AgentEventMap> {
  private engine: AgentEngine;
  private game: AgentGame;
  private recognizer: AgentRecognizer<T>;
  private promotionMove: string = '';
  private stopBestMove: (() => void) | null = null;

  constructor(modules: AgentModules<T>) {
    super();
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
    this.emit('status', 'Recognizing board...');
    try {
      const pieces = await this.recognizer.recognizeBoard(hashes);
      return pieces;
    } catch (e) {
      console.error(e);
      this.emit('status', 'Failed to recognize board');
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
      this.emit('status', 'Game is over');
    } else {
      this.emit('status', 'Ready');
    }
    this.emit('moves', moves);
  }

  processMove(move: string): boolean {
    if (move === 'undo') {
      this.undoMove();
      this.emit('moves', [move]);
      return true;
    }
    const piece = this.game.get(move.substring(0, 2));
    const isPromotion = '18'.includes(move[3]) && piece?.type === 'p';
    if (isPromotion && move.length < 5) {
      if (!this.game.isLegalMove(move+'q')) {
        this.emit('status', `Illegal move: ${move}`);
        return false;
      }
      if (this.promotionMove.length === 5) {
        move = this.promotionMove;
      } else {
        this.promotionMove = move;
        this.emit('promotion', move);
        return true;
      }
    }
    this.promotionMove = '';
    if (!this.game.move(move)) {
      if (piece) {
        this.emit('status', `Illegal move: ${move}`);
      }
      return false;
    }
    const gameOver = this.game.isGameOver();
    const moves = this.engine.sendMove(move, gameOver);
    console.log(`Moves: ${moves}`);
    this.recognizer.stopWaitingMove();
    if (gameOver) {
      this.emit('status', 'Game is over');
      return true;
    }
    this.emit('moves', [move]);
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
      this.emit('status', 'Waiting for best move...');
      [bestMove, ponderMove] = await new Promise((resolve) => {
        const resolveInfo = (bestMove?: string, ponderMove?: string) => {
          this.engine.removeListener('info', listener);
          resolve([bestMove, ponderMove]);
        };
        this.stopBestMove = () => resolveInfo();
        const listener = ({ bestMove, ponderMove }: EngineInfo) => {
          if (bestMove !== undefined) {
            resolveInfo(bestMove, ponderMove);
          }
        };
        this.engine.addListener('info', listener);
      });
    }
    this.stopBestMove = null;
    if (!bestMove) {
      this.emit('status', 'Canceled best move');
      return null;
    }
    this.emit('status', `Best move: ${bestMove}, ponder: ${ponderMove}`);
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
      this.emit('status', 'Ready');
    } else {
      this.emit('status', 'Failed to set turn');
    }
    this.syncEngine();
    this.emit('moves', []);
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
    this.emit('status', 'Waiting for move...');
    try {
      const hashes = await waitPromise;
      return this.recognizeBoard(opponentToMove, hashes);
    } catch (e) {
      if (e instanceof Error && e.message === 'stop') {
        this.emit('status', 'Stopped waiting');
      } else {
        console.log(e);
        this.emit('status', 'Error during move waiting');
      }
    }
  }

  skipMove() {
    this.recognizer.stopWaitingMove();
    const result = this.game.skipMove();
    if (!result) {
      this.emit('status', `Failed to skip turn`);
      return;
    }
    this.syncEngine();
    this.emit('status', `${result === 'w' ? 'White' : 'Black'} to move`);
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
    this.emit('status', 'Reset');
  }

  clearPosition() {
    this.recognizer.stopWaitingMove();
    this.game.clear();
    this.syncEngine();
    this.emit('status', 'Clear');
  }

  loadPosition(fen: string) {
    this.recognizer.stopWaitingMove();
    try {
      this.game.load(fen);
    } catch {
      this.emit('status', 'Invalid FEN');
      return;
    }
    this.engine.reset(fen);
    this.emit('status', 'New position');
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
}

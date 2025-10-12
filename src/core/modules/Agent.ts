import type { Color, Piece } from 'chess.js';

export interface AgentEngine {
  reset(fen?: string): void;
  clear(): void;
  undo(): string;
  sendMove(move: string, skipAnalysis?: boolean): string;
  getBestMove(): string | null;
  getPonderMove(): string | null;
  onBestMove(callback: (value: string) => void): void;
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
  printBoard(): void;
  getNextBoardStates(): BoardState[];
  putPieces(pieces: [Piece, number, number][]): void;
  putPiece(droppedPiece: DroppedPiece): boolean;
  skipMove(): Color | null;
}

export interface AgentRecognizer {
  recognizeBoard(): Promise<[Piece, number, number][]>;
  isScanning(): boolean;
  stopScanning(): void;
  scanMove(boardStates: BoardState[]): Promise<string>;
}

interface AgentModules {
  engine: AgentEngine;
  game: AgentGame;
  recognizer: AgentRecognizer;
}

export class Agent {
  private engine: AgentEngine;
  private game: AgentGame;
  private recognizer: AgentRecognizer;
  private promotionMove: string = '';
  private stopBestMove: (() => void) | null = null;
  private afterMoveCallback: (value: string) => void = () => {};
  private promotionCallback: () => void = () => {};
  private statusCallback: (status: string) => void = console.log;

  constructor(modules: AgentModules) {
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

  processMove(move: string): boolean {
    if (move === 'undo') {
      this.undoMove();
      this.afterMoveCallback(move);
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
        this.promotionCallback();
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
    this.game.printBoard();
    if (gameOver) {
      this.statusCallback('Game is over');
      this.recognizer.stopScanning();
      return true;
    }
    this.afterMoveCallback(move);
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
    let move = this.engine.getBestMove();
    if (move === null) {
      this.statusCallback('Waiting for best move...');
      move = await new Promise((resolve) => {
        this.stopBestMove = () => resolve(null);
        this.engine.onBestMove(resolve);
      });
    }
    this.stopBestMove = null;
    if (move === null) {
      this.statusCallback('Canceled best move');
      return null;
    }
    const ponderMove = this.engine.getPonderMove();
    this.statusCallback(`Best move: ${move}, ponder: ${ponderMove}`);
    if (move !== null) {
      this.promotionMove = move;
    }
    return move;
  }

  async scanMove(): Promise<string | null> {
    if (this.recognizer.isScanning()) {
      this.recognizer.stopScanning();
      return null;
    }
    this.statusCallback('Scanning move');
    let move;
    try {
      const boardStates = this.game.getNextBoardStates();
      move = await this.recognizer.scanMove(boardStates);
    } catch (e) {
      if (e instanceof Error && e.message === 'no hashes') {
        this.statusCallback('Load hashes first');
      } else if (e instanceof Error && e.message === 'stop') {
        this.statusCallback('Stopped scanning');
      } else {
        console.log(e);
        this.statusCallback('Failed to scan move');
      }
      return null;
    }
    this.statusCallback(`Found move: ${move}`);
    this.processMove(move);
    return move;
  }

  async recognizeBoard() {
    this.statusCallback('Recognizing board...');
    let pieces;
    try {
      pieces = await this.recognizer.recognizeBoard();
    } catch (e) {
      if (e instanceof Error && e.message === 'no hashes') {
        this.statusCallback('Load hashes first');
      } else {
        console.log(e);
        this.statusCallback('Failed to recognize board');
      }
      return;
    }
    this.game.putPieces(pieces);
    const result = this.game.setMyTurn();
    if (result) {
      this.statusCallback('Ready');
    } else {
      this.statusCallback('Failed to set turn');
    }
    this.syncEngine();
    this.game.printBoard();
  }

  skipMove() {
    this.recognizer.stopScanning();
    const result = this.game.skipMove();
    if (!result) {
      this.statusCallback(`Failed to skip turn`);
      return;
    }
    this.syncEngine();
    this.statusCallback(`${result === 'w' ? 'White' : 'Black'} to move`);
  }

  undoMove() {
    this.recognizer.stopScanning();
    this.game.undo();
    const moves = this.engine.undo();
    console.log(`Moves: ${moves}`);
    this.game.printBoard();
  }

  resetPosition() {
    this.recognizer.stopScanning();
    this.game.reset();
    this.engine.reset();
    this.statusCallback('Reset');
  }

  clearPosition() {
    this.recognizer.stopScanning();
    this.game.clear();
    this.syncEngine();
    this.statusCallback('Clear');
  }

  loadPosition(fen: string) {
    this.recognizer.stopScanning();
    try {
      this.game.load(fen);
    } catch (e) {
      this.statusCallback('Invalid FEN');
      return;
    }
    this.engine.reset(fen);
    this.statusCallback('New position');
  }

  loadPositionInfo(info: PositionInfo) {
    this.recognizer.stopScanning();
    if (this.game.setPositionInfo(info)) {
      this.syncEngine();
    }
  }

  putPiece(droppedPiece: DroppedPiece) {
    this.recognizer.stopScanning();
    if (this.game.putPiece(droppedPiece)) {
      this.syncEngine();
    }
  }

  promoteTo(piece: string) {
    if (this.promotionMove) {
      this.processMove(this.promotionMove+piece);
    }
  }

  onMove(callback: (value: string) => void) {
    this.afterMoveCallback = callback;
  }

  onPromotion(callback: () => void) {
    this.promotionCallback = callback;
  }

  onUpdateStatus(callback: (status: string) => void) {
    this.statusCallback = callback;
  }
}

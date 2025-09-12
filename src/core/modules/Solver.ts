import Engine from './Engine.ts';
import Game from './Game.ts';
import Recognizer from './Recognizer.ts';
import StatusNotifier from './StatusNotifier.ts';
import { defaultValues } from '../../config.ts';

interface SolverOptions {
  engine: Engine;
  game: Game;
  recognizer: Recognizer;
  autoResponse?: boolean;
  autoScan?: boolean;
  autoQueen?: boolean;
}

class Solver extends StatusNotifier {
  private engine: Engine;
  private game: Game;
  private recognizer: Recognizer;
  private autoResponse: boolean;
  private autoScan: boolean;
  private autoQueen: boolean;
  private promotionMove: string = '';
  private stopBestMove: (() => void) | null = null;
  private bestMoveCallback: (value: string) => void = () => {};
  private promotionCallback: () => void = () => {};

  constructor(options: SolverOptions) {
    super();
    this.engine = options.engine;
    this.game = options.game;
    this.recognizer = options.recognizer;
    this.autoResponse = options.autoResponse ?? defaultValues.autoResponse;
    this.autoScan = options.autoScan ?? defaultValues.autoScan;
    this.autoQueen = options.autoQueen ?? defaultValues.autoQueen;
  }

  processMove(move: string) {
    const piece = this.game.get(move.substring(0, 2));
    const isPromotion = '18'.includes(move[3]) && piece?.type === 'p';
    if (isPromotion && move.length < 5) {
      if (this.promotionMove.length === 5) {
        move = this.promotionMove;
      } else if (this.autoQueen) {
        move += 'q';
      } else {
        this.promotionMove = move;
        this.promotionCallback();
        return;
      }
    }
    this.promotionMove = '';
    const result = this.game.move(move);
    if (!result) {
      if (piece) {
        this.statusCallback(`Illegal move: ${move}`);
      }
      return;
    }
    const gameOver = this.game.isGameOver();
    const moves = this.engine.sendMove(move, gameOver);
    console.log(`Moves: ${moves}`);
    this.game.printBoard();
    if (gameOver) {
      this.statusCallback('Game is over');
      this.recognizer.stopScanning();
      return;
    }
    if (this.autoResponse && this.game.isMyTurn()) {
      this.playBestMove();
    } else if (this.autoScan) {
      this.scanMove();
    }
  }

  async playBestMove() {
    if (this.stopBestMove) {
      this.stopBestMove();
      return;
    }
    if (this.game.isGameOver()) {
      return;
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
      return;
    }
    const ponderMove = this.engine.getPonderMove();
    this.statusCallback(`Best move: ${move}, ponder: ${ponderMove}`);
    if (move !== null) {
      this.promotionMove = move;
      this.bestMoveCallback(move);
    }
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
    this.engine.reset(this.game.fen());
    this.game.printBoard();
  }

  skipMove() {
    this.recognizer.stopScanning();
    const result = this.game.skipMove();
    if (!result) {
      this.statusCallback(`Failed to skip turn`);
      return;
    }
    this.engine.reset(this.game.fen());
    this.statusCallback(`${result === 'w' ? 'White' : 'Black'} to move`);
  }

  undoMove() {
    this.recognizer.stopScanning();
    this.game.undo();
    const moves = this.engine.undo();
    console.log(`Moves: ${moves}`);
    this.game.printBoard();
  }

  setAutoResponse(value: boolean) {
    this.autoResponse = value;
    this.statusCallback(`Auto response is ${value ? 'enabled' : 'disabled'}`);
  }

  setAutoScan(value: boolean) {
    this.autoScan = value;
    this.statusCallback(`Auto scan is ${value ? 'enabled' : 'disabled'}`);
  }

  setAutoQueen(value: boolean) {
    this.autoQueen = value;
    this.statusCallback(`Auto queen is ${value ? 'enabled' : 'disabled'}`);
  }

  resetPosition() {
    this.recognizer.stopScanning();
    this.game.reset();
    this.engine.reset();
    this.statusCallback('Reset');
  }

  promoteTo(piece: string) {
    if (this.promotionMove) {
      this.processMove(this.promotionMove+piece);
    }
  }

  onBestMove(callback: (value: string) => void) {
    this.bestMoveCallback = callback;
  }

  onPromotion(callback: () => void) {
    this.promotionCallback = callback;
  }
}

export default Solver;

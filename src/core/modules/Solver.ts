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
}

class Solver extends StatusNotifier {
  private engine: Engine;
  private game: Game;
  private recognizer: Recognizer;
  private autoResponse: boolean;
  private autoScan: boolean;
  private stopBestMove: (() => void) | null = null;
  private bestMoveCallback: (value: string) => void = () => {};

  constructor(options: SolverOptions) {
    super();
    this.engine = options.engine;
    this.game = options.game;
    this.recognizer = options.recognizer;
    this.autoResponse = options.autoResponse ?? defaultValues.autoResponse;
    this.autoScan = options.autoScan ?? defaultValues.autoScan;
  }

  processMove(move: string, scanned?: boolean) {
    const piece = this.game.get(move.substring(0, 2));
    if (move[3] === '1' || move[3] === '8') {
      if (piece && piece.type === 'p' && move.length < 5) {
        move += 'q';
      }
    }
    const squareCount = this.game.move(move);
    if (squareCount === null) {
      if (piece) {
        this.statusCallback(`Illegal move: ${move}`);
      }
      return;
    }
    const gameOver = this.game.isGameOver();
    const moves = this.engine.sendMove(move, gameOver);
    console.log(`Moves: ${moves}`);
    this.game.printBoard();
    const isMyTurn = this.game.isMyTurn();
    if (gameOver) {
      this.statusCallback('Game is over');
      this.recognizer.stopScanning();
    } else if (this.autoScan && !isMyTurn && squareCount !== -1) {
      this.scanMove(squareCount);
    } else if (this.autoScan && !this.autoResponse && scanned) {
      this.scanMove(squareCount);
    } else if (this.autoResponse && isMyTurn) {
      this.playBestMove();
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
      await this.recognizer.rememberBoard();
      this.bestMoveCallback(move);
      this.processMove(move);
    }
  }

  async scanMove(squareCount?: number) {
    if (this.recognizer.isScanning()) {
      this.recognizer.stopScanning();
      return;
    }
    this.statusCallback('Scanning move');
    let move;
    try {
      const boardStates = this.game.getNextBoardStates();
      move = await this.recognizer.scanMove(boardStates, squareCount);
      if (move === null) {
        this.statusCallback('No move found');
        return;
      }
    } catch (e) {
      if (e instanceof Error && e.message === 'no hashes') {
        this.statusCallback('Load hashes first');
      } else {
        console.log(e);
        this.statusCallback('Failed to scan move');
      }
      return;
    }
    this.statusCallback(`Found move: ${move}`);
    this.processMove(move, true);
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
    const result = this.game.skipMove();
    if (!result) {
      this.statusCallback(`Failed to skip turn`);
      return;
    }
    this.engine.reset(this.game.fen());
    this.statusCallback(result === 'w' ? 'White' : 'Black');
  }

  undoMove() {
    this.game.undo();
    const moves = this.engine.undo();
    console.log(`Moves: ${moves}`);
    this.game.printBoard();
  }

  setAutoResponse(value: boolean) {
    this.autoResponse = value;
    const enabledString = value ? 'enabled' : 'disabled';
    this.statusCallback(`Autoresponse is ${enabledString}`);
  }

  setAutoScan(value: boolean) {
    this.autoScan = value;
    const enabledString = value ? 'enabled' : 'disabled';
    this.statusCallback(`Autoscan is ${enabledString}`);
  }

  resetPosition() {
    this.game.reset();
    this.engine.reset();
    this.statusCallback('Reset');
  }

  onBestMove(callback: (value: string) => void) {
    this.bestMoveCallback = callback;
  }
}

export default Solver;

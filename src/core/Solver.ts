import { screen, Region } from '@nut-tree-fork/nut-js';
import type { Color, Square } from 'chess.js';
import Board from './Board.ts';
import Engine from './Engine.ts';
import Game from './Game.ts';
import Recognizer from './Recognizer.ts';
import RegionManager from './RegionManager.ts';
import { detectRegion } from './util.ts';
import { defaultValues } from '../config.ts';

interface SolverProps {
  board: Board;
  engine: Engine;
  game: Game;
  recognizer: Recognizer;
  regionManager: RegionManager;
}

type RegionStatus = 'none' | 'exist' | 'selecting';

class Solver {
  private board: Board;
  private engine: Engine;
  private game: Game;
  private recognizer: Recognizer;
  private regionManager: RegionManager;
  private regionStatus: RegionStatus = 'none';
  private autoResponse: boolean = defaultValues.autoResponse;
  private autoScan: boolean = defaultValues.autoScan;
  private stopBestMove: (() => void) | null = null;
  private statusCallback: (status: string) => void = console.log;
  private autoResponseCallback: (value: boolean) => void = () => {};
  private autoScanCallback: (value: boolean) => void = () => {};
  private regionStatusCallback: (value: RegionStatus) => void = () => {};

  constructor({ board, engine, game, recognizer, regionManager }: SolverProps) {
    this.board = board;
    this.engine = engine;
    this.game = game;
    this.recognizer = recognizer;
    this.regionManager = regionManager;
  }

  private setRegionStatus(value: RegionStatus) {
    this.regionStatus = value;
    this.regionStatusCallback(value);
  }

  private printBoard() {
    const ascii = this.game.ascii()+'  ';
    const reversed = ascii.split('').reverse().join('');
    console.log(this.board.getPerspective() ? ascii : reversed);
  }

  processMove(move: string) {
    if (move[3] === '1' || move[3] === '8') {
      const piece = this.game.get(move.substring(0, 2) as Square);
      if (piece && piece.type === 'p' && move.length < 5) {
        move += 'q';
      }
    }
    const squareCount = this.game.move(move);
    if (squareCount === null) {
      this.statusCallback(`Illegal move: ${move}`);
      return;
    }
    const gameOver = this.game.isGameOver();
    const moves = this.engine.sendMove(move, gameOver);
    console.log(`Moves: ${moves}`);
    this.printBoard();
    const myTurn = this.game.turn() === 'bw'[Number(this.board.getPerspective())];
    if (gameOver) {
      this.statusCallback('Game is over');
      this.recognizer.stopScanning();
    } else if (this.autoScan && !myTurn && squareCount !== -1) {
      this.scanMove(squareCount);
    } else if (this.autoResponse && myTurn) {
      this.playBestMove();
    }
  }

  setRegion(region: Region) {
    this.board.setRegion(region);
    this.recognizer.setRegion(region);
    this.regionManager.setRegion(region);
  }

  async observeMoves() {
    while (true) {
      const move = await this.board.detectMove();
      this.processMove(move);
    }
  }

  async selectNewRegion() {
    if (this.regionStatus === 'selecting') {
      detectRegion();
      return;
    }
    this.statusCallback('Select new region');
    const previousStatus = this.regionStatus;
    this.setRegionStatus('selecting');
    const actionRegionsEnabled = this.regionManager.isActive();
    this.regionManager.setActive(false);
    const region = await detectRegion();
    this.regionManager.setActive(actionRegionsEnabled);
    if (region === null) {
      this.setRegionStatus(previousStatus);
      this.statusCallback('No new region');
      return;
    }
    if (region.width < 10 || region.height < 10) {
      this.setRegionStatus(previousStatus);
      this.statusCallback('Region is too small');
      return;
    }
    this.setRegionStatus('exist');
    screen.highlight(region);
    this.setRegion(region);
    this.statusCallback('Ready');
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
      await this.board.playMove(move);
      if (!this.board.getDraggingMode()) {
        this.processMove(move);
      }
    }
  }

  async scanMove(squareCount?: number): Promise<void> {
    if (this.recognizer.isScanning()) {
      this.recognizer.stopScanning();
      return;
    }
    this.statusCallback('Scanning move');
    let move;
    try {
      const boardStates = [];
      const moves = this.game.moves();
      for (const move of moves) {
        boardStates.push({
          move: move,
          squares: [
            this.board.stringToSquare(move.substring(0, 2)),
            this.board.stringToSquare(move.substring(2))
          ],
          grid: this.game.boardAfterMove(move)
        });
      }
      boardStates.push({
        move: null,
        squares: [],
        grid: this.game.boardAfterMove(null)
      });
      move = await this.recognizer.scanMove(boardStates, squareCount);
      if (move === null) {
        this.statusCallback('No move found');
        return;
      }
    } catch (e) {
      if (e instanceof Error && e.message === 'no hashes') {
        this.statusCallback('Reload hashes first');
      } else {
        console.log(e);
        this.statusCallback('Failed to scan move');
      }
      return;
    }
    this.statusCallback(`Found move: ${move}`);
    this.processMove(move);
  }

  async recognizeBoard() {
    this.statusCallback('Recognizing board...');
    let pieces;
    try {
      pieces = await this.recognizer.recognizeBoard();
    } catch (e) {
      if (e instanceof Error && e.message === 'no hashes') {
        this.statusCallback('Reload hashes first');
      } else {
        console.log(e);
        this.statusCallback('Failed to recognize board');
      }
      return;
    }
    this.game.clear();
    for (const [piece, row, col] of pieces) {
      const square = this.board.squareToString([row, col]) as Square;
      const result = this.game.put(piece, square);
      if (!result) {
        const { type, color } = piece;
        console.log(`Failed to put ${type}${color} at ${square}`);
      }
    }
    const newColor = 'bw'[Number(this.board.getPerspective())] as Color;
    const result = this.game.setTurn(newColor);
    if (result) {
      this.statusCallback('Ready');
    } else {
      this.statusCallback('Failed to set turn');
    }
    this.engine.reset(this.game.fen());
    this.printBoard();
  }

  skipMove() {
    const newColor = 'wb'[Number(this.game.turn() === 'w')] as Color;
    const newColorString = newColor === 'w' ? 'White' : 'Black';
    const result = this.game.setTurn(newColor);
    if (!result) {
      this.statusCallback(`Failed to skip turn (${newColorString})`);
      return;
    }
    this.engine.reset(this.game.fen());
    this.statusCallback(newColorString);
  }

  undoMove() {
    this.game.undo();
    const moves = this.engine.undo();
    console.log(`Moves: ${moves}`);
    this.printBoard();
  }

  setAutoResponse(value: boolean) {
    this.autoResponse = value;
    this.autoResponseCallback(value);
    const enabledString = value ? 'enabled' : 'disabled';
    console.log(`Autoresponse is ${enabledString}`);
  }

  toggleAutoResponse() {
    this.setAutoResponse(!this.autoResponse);
  }

  setAutoScan(value: boolean) {
    this.autoScan = value;
    this.autoScanCallback(value);
    const enabledString = value ? 'enabled' : 'disabled';
    console.log(`Autoscan is ${enabledString}`);
  }

  toggleAutoScan() {
    this.setAutoScan(!this.autoScan);
  }

  resetPosition() {
    this.game.reset();
    this.engine.reset();
    this.statusCallback('Reset');
  }

  onUpdateStatus(callback: (status: string) => void) {
    this.statusCallback = callback;
  }

  onUpdateAutoResponse(callback: (value: boolean) => void) {
    this.autoResponseCallback = callback;
  }

  onUpdateAutoScan(callback: (value: boolean) => void) {
    this.autoScanCallback = callback;
  }

  onUpdateRegionStatus(callback: (value: RegionStatus) => void) {
    this.regionStatusCallback = callback;
  }
}

export default Solver;

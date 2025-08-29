import { mouse, screen, sleep, Point, Region } from '@nut-tree-fork/nut-js';
import mouseEvents from 'global-mouse-events';
import type { Color, Square } from 'chess.js';
import Board from './Board.ts';
import Engine from './Engine.ts';
import Game from './Game.ts';
import Recognizer from './Recognizer.ts';
import { detectRegion } from './util.ts';

function compareBoardHashes(oldHashes: string[][], newHashes: string[][]): [number, number][] {
  const changedSquaresWithErrors: [[number, number], number][] = [];
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      const newHash = newHashes[i][j];
      const oldHash = oldHashes[i][j];
      let errors = 0;
      for (let i = 0; i < newHash.length; i++) {
        errors += Math.abs(Number(newHash[i])-Number(oldHash[i]));
      }
      if (errors > 0) {
        changedSquaresWithErrors.push([[i, j], errors]);
      }
    }
  }
  changedSquaresWithErrors.sort((a, b) => b[1]-a[1]);
  return changedSquaresWithErrors.map((x) => x[0]);
}

interface SolverProps {
  region: Region;
  game: Game;
  engine: Engine;
  recognizer: Recognizer;
  board: Board;
}

class Solver {
  private game: Game;
  private engine: Engine;
  private recognizer: Recognizer;
  private board: Board;
  private autoResponse: boolean = false;
  private isDetectingRegion: boolean = false;
  private isScanning: boolean = false;
  private stopBestMove: (() => void) | null = null;
  private actionRegions: {[key: string]: Region} = {};
  private boardHashes: string[][] = [];
  private statusCallback: (status: string) => void = console.log;
  private autoResponseCallback: (value: boolean) => void = () => {};
  private detectingCallback: (value: boolean) => void = () => {};

  constructor({ region, game, engine, recognizer, board }: SolverProps) {
    this.game = game;
    this.engine = engine;
    this.recognizer = recognizer;
    this.board = board;
    this.setActionRegions(region);
  }

  private setDetectingRegion(value: boolean) {
    this.isDetectingRegion = value;
    this.detectingCallback(value);
  }

  private setActionRegions(region: Region) {
    const left = region.left;
    const top = region.top+region.height;
    const width = region.width/8;
    const height = region.height/8;
    this.actionRegions.recog = new Region(left, top, width, height);
    this.actionRegions.bestMove = new Region(left+width, top, width, height);
    this.actionRegions.reset = new Region(left+width*2, top, width, height);
    this.actionRegions.auto = new Region(left+width*3, top, width, height);
    this.actionRegions.undo = new Region(left+width*4, top, width, height);
    this.actionRegions.skip = new Region(left+width*5, top, width, height);
    this.actionRegions.scan = new Region(left+width*6, top, width, height);
    this.actionRegions.duration = new Region(left+width*7, top, width, height);
    this.actionRegions.region = new Region(left+region.width, region.top, width, height);
    this.actionRegions.drag = new Region(left+region.width, region.top+height, width, height);
    this.actionRegions.perspective = new Region(left+region.width, top-height, width, height);
  }

  private getActionName(p: Point): string | null {
    for (const name in this.actionRegions) {
      const { left, top, width, height } = this.actionRegions[name];
      if (p.x >= left && p.y >= top && p.x <= left+width && p.y <= top+height) {
        return name;
      }
    }
    return null;
  }

  private printBoard() {
    const ascii = this.game.ascii()+'  ';
    const reversed = ascii.split('').reverse().join('');
    console.log(this.board.getPerspective() ? ascii : reversed);
  }

  private async getChangedSquares(): Promise<[number, number][]> {
    let prevBoardHashes = await this.recognizer.getBoardHashes();
    const changedSquares = compareBoardHashes(this.boardHashes, prevBoardHashes);
    if (changedSquares.length > 2) {
      return changedSquares;
    }
    let quietPeriod: boolean = true;
    while (this.isScanning) {
      await sleep(20);
      const boardHashes = await this.recognizer.getBoardHashes();
      const changedSquares = compareBoardHashes(prevBoardHashes, boardHashes);
      if (changedSquares.length > 0) {
        quietPeriod = false;
      }
      if (changedSquares.length === 0) {
        if (quietPeriod) {
          this.boardHashes = boardHashes;
        } else {
          return compareBoardHashes(this.boardHashes, boardHashes);
        }
      }
      prevBoardHashes = boardHashes;
    }
    return [];
  }

  private async performAction(actionName: string) {
    if (actionName === 'recog') {
      return this.recognizeBoard();
    }
    if (actionName === 'bestMove') {
      return this.playBestMove();
    }
    if (actionName === 'reset') {
      this.resetPosition();
      return;
    }
    if (actionName === 'auto') {
      this.setAutoResponse(!this.autoResponse);
      return;
    }
    if (actionName === 'undo') {
      this.undoMove();
      return;
    }
    if (actionName === 'skip') {
      this.skipMove();
      return;
    }
    if (actionName === 'scan') {
      return this.scanMove();
    }
    if (actionName === 'duration') {
      const analysisDuration = this.engine.switchAnalysisDuration();
      console.log(`Analysis duration: ${analysisDuration} ms`);
      return;
    }
    if (actionName === 'region') {
      return this.detectNewRegion();
    }
    if (actionName === 'drag') {
      const draggingMode = this.board.toggleDraggingMode();
      console.log(`${draggingMode ? 'Dragging' : 'Clicking'} mode`);
      return;
    }
    if (actionName === 'perspective') {
      const isWhite = this.board.togglePerspective();
      console.log(`${isWhite ? 'White' : 'Black'} perspective`);
      return;
    }
  }

  private processMove(move: string) {
    if (move[3] === '1' || move[3] === '8') {
      const piece = this.game.get(move.substring(0, 2) as Square);
      if (piece && piece.type === 'p' && move.length < 5) {
        move += 'q';
      }
    }
    const result = this.game.move(move);
    if (!result) {
      this.statusCallback(`Illegal move: ${move}`);
      return;
    }
    if (this.game.isGameOver()) {
      this.statusCallback('Game is over');
      this.isScanning = false;
    }
    const moves = this.engine.sendMove(move);
    console.log(`Moves: ${moves}`);
    this.printBoard();
  }

  setRegion(region: Region) {
    this.setActionRegions(region);
    this.board.setRegion(region);
    this.recognizer.setRegion(region);
  }

  async observe() {
    const actionCallback = async () => {
      if (this.isDetectingRegion) {
        return;
      }
      const point = await mouse.getPosition();
      const actionName = this.getActionName(point);
      if (actionName !== null) {
        await this.performAction(actionName);
      }
    };
    mouseEvents.on('mouseup', actionCallback);
    while (true) {
      const move = await this.board.detectMove();
      this.processMove(move);
    }
  }

  async detectNewRegion() {
    if (this.isDetectingRegion) {
      return detectRegion();
    }
    this.statusCallback('Select new region');
    this.setDetectingRegion(true);
    const region = await detectRegion();
    this.setDetectingRegion(false);
    if (region === null) {
      this.statusCallback('No new region');
      return;
    }
    this.statusCallback('Ready');
    screen.highlight(region);
    this.setRegion(region);
  }

  async playBestMove() {
    if (this.stopBestMove) {
      this.stopBestMove();
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
      try {
        this.boardHashes = await this.recognizer.getBoardHashes();
      } catch (e) {
        this.boardHashes = [];
      }
      await this.board.playMove(move);
      if (!this.board.getDraggingMode()) {
        this.processMove(move);
      }
    }
    if (this.autoResponse && !this.game.isGameOver()) {
      await sleep(50);
      return this.scanMove();
    }
  }

  async scanMove(): Promise<void> {
    if (this.isScanning) {
      this.isScanning = false;
      return;
    }
    this.isScanning = true;
    this.statusCallback('Scanning for move');
    let squares;
    try {
      if (this.boardHashes.length === 0) {
        this.boardHashes = await this.recognizer.getBoardHashes();
      }
      squares = await this.getChangedSquares();
    } catch (e) {
      this.statusCallback('Failed to scan move');
      return;
    }
    this.boardHashes = [];
    const squareStrings = squares.map((x) => this.board.squareToString(x));
    console.log(`Changed squares: ${squareStrings.join(', ')}`);
    this.isScanning = false;
    if (squares.length < 2 || squares.length > 9) {
      this.statusCallback('No move detected');
      return;
    }
    for (const square1 of squareStrings) {
      for (const square2 of squareStrings) {
        if (square1 === square2) {
          continue;
        }
        const move = square1+square2;
        if (this.game.isLegalMove(move)) {
          this.processMove(move);
          if (this.autoResponse && !this.game.isGameOver()) {
            await sleep(this.engine.getAnalysisDuration()+100);
            return this.playBestMove();
          }
          return;
        }
      }
    }
    this.statusCallback('All combinations are illegal');
    return this.scanMove();
  }

  async recognizeBoard() {
    this.statusCallback('Recognizing board...');
    let pieces;
    try {
      pieces = await this.recognizer.recognizeBoard();
    } catch (e) {
      if (e instanceof Error && e.message === 'no-hashes') {
        this.statusCallback('Reload hashes first');
      } else {
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

  onDetectingRegion(callback: (value: boolean) => void) {
    this.detectingCallback = callback;
  }
}

export default Solver;

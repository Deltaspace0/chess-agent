import { mouse, sleep, straightTo, Point, Region } from '@nut-tree-fork/nut-js';
import mouseEvents from 'global-mouse-events';
import { coordsToSquare, squareToCoords } from '../util.ts';
import { defaultValues } from '../../config.ts';

class Board {
  private draggingMode: boolean = defaultValues.draggingMode;
  private region: Region | null = defaultValues.region;
  private perspective: boolean = defaultValues.isWhitePerspective;
  private startSquare: string | null = null;
  private moveListener: (move: string) => boolean = () => false;
  private downListener: (() => Promise<void>) | null = null;

  constructor() {
    mouseEvents.on('mousedown', async () => {
      const square = await this.getSquare();
      if (this.startSquare && square && this.startSquare !== square) {
        const result = this.moveListener(this.startSquare+square);
        if (result) {
          this.startSquare = null;
          return;
        }
      }
      this.startSquare = square;
    });
    mouseEvents.on('mouseup', async () => {
      const square = await this.getSquare();
      if (this.startSquare && square && this.startSquare !== square) {
        this.moveListener(this.startSquare+square);
        this.startSquare = null;
      }
    });
  }

  private async getSquare(): Promise<string | null> {
    const { x, y } = await mouse.getPosition();
    if (this.region === null) {
      return null;
    }
    const row = Math.floor((y-this.region.top)*8/this.region.height);
    const col = Math.floor((x-this.region.left)*8/this.region.width);
    if (row < 0 || row > 7 || col < 0 || col > 7) {
      return null;
    }
    return coordsToSquare([row, col], this.perspective);
  }

  private getPoint(square: string): Point {
    if (this.region === null) {
      throw new Error('No region set');
    }
    const [row, col] = squareToCoords(square, this.perspective);
    const x = this.region.left+this.region.width/8*(col+0.5);
    const y = this.region.top+this.region.height/8*(row+0.5);
    return new Point(x, y);
  }

  async playMove(move: string) {
    await mouse.move(straightTo(this.getPoint(move.substring(0, 2))));
    await sleep(50);
    await (this.draggingMode ? mouse.pressButton(0) : mouse.click(0));
    await sleep(50);
    await mouse.move(straightTo(this.getPoint(move.substring(2, 4))));
    await (this.draggingMode ? mouse.releaseButton(0) : mouse.click(0));
  }

  onMove(listener: (move: string) => boolean) {
    this.moveListener = listener;
  }

  onMouseDownSquare(listener: (square: string) => void) {
    if (this.downListener) {
      mouseEvents.off('mousedown', this.downListener);
    }
    this.downListener = async () => {
      const square = await this.getSquare();
      if (square !== null) {
        listener(square);
      }
    };
    mouseEvents.on('mousedown', this.downListener);
  }

  setDraggingMode(draggingMode: boolean) {
    this.draggingMode = draggingMode;
  }

  setRegion(region: Region | null) {
    this.region = region;
  }

  setPerspective(perspective: boolean) {
    this.perspective = perspective;
  }
}

export default Board;

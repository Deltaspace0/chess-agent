import { mouse, sleep, straightTo, Point, Region } from '@nut-tree-fork/nut-js';
import mouseEvents from 'global-mouse-events';
import { coordsToSquare, squareToCoords } from '../util.ts';
import { defaultValues } from '../../config.ts';

interface BoardOptions {
  region?: Region | null;
  perspective?: boolean;
}

class Board {
  private region: Region | null;
  private perspective: boolean;
  private downCallback: (() => Promise<void>) | null = null;

  constructor(options?: BoardOptions) {
    this.region = options?.region ?? defaultValues.region;
    this.perspective = options?.perspective ?? defaultValues.isWhitePerspective;
  }

  private getSquare({ x, y }: Point): string | null {
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

  async playMove(move: string, draggingMode: boolean) {
    await mouse.move(straightTo(this.getPoint(move.substring(0, 2))));
    await sleep(50);
    await (draggingMode ? mouse.pressButton(0) : mouse.click(0));
    await sleep(50);
    await mouse.move(straightTo(this.getPoint(move.substring(2, 4))));
    await (draggingMode ? mouse.releaseButton(0) : mouse.click(0));
  }

  async detectMove(): Promise<string> {
    return new Promise((resolve) => {
      let startSquare: string | null = null;
      const downCallback = async () => {
        const point = await mouse.getPosition();
        startSquare = this.getSquare(point);
      };
      const upCallback = async () => {
        if (startSquare === null) {
          return;
        }
        const point = await mouse.getPosition();
        const endSquare = this.getSquare(point);
        if (endSquare !== null) {
          if (startSquare !== endSquare) {
            mouseEvents.off('mousedown', downCallback);
            mouseEvents.off('mouseup', upCallback);
            resolve(startSquare+endSquare);
          }
        }
        startSquare = null;
      };
      mouseEvents.on('mousedown', downCallback);
      mouseEvents.on('mouseup', upCallback);
    });
  }

  onMouseDownSquare(callback: (square: string) => void) {
    if (this.downCallback) {
      mouseEvents.off('mousedown', this.downCallback);
    }
    this.downCallback = async () => {
      const point = await mouse.getPosition();
      const square = this.getSquare(point);
      if (square !== null) {
        callback(square);
      }
    };
    mouseEvents.on('mousedown', this.downCallback);
  }

  setRegion(region: Region | null) {
    this.region = region;
  }

  setPerspective(perspective: boolean) {
    this.perspective = perspective;
  }
}

export default Board;

import { mouse, sleep, straightTo, Point, Region } from '@nut-tree-fork/nut-js';
import mouseEvents from 'global-mouse-events';
import { defaultValues } from '../config.ts';

type Square = [number, number];

class Board {
  private region: Region | null = null;
  private isWhitePerspective: boolean = defaultValues.isWhitePerspective;
  private draggingMode: boolean = defaultValues.draggingMode;
  private perspectiveCallback: (value: boolean) => void = () => {};
  private draggingCallback: (value: boolean) => void = () => {};

  constructor(region?: Region) {
    if (region) {
      this.region = region;
    }
  }

  private getSquare(p: Point): Square | null {
    if (this.region === null) {
      return null;
    }
    const row = Math.floor((p.y-this.region.top)*8/this.region.height);
    const col = Math.floor((p.x-this.region.left)*8/this.region.width);
    if (row < 0 || row > 7 || col < 0 || col > 7) {
      return null;
    }
    return [row, col];
  }

  private getPoint([row, col]: Square): Point {
    if (this.region === null) {
      throw new Error('No region set');
    }
    const x = this.region.left+this.region.width/8*(col+0.5);
    const y = this.region.top+this.region.height/8*(row+0.5);
    return new Point(x, y);
  }

  setRegion(region: Region) {
    this.region = region;
  }

  squareToString([row, col]: Square): string {
    if (this.isWhitePerspective) {
      return `${'abcdefgh'[col]}${8-row}`;
    }
    return `${'hgfedcba'[col]}${1+row}`;
  }

  stringToSquare(squareString: string): Square {
    if (this.isWhitePerspective) {
      return [8-Number(squareString[1]), 'abcdefgh'.indexOf(squareString[0])];
    }
    return [Number(squareString[1])-1, 'hgfedcba'.indexOf(squareString[0])];
  }

  getPerspective(): boolean {
    return this.isWhitePerspective;
  }

  setPerspective(value: boolean) {
    this.isWhitePerspective = value;
    this.perspectiveCallback(this.isWhitePerspective);
  }

  togglePerspective(): boolean {
    this.setPerspective(!this.isWhitePerspective);
    return this.isWhitePerspective;
  }

  onUpdatePerspective(callback: (value: boolean) => void) {
    this.perspectiveCallback = callback;
  }

  getDraggingMode(): boolean {
    return this.draggingMode;
  }

  setDraggingMode(value: boolean) {
    this.draggingMode = value;
    this.draggingCallback(this.draggingMode);
  }

  toggleDraggingMode(): boolean {
    this.setDraggingMode(!this.draggingMode);
    return this.draggingMode;
  }

  onUpdateDragging(callback: (value: boolean) => void) {
    this.draggingCallback = callback;
  }

  async playMove(move: string) {
    const startSquare = this.stringToSquare(move.substring(0, 2));
    const endSquare = this.stringToSquare(move.substring(2));
    await mouse.move(straightTo(this.getPoint(startSquare)));
    await sleep(50);
    await (this.draggingMode ? mouse.pressButton(0) : mouse.click(0));
    await sleep(50);
    await mouse.move(straightTo(this.getPoint(endSquare)));
    await (this.draggingMode ? mouse.releaseButton(0) : mouse.click(0));
  }

  async detectMove(): Promise<string> {
    return new Promise((resolve) => {
      let startSquare: Square | null = null;
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
          const [startRow, startCol] = startSquare;
          const [endRow, endCol] = endSquare;
          if (startRow !== endRow || startCol !== endCol) {
            const startString = this.squareToString(startSquare);
            const endString = this.squareToString(endSquare);
            mouseEvents.removeListener('mousedown', downCallback);
            mouseEvents.removeListener('mouseup', upCallback);
            resolve(startString+endString);
          }
        }
        startSquare = null;
      };
      mouseEvents.on('mousedown', downCallback);
      mouseEvents.on('mouseup', upCallback);
    });
  }
}

export default Board;

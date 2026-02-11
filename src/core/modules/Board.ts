import type { Mouse } from './device/Mouse.ts';
import { coordsToSquare, squareToCoords } from '../../util.ts';
import { preferenceConfig } from '../../config.ts';

class Board {
  private mouse: Mouse;
  private draggingMode: boolean = preferenceConfig.draggingMode.defaultValue;
  private region: Region | null = preferenceConfig.region.defaultValue;
  private perspective: boolean = preferenceConfig.perspective.defaultValue;
  private startSquare: string | null = null;
  private moveListener: (move: string) => boolean = () => false;
  private downListener: ((square: string) => void) | null = null;

  constructor(mouse: Mouse) {
    this.mouse = mouse;
    mouse.addListener('mousedown', async () => {
      const square = await this.getSquare();
      if (square && this.downListener) {
        this.downListener(square);
      }
      if (this.startSquare && square && this.startSquare !== square) {
        const result = this.moveListener(this.startSquare+square);
        if (result) {
          this.startSquare = null;
          return;
        }
      }
      this.startSquare = square;
    });
    mouse.addListener('mouseup', async () => {
      const square = await this.getSquare();
      if (this.startSquare && square && this.startSquare !== square) {
        this.moveListener(this.startSquare+square);
        this.startSquare = null;
      }
    });
  }

  private async getSquare(): Promise<string | null> {
    const { x, y } = await this.mouse.getPosition();
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
    return {
      x: this.region.left+this.region.width/8*(col+0.5),
      y: this.region.top+this.region.height/8*(row+0.5)
    };
  }

  async playMove(move: string) {
    await this.mouse.move(this.getPoint(move.substring(0, 2)));
    await this.mouse.sleep(50);
    await (this.draggingMode ? this.mouse.press(0) : this.mouse.click(0));
    await this.mouse.sleep(50);
    await this.mouse.move(this.getPoint(move.substring(2, 4)));
    await (this.draggingMode ? this.mouse.release(0) : this.mouse.click(0));
  }

  onMove(listener: (move: string) => boolean) {
    this.moveListener = listener;
  }

  onMouseDownSquare(listener: (square: string) => void) {
    this.downListener = listener;
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

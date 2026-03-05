import EventEmitter from 'events';
import type { Mouse } from './device/Mouse.ts';
import { coordsToSquare, squareToCoords } from '../../util.ts';
import { preferenceConfig } from '../../config.ts';

interface BoardEventMap {
  move: [move: string, sendResult: (isLegal: boolean) => void];
  squarepressed: [square: string];
  promotion: [piece: string];
}

class Board extends EventEmitter<BoardEventMap> {
  private mouse: Mouse;
  private draggingMode = preferenceConfig.draggingMode.defaultValue;
  private region = preferenceConfig.region.defaultValue;
  private perspective = preferenceConfig.perspective.defaultValue;
  private autoPromotion = preferenceConfig.autoPromotion.defaultValue;
  private startSquare: string | null = null;
  private promotionMove: string | null = null;
  private playingMove = false;

  constructor(mouse: Mouse) {
    super();
    this.mouse = mouse;
    mouse.addListener('mousedown', async () => {
      const square = await this.getSquare();
      if (square) {
        this.emit('squarepressed', square);
      }
      if (this.playingMove) {
        return;
      }
      if (square && this.autoPromotion) {
        if (this.promotionMove && this.promotionMove.length >= 4) {
          if (square[0] === this.promotionMove[2]) {
            const rank = Number(square[1]);
            const n = this.promotionMove[3] === '8' ? 8-rank : rank-1;
            if (n >= 0 && n <= 3) {
              this.emit('promotion', 'qnrb'[n]);
              this.promotionMove = null;
            }
          }
        }
      }
      if (this.startSquare && square && this.startSquare !== square) {
        const result = await new Promise((resolve) => {
          this.emit('move', this.startSquare+square, resolve);
        });
        if (result) {
          this.startSquare = null;
          return;
        }
      }
      this.startSquare = square;
    });
    mouse.addListener('mouseup', async () => {
      if (this.playingMove) {
        return;
      }
      const square = await this.getSquare();
      if (this.startSquare && square && this.startSquare !== square) {
        this.emit('move', this.startSquare+square, () => {});
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
    this.playingMove = true;
    await this.mouse.move(this.getPoint(move.substring(0, 2)));
    await (this.draggingMode ? this.mouse.press(0) : this.mouse.click(0));
    await this.mouse.move(this.getPoint(move.substring(2, 4)));
    await (this.draggingMode ? this.mouse.release(0) : this.mouse.click(0));
    if (!this.autoPromotion || move.length < 5) {
      this.playingMove = false;
      return;
    }
    const promotionSquares: Record<string, string> = {
      'q': `${move[2]}${move[3] === '8' ? 8 : 1}`,
      'n': `${move[2]}${move[3] === '8' ? 7 : 2}`,
      'r': `${move[2]}${move[3] === '8' ? 6 : 3}`,
      'b': `${move[2]}${move[3] === '8' ? 5 : 4}`
    };
    if (!(move[4] in promotionSquares)) {
      this.playingMove = false;
      return;
    }
    await this.mouse.move(this.getPoint(promotionSquares[move[4]]));
    await this.mouse.click(0);
    this.playingMove = false;
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

  setAutoPromotion(autoPromotion: boolean) {
    this.autoPromotion = autoPromotion;
  }

  setPromotionMove(promotionMove: string) {
    this.promotionMove = promotionMove;
  }
}

export default Board;

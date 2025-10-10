import { beforeAll, describe, expect, it } from 'vitest';
import { Chess, type Piece } from 'chess.js';
import { readdir } from 'fs';
import { loadImage } from '@nut-tree-fork/nut-js';
import path from 'path';
import PixelGrid from './PixelGrid.ts';
import Recognizer from './Recognizer.ts';
import { Screen } from './device/Screen.ts';

const startPosition: [Piece, number, number][] = [];
const testImages: Record<string, PixelGrid> = {};

beforeAll(async () => {
  const chess = new Chess();
  const board = chess.board();
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      const squarePiece = board[i][j];
      if (squarePiece) {
        const { square, ...piece } = squarePiece;
        startPosition.push([piece, i, j]);
      }
    }
  }
  let paths: string[] = [];
  await new Promise<void>((resolve) => {
    readdir('test_images', (err, files) => {
      if (err) {
        console.error(err);
        resolve();
        return;
      }
      paths = files.map((x) => path.join('test_images', x));
      resolve();
    });
  });
  const promises: Promise<void>[] = [];
  for (const path of paths) {
    promises.push(loadImage(path).then((image) => {
      testImages[path] = new PixelGrid(image.data, image.byteWidth);
    }));
  }
  return Promise.all(promises);
});

class ScreenStub extends Screen {
  private pixelGrid: PixelGrid | null = null;

  grabRegion(): Promise<PixelGrid> {
    if (!this.pixelGrid) {
      throw new Error('No pixel grid to return');
    }
    return Promise.resolve(this.pixelGrid);
  }

  async sleep(): Promise<void> {}

  setPixelGrid(pixelGrid: PixelGrid | null) {
    this.pixelGrid = pixelGrid;
  }
}

const screen = new ScreenStub();

describe('Recognizer', () => {
  describe('Position', () => {
    it('should recognize starting position', async () => {
      const recognizer = new Recognizer(screen);
      for (const path in testImages) {
        screen.setPixelGrid(testImages[path]);
        await recognizer.load(true);
        const result = await recognizer.recognizeBoard();
        expect(result, path).toEqual(startPosition);
      }
    });
    it.todo('should recognize flipped position');
    it.todo('should recognize random position');
    it.todo('should recognize position with highlighted squares');
  });

  describe('Move scanning', () => {
    it.todo('should detect a move on the board');
    it.todo('should not detect a move if the board does not change');
    it.todo('should detect a castling move');
    it.todo('should detect en passant');
    it.todo('should detect an animated move');
    it.todo('should detect a move that is already made');
    it.todo('should detect a move with highlighted squares');
    it.todo('should not detect a move if the board gets covered');
  });
});

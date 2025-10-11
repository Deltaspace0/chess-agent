import { beforeAll, describe, expect, it } from 'vitest';
import { readdir } from 'fs/promises';
import { loadImage } from '@nut-tree-fork/nut-js';
import path from 'path';
import Game from './Game.ts';
import PixelGrid from './PixelGrid.ts';
import Recognizer from './Recognizer.ts';
import { Screen } from './device/Screen.ts';

const startPosition = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR';
const startImages: Record<string, PixelGrid> = {};
const flippedImages: Record<string, PixelGrid> = {};

async function loadImages(
  directory: string,
  images: Record<string, PixelGrid>
) {
  try {
    const files = await readdir(directory);
    const promises: Promise<void>[] = [];
    for (const file of files) {
      promises.push(loadImage(path.join(directory, file)).then((image) => {
        images[file] = new PixelGrid(image.data, image.byteWidth);
      }));
    }
    return Promise.all(promises);
  } catch (e) {
    console.error(e);
  }
}

beforeAll(async () => {
  await loadImages(path.join('test_images', 'start'), startImages);
  await loadImages(path.join('test_images', 'flipped'), flippedImages);
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
const game = new Game();

describe('Recognizer', () => {
  describe('Position', () => {
    it('should recognize starting position', async () => {
      const recognizer = new Recognizer(screen);
      for (const file in startImages) {
        screen.setPixelGrid(startImages[file]);
        await recognizer.load(true);
        const pieces = await recognizer.recognizeBoard();
        game.setPerspective(true);
        game.putPieces(pieces);
        const position = game.fen().split(' ')[0];
        expect(position, file).toBe(startPosition);
      }
    });
    it('should recognize flipped position', async () => {
      const recognizer = new Recognizer(screen);
      for (const file in flippedImages) {
        screen.setPixelGrid(flippedImages[file]);
        await recognizer.load(false);
        const pieces = await recognizer.recognizeBoard();
        game.setPerspective(false);
        game.putPieces(pieces);
        const position = game.fen().split(' ')[0];
        expect(position, file).toBe(startPosition);
      }
    });
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

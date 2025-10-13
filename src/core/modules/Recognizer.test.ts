import { beforeAll, describe, expect, it } from 'vitest';
import { readdir } from 'fs/promises';
import { loadImage, sleep } from '@nut-tree-fork/nut-js';
import path from 'path';
import Game from './Game.ts';
import PixelGrid from './PixelGrid.ts';
import Recognizer from './Recognizer.ts';
import { Screen } from './device/Screen.ts';

async function testImages(images: Record<string, PixelGrid>) {
  for (const file in images) {
    const [positionString, perspective, startFile] = file.split('_');
    const recognizer = recognizers[startFile];
    screen.setPixelGrid(images[file]);
    const pieces = await recognizer.recognizeBoard();
    game.setPerspective(perspective === 'w');
    game.putPieces(pieces);
    const position = game.fen().split(' ')[0];
    expect(position, startFile).toBe(positionString.replaceAll('-', '/'));
  }
}

class ScreenStub extends Screen {
  private pixelGrid: PixelGrid | null = null;
  private gridSequence: PixelGrid[] = [];

  grabRegion(): Promise<PixelGrid> {
    if (!this.pixelGrid) {
      throw new Error('No pixel grid to return');
    }
    return Promise.resolve(this.pixelGrid);
  }

  async sleep(): Promise<void> {
    if (this.gridSequence.length === 1) {
      this.pixelGrid = this.gridSequence[0];
    } else {
      this.pixelGrid = this.gridSequence.shift() || null;
    }
    await sleep(5);
  }

  setPixelGrid(pixelGrid: PixelGrid | null) {
    this.pixelGrid = pixelGrid;
  }

  setGridSequence(gridSequence: PixelGrid[]) {
    this.gridSequence = gridSequence;
    this.pixelGrid = gridSequence[0] || null;
  }
}

const screen = new ScreenStub();
const game = new Game();

const startPosition = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR';
const startImages: Record<string, PixelGrid> = {};
const flippedImages: Record<string, PixelGrid> = {};
const emptyImages: Record<string, PixelGrid> = {};
const randomImages: Record<string, PixelGrid> = {};
const highlightedImages: Record<string, PixelGrid> = {};
const backgroundImages: Record<string, PixelGrid> = {};
const moveImageSequences: Record<string, PixelGrid[]> = {};
const coveredImageSequences: Record<string, PixelGrid[]> = {};
const recognizers: Record<string, Recognizer> = {};

async function loadImages(
  directory: string,
  images: Record<string, PixelGrid>
) {
  try {
    const files = await readdir(directory);
    const promises: Promise<void>[] = [];
    for (const file of files) {
      if (file.slice(-4) !== '.png') {
        continue;
      }
      promises.push(loadImage(path.join(directory, file)).then((image) => {
        images[file] = new PixelGrid(image.data, image.byteWidth);
      }));
    }
    return Promise.all(promises);
  } catch (e) {
    console.error(e);
  }
}

async function loadImageSequences(
  directory: string,
  imageSequences: Record<string, PixelGrid[]>
) {
  try {
    const subdirectories = await readdir(directory);
    const promises: Promise<void>[] = [];
    for (const subdirectory of subdirectories) {
      if (subdirectory.slice(-4) !== '.png') {
        continue;
      }
      promises.push((async () => {
        const images: Record<string, PixelGrid> = {};
        await loadImages(path.join(directory, subdirectory), images);
        const imageSequence: PixelGrid[] = [];
        const f = (x: string) => Number(x.split('_')[1].slice(0, -4));
        const files = Object.keys(images).sort((a, b) => f(a)-f(b));
        for (const file of files) {
          const amount = Number(file.split('_')[0]);
          for (let i = 0; i < amount; i++) {
            imageSequence.push(images[file]);
          }
        }
        imageSequences[subdirectory] = imageSequence;
      })());
    }
    return Promise.all(promises);
  } catch (e) {
    console.error(e);
  }
}

beforeAll(async () => {
  await Promise.all([
    loadImages(path.join('test_images', 'start'), startImages),
    loadImages(path.join('test_images', 'flipped'), flippedImages),
    loadImages(path.join('test_images', 'empty'), emptyImages),
    loadImages(path.join('test_images', 'random'), randomImages),
    loadImages(path.join('test_images', 'highlighted'), highlightedImages),
    loadImages(path.join('test_images', 'background'), backgroundImages),
    loadImageSequences(
      path.join('test_images', 'scan', 'move'),
      moveImageSequences
    ),
    loadImageSequences(
      path.join('test_images', 'scan', 'covered'),
      coveredImageSequences
    )
  ]);
  for (const file in startImages) {
    const recognizer = new Recognizer(screen);
    screen.setPixelGrid(startImages[file]);
    await recognizer.load(true);
    recognizers[file] = recognizer;
  }
});

describe('Recognizer', () => {
  describe('Position', () => {
    it('should recognize starting position', async () => {
      for (const file in startImages) {
        const recognizer = recognizers[file];
        screen.setPixelGrid(startImages[file]);
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

    it('should recognize empty position', async () => {
      const recognizer = new Recognizer(screen, { putKings: false });
      for (const file in emptyImages) {
        screen.setPixelGrid(startImages[file]);
        await recognizer.load(true);
        screen.setPixelGrid(emptyImages[file]);
        const pieces = await recognizer.recognizeBoard();
        expect(pieces, file).toEqual([]);
      }
    });

    it('should recognize random position', async () => {
      await testImages(randomImages);
    });

    it('should recognize position with highlighted squares', async () => {
      await testImages(highlightedImages);
    });

    it.skip('should recognize position with a different background', async () => {
      await testImages(backgroundImages);
    });
  });

  describe('Move scanning', () => {
    it('should detect a move on the board', async () => {
      for (const name in moveImageSequences) {
        const [fen, expectedMove, perspective, startFile] = name.split('_');
        const recognizer = recognizers[startFile];
        screen.setGridSequence(moveImageSequences[name]);
        game.setPerspective(perspective === 'w');
        game.load(fen.replaceAll('=', '/').replaceAll('+', ' '));
        const timeout = setTimeout(() => recognizer.stopScanning(), 1000);
        const boardStates = game.getNextBoardStates();
        const move = await recognizer.scanMove(boardStates);
        clearTimeout(timeout);
        expect(move).toBe(expectedMove);
      }
    });

    it('should not detect a move if the board does not change', async () => {
      for (const file in startImages) {
        const recognizer = recognizers[file];
        screen.setGridSequence([startImages[file]]);
        game.setPerspective(true);
        game.reset();
        const timeout = setTimeout(() => recognizer.stopScanning(), 200);
        const boardStates = game.getNextBoardStates();
        const move = recognizer.scanMove(boardStates);
        await expect(move).rejects.toThrow();
        clearTimeout(timeout);
        break;
      }
    });

    it('should not detect a move if the board gets covered', async () => {
      for (const name in coveredImageSequences) {
        const [fen, perspective, startFile] = name.split('_');
        const recognizer = recognizers[startFile];
        screen.setGridSequence(coveredImageSequences[name]);
        game.setPerspective(perspective === 'w');
        game.load(fen.replaceAll('=', '/').replaceAll('+', ' '));
        const timeout = setTimeout(() => recognizer.stopScanning(), 200);
        const boardStates = game.getNextBoardStates();
        const move = recognizer.scanMove(boardStates);
        await expect(move).rejects.toThrow();
        clearTimeout(timeout);
      }
    });

    it('should detect a move that is already made', async () => {
      for (const name in moveImageSequences) {
        const [fen, expectedMove, perspective, startFile] = name.split('_');
        const recognizer = recognizers[startFile];
        screen.setGridSequence(moveImageSequences[name].slice(-1));
        game.setPerspective(perspective === 'w');
        game.load(fen.replaceAll('=', '/').replaceAll('+', ' '));
        const timeout = setTimeout(() => recognizer.stopScanning(), 1000);
        const boardStates = game.getNextBoardStates();
        const move = await recognizer.scanMove(boardStates);
        clearTimeout(timeout);
        expect(move).toBe(expectedMove);
      }
    });
  });
});

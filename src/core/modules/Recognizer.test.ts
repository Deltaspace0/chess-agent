import { describe, expect, it } from 'vitest';
import { readdir } from 'fs/promises';
import { loadImage } from '@nut-tree-fork/nut-js';
import path from 'path';
import Game from './Game.ts';
import PixelGrid from './PixelGrid.ts';
import Recognizer from './Recognizer.ts';
import { Screen } from './device/Screen.ts';

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

const startPosition = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR';
const imageTable: Record<string, Record<string, PixelGrid>> = {};
const otherImageTable: Record<string, Record<string, PixelGrid>> = {};
const recognizers: Record<string, Recognizer> = {};

async function loadImages(directory: string): Promise<Record<string, PixelGrid>> {
  try {
    const images: Record<string, PixelGrid> = {};
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
    await Promise.all(promises);
    return images;
  } catch (e) {
    console.error(e);
    return {};
  }
}

try {
  const dirents = await readdir('test_images', { withFileTypes: true });
  for (const dirent of dirents) {
    const name = dirent.name;
    if (!dirent.isDirectory() || name.slice(-5) === '.skip') {
      continue;
    }
    const images = await loadImages(path.join('test_images', name));
    if (['start', 'flipped', 'empty'].includes(name)) {
      imageTable[name] = images;
    } else {
      otherImageTable[name] = images;
    }
  }
} catch (e) {
  console.error(e);
}
for (const file in imageTable['start']) {
  const recognizer = new Recognizer(screen);
  screen.setPixelGrid(imageTable['start'][file]);
  await recognizer.load(true);
  recognizers[file] = recognizer;
}

describe.skipIf(!imageTable['start'])('Recognizer', () => {
  it('should recognize starting position', async () => {
    for (const file in imageTable['start']) {
      const recognizer = recognizers[file];
      screen.setPixelGrid(imageTable['start'][file]);
      const pieces = await recognizer.recognizeBoard();
      game.setPerspective(true);
      game.putPieces(pieces);
      const position = game.fen().split(' ')[0];
      expect(position, file).toBe(startPosition);
    }
  });

  it('should recognize flipped position', async () => {
    if (!imageTable['flipped']) {
      return;
    }
    const recognizer = new Recognizer(screen);
    for (const file in imageTable['flipped']) {
      screen.setPixelGrid(imageTable['flipped'][file]);
      await recognizer.load(false);
      const pieces = await recognizer.recognizeBoard();
      game.setPerspective(false);
      game.putPieces(pieces);
      const position = game.fen().split(' ')[0];
      expect(position, file).toBe(startPosition);
    }
  });

  it('should recognize empty position', async () => {
    if (!imageTable['empty']) {
      return;
    }
    const recognizer = new Recognizer(screen, { putKings: false });
    for (const file in imageTable['empty']) {
      screen.setPixelGrid(imageTable['start'][file]);
      await recognizer.load(true);
      screen.setPixelGrid(imageTable['empty'][file]);
      const pieces = await recognizer.recognizeBoard();
      expect(pieces, file).toEqual([]);
    }
  });

  it.each(Object.keys(otherImageTable))('should recognize %s', async (name) => {
    for (const file in otherImageTable[name]) {
      const [positionString, perspective, startFile] = file.split('_');
      const recognizer = recognizers[startFile];
      screen.setPixelGrid(otherImageTable[name][file]);
      const pieces = await recognizer.recognizeBoard();
      game.setPerspective(perspective === 'w');
      game.putPieces(pieces);
      const position = game.fen().split(' ')[0];
      expect(position, startFile).toBe(positionString.replaceAll('-', '/'));
    }
  });
});

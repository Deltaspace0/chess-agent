import { screen, Region as NutRegion } from '@nut-tree-fork/nut-js';
import PixelGrid from './PixelGrid.ts';

export abstract class Screen {
  protected region: Region | null = null;

  abstract grabRegion(): Promise<PixelGrid>;

  getRegion(): Region | null {
    return this.region && {...this.region};
  }

  setRegion(region: Region | null) {
    this.region = region;
  }
}

export class ConcreteScreen extends Screen {
  async grabRegion(): Promise<PixelGrid> {
    if (this.region === null) {
      throw new Error('No region set');
    }
    const { left, top, width, height } = this.region;
    const nutRegion = new NutRegion(left, top, width, height);
    const image = await screen.grabRegion(nutRegion);
    return new PixelGrid(image.data, image.byteWidth);
  }
}

function getBoundaryIndices(grid: PixelGrid): number[] {
  const boundaryIndices: number[] = [];
  const [width, height] = grid.getDimensions();
  for (let i = 0; i < height-1; i++) {
    let start = null;
    let boundarySize = 0;
    for (let j = 0; j < width; j++) {
      if (Math.abs(grid.getGrayPixel(i, j)-grid.getGrayPixel(i+1, j)) > 20) {
        if (start === null) {
          start = j;
        }
        if (j < width-1) {
          continue;
        }
      }
      if (start !== null) {
        boundarySize = Math.max(boundarySize, j-1-start);
        start = null;
      }
    }
    if (boundarySize > width/2) {
      boundaryIndices.push(i);
    }
  }
  return boundaryIndices;
}

function getSquareDimension(array: number[]): number {
  const distCounter: Record<number, number> = {};
  const distances: number[] = [];
  let mode = 0;
  for (let i = 0; i < array.length-1; i++) {
    const distance = array[i+1]-array[i];
    if (distance < 5) {
      continue;
    }
    distances.push(distance);
    if (!(distance in distCounter)) {
      distCounter[distance] = 0;
    }
    const count = ++distCounter[distance];
    if (!mode || count > distCounter[mode]) {
      mode = distance;
    }
  }
  const dimensions = distances.filter((x) => Math.abs(x-mode) < 3);
  if (dimensions.length === 0) {
    return 0;
  }
  return dimensions.reduce((a, b) => a+b)/dimensions.length;
}

export async function getAdjustedRegion(screen: Screen): Promise<Region | null> {
  const region = screen.getRegion();
  if (!region) {
    return null;
  }
  const grid = await screen.grabRegion();
  grid.calculateGrayPixels();
  const rowBoundaryIndices = getBoundaryIndices(grid);
  const squareHeight = getSquareDimension(rowBoundaryIndices);
  if (squareHeight === 0) {
    return region;
  }
  grid.setTransposed(true);
  const colBoundaryIndices = getBoundaryIndices(grid);
  const squareWidth = getSquareDimension(colBoundaryIndices);
  if (squareWidth === 0) {
    return region;
  }
  const firstRow = rowBoundaryIndices[0];
  const firstCol = colBoundaryIndices[0];
  const left = firstCol > squareWidth/2 ? firstCol-squareWidth : firstCol;
  const top = firstRow > squareHeight/2 ? firstRow-squareHeight : firstRow;
  return {
    left: left+region.left,
    top: top+region.top,
    width: squareWidth*8,
    height: squareHeight*8
  };
}

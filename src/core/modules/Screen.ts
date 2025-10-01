import { screen, Region as NutRegion } from '@nut-tree-fork/nut-js';
import PixelGrid from './PixelGrid.ts';

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
  return dimensions.reduce((a, b) => a+b)/dimensions.length;
}

export abstract class Screen {
  protected region: Region | null = null;

  abstract grabRegion(): Promise<PixelGrid>;

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

  async getAdjustedRegion(): Promise<Region> {
    if (this.region === null) {
      throw new Error('No region set');
    }
    const grid = await this.grabRegion();
    grid.calculateGrayPixels();
    const rowBoundaryIndices = getBoundaryIndices(grid);
    console.log('Row boundary indices:', rowBoundaryIndices);
    const squareHeight = getSquareDimension(rowBoundaryIndices);
    console.log('Square height:', squareHeight);
    if (squareHeight === 0) {
      return this.region;
    }
    grid.setTransposed(true);
    const colBoundaryIndices = getBoundaryIndices(grid);
    console.log('Col boundary indices:', colBoundaryIndices);
    const squareWidth = getSquareDimension(colBoundaryIndices);
    console.log('Square width:', squareWidth);
    if (squareWidth === 0) {
      return this.region;
    }
    const firstRow = rowBoundaryIndices[0];
    const firstCol = colBoundaryIndices[0];
    const left = firstCol > squareWidth/2 ? firstCol-squareWidth : firstCol;
    const top = firstRow > squareHeight/2 ? firstRow-squareHeight : firstRow;
    return {
      left: left+this.region.left,
      top: top+this.region.top,
      width: squareWidth*8,
      height: squareHeight*8
    };
  }
}

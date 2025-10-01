import {
  screen as nutScreen,
  Region as NutRegion
} from '@nut-tree-fork/nut-js';
import PixelGrid from './PixelGrid.ts';

export abstract class Screen {
  protected region: Region | null = null;

  abstract grabRegion(region?: Region): Promise<PixelGrid>;

  getRegion(): Region | null {
    return this.region && {...this.region};
  }
}

export class ConcreteScreen extends Screen {
  async grabRegion(region?: Region): Promise<PixelGrid> {
    if (!this.region && !region) {
      throw new Error('No region set');
    }
    const { left, top, width, height } = region ?? this.region!;
    const nutRegion = new NutRegion(left, top, width, height);
    const image = await nutScreen.grabRegion(nutRegion);
    return new PixelGrid(image.data, image.byteWidth);
  }

  setRegion(region: Region | null) {
    this.region = region;
  }
}

function isBoundary(grid: PixelGrid, row: number): boolean {
  let start = null;
  let boundarySize = 0;
  const width = grid.getWidth();
  for (let j = 0; j < width; j++) {
    const [b1, g1, r1] = grid.getPixelBuffer(row, j);
    const [b2, g2, r2] = grid.getPixelBuffer(row+1, j);
    if ((b1-b2)**2+(g1-g2)**2+(r1-r2)**2 > 20) {
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
  return boundarySize > (width-40)/2;
}

function getFirstBoundary(grid: PixelGrid): number | null {
  for (let i = 40; i >= 0; i--) {
    if (isBoundary(grid, i)) {
      return i;
    }
  }
  return null;
}

function getLastBoundary(grid: PixelGrid): number | null {
  const height = grid.getHeight();
  for (let i = height-40; i < height-1; i++) {
    if (isBoundary(grid, i)) {
      return i;
    }
  }
  return null;
}

export async function getAdjustedRegion(screen: Screen): Promise<Region | null> {
  const region = screen.getRegion();
  if (!region) {
    return null;
  }
  const screenWidth = await nutScreen.width();
  const screenHeight = await nutScreen.height();
  const expRegion = {
    left: Math.max(0, region.left-20),
    top: Math.max(0, region.top-20),
    width: Math.min(screenWidth-region.left, region.width+40),
    height: Math.min(screenHeight-region.top, region.height+40)
  };
  const grid = await screen.grabRegion(expRegion);
  const top = getFirstBoundary(grid);
  const bottom = getLastBoundary(grid);
  grid.setTransposed(true);
  const left = getFirstBoundary(grid);
  const right = getLastBoundary(grid);
  const adjustLeft = left ? left+expRegion.left : region.left;
  const adjustTop = top ? top+expRegion.top : region.top;
  const adjustRight = right ? right+expRegion.left : region.left+region.width;
  const adjustBottom = bottom ? bottom+expRegion.top : region.top+region.height;
  return {
    left: adjustLeft,
    top: adjustTop,
    width: adjustRight-adjustLeft,
    height: adjustBottom-adjustTop
  };
}

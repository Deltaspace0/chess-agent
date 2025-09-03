import { Point, Region } from '@nut-tree-fork/nut-js';

class RegionManager {
  private actionRegions: Record<string, Region> = {};

  constructor(region?: Region) {
    if (region) {
      this.setRegion(region);
    }
  }

  setRegion(region: Region) {
    const left = region.left;
    const top = region.top+region.height;
    const width = region.width/8;
    const height = region.height/8;
    this.actionRegions.recog = new Region(left, top, width, height);
    this.actionRegions.bestMove = new Region(left+width, top, width, height);
    this.actionRegions.reset = new Region(left+width*2, top, width, height);
    this.actionRegions.auto = new Region(left+width*3, top, width, height);
    this.actionRegions.undo = new Region(left+width*4, top, width, height);
    this.actionRegions.skip = new Region(left+width*5, top, width, height);
    this.actionRegions.scan = new Region(left+width*6, top, width, height);
    this.actionRegions.duration = new Region(left+width*7, top, width, height);
    this.actionRegions.region = new Region(left+region.width, region.top, width, height);
    this.actionRegions.drag = new Region(left+region.width, region.top+height, width, height);
    this.actionRegions.perspective = new Region(left+region.width, top-height, width, height);
  }

  getActionName({ x, y }: Point): string | null {
    for (const name in this.actionRegions) {
      const { left, top, width, height } = this.actionRegions[name];
      if (x >= left && y >= top && x <= left+width && y <= top+height) {
        return name;
      }
    }
    return null;
  }
}

export default RegionManager;

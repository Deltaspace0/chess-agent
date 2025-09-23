import type { Mouse } from './Mouse.ts';

interface ActionRegion {
  callback: () => Promise<void> | void;
  regionSelector: (region: Region) => Region;
}

class ActionRegionManager {
  private mouse: Mouse;
  private region: Region | null = null;
  private isActive: boolean = false;
  private actionRegions: ActionRegion[] = [];

  constructor(mouse: Mouse) {
    this.mouse = mouse;
    mouse.addListener('mouseup', () => this.performAction());
  }

  private async performAction() {
    if (this.region === null || !this.isActive) {
      return;
    }
    const { x, y } = await this.mouse.getPosition();
    for (const { callback, regionSelector } of this.actionRegions) {
      const { left, top, width, height } = regionSelector(this.region);
      if (x >= left && y >= top && x <= left+width && y <= top+height) {
        callback();
        return;
      }
    }
  }

  addActionRegion(actionRegion: ActionRegion) {
    this.actionRegions.push(actionRegion);
  }

  setActive(value: boolean) {
    this.isActive = value;
  }

  setRegion(region: Region | null) {
    this.region = region;
  }
}

export default ActionRegionManager;

import { mouse, Region } from '@nut-tree-fork/nut-js';
import mouseEvents from 'global-mouse-events';

interface ActionRegion {
  callback: () => Promise<void> | void;
  regionSelector: (region: Region) => Region;
}

class RegionManager {
  private region: Region | null = null;
  private actionRegions: ActionRegion[] = [];
  private active: boolean = false;
  private actionCallback: () => void = () => this.performAction();

  constructor(region?: Region) {
    if (region) {
      this.region = region;
    }
  }

  private async performAction() {
    if (this.region === null) {
      return;
    }
    const { x, y } = await mouse.getPosition();
    for (const { callback, regionSelector } of this.actionRegions) {
      const { left, top, width, height } = regionSelector(this.region);
      if (x >= left && y >= top && x <= left+width && y <= top+height) {
        callback();
      }
    }
  }

  setRegion(region: Region) {
    this.region = region;
  }

  setActive(value: boolean) {
    if (this.active === value) {
      return;
    }
    this.active = value;
    if (value) {
      mouseEvents.on('mouseup', this.actionCallback);
    } else {
      mouseEvents.removeListener('mouseup', this.actionCallback);
    }
  }

  isActive(): boolean {
    return this.active;
  }

  addActionRegion(actionRegion: ActionRegion) {
    this.actionRegions.push(actionRegion);
  }
}

export default RegionManager;

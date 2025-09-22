import { mouse } from '@nut-tree-fork/nut-js';
import mouseEvents from 'global-mouse-events';

interface ActionRegion {
  callback: () => Promise<void> | void;
  regionSelector: (region: Region) => Region;
}

class ActionRegionManager {
  private region: Region | null;
  private active: boolean = false;
  private actionRegions: ActionRegion[] = [];
  private actionCallback: () => void = () => this.performAction();

  constructor(region?: Region) {
    this.region = region ?? null;
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
        return;
      }
    }
  }

  addActionRegion(actionRegion: ActionRegion) {
    this.actionRegions.push(actionRegion);
  }
  
  setActive(value: boolean) {
    if (this.active === value) {
      return;
    }
    this.active = value;
    if (value) {
      mouseEvents.on('mouseup', this.actionCallback);
    } else {
      mouseEvents.off('mouseup', this.actionCallback);
    }
  }

  setRegion(region: Region | null) {
    this.region = region;
  }
}

export default ActionRegionManager;

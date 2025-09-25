import type { Mouse } from './Mouse.ts';

interface ActionRegion {
  callback: () => void;
  getRegion: () => Region | null;
}

class ActionRegionManager {
  private mouse: Mouse;
  private isActive: boolean = false;
  private actionRegions: ActionRegion[] = [];

  constructor(mouse: Mouse) {
    this.mouse = mouse;
    mouse.addListener('mouseup', () => this.performAction());
  }

  private async performAction() {
    if (!this.isActive) {
      return;
    }
    const { x, y } = await this.mouse.getPosition();
    for (const { callback, getRegion } of this.actionRegions) {
      const region = getRegion();
      if (!region) {
        continue;
      }
      const { left, top, width, height } = region;
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
}

export default ActionRegionManager;

import type { Mouse } from './device/Mouse.ts';

interface ActionRegion {
  callback: () => void;
  getRegion: () => Region | null;
}

class ActionRegionManager {
  private mouse: Mouse;
  private isActive: boolean;
  private actionRegions: ActionRegion[] = [];

  constructor(mouse: Mouse, isActive?: boolean) {
    this.mouse = mouse;
    this.isActive = isActive || false;
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

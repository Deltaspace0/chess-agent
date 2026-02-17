import type { Mouse } from './device/Mouse.ts';

interface ActionRegion {
  name?: string;
  callback: () => void;
  getRegion: () => Region | null;
}

class ActionRegionManager {
  private mouse: Mouse;
  private isActive: boolean;
  private actionRegions: ActionRegion[] = [];
  private hoveredAction?: string;
  private hoverCallback: (name?: string) => void = () => {};

  constructor(mouse: Mouse, isActive?: boolean) {
    this.mouse = mouse;
    this.isActive = isActive || false;
    mouse.addListener('mouseup', () => this.performAction());
    mouse.addListener('mousemove', () => this.updateHoveredAction());
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

  private async updateHoveredAction() {
    if (!this.isActive) {
      return;
    }
    const { x, y } = await this.mouse.getPosition();
    for (const { name, getRegion } of this.actionRegions) {
      const region = getRegion();
      if (!region) {
        continue;
      }
      const { left, top, width, height } = region;
      if (x >= left && y >= top && x <= left+width && y <= top+height) {
        if (this.hoveredAction !== name) {
          this.hoveredAction = name;
          this.hoverCallback(name);
        }
        return;
      }
    }
    if (this.hoveredAction !== undefined) {
      this.hoveredAction = undefined;
      this.hoverCallback();
    }
  }

  getHoveredAction(): string | undefined {
    return this.hoveredAction;
  }

  onHover(callback: (name?: string) => void) {
    this.hoverCallback = callback;
  }

  addActionRegion(actionRegion: ActionRegion) {
    this.actionRegions.push(actionRegion);
  }

  setActive(value: boolean) {
    this.isActive = value;
  }
}

export default ActionRegionManager;

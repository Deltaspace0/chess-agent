import EventEmitter from 'events';
import type { Mouse } from './device/Mouse.ts';

interface ActionRegionManagerEventMap {
  hover: [name?: string];
}

interface ActionRegion {
  name?: string;
  listener: () => void;
  getRegion: () => Region | null;
}

class ActionRegionManager extends EventEmitter<ActionRegionManagerEventMap> {
  private mouse: Mouse;
  private isActive: boolean;
  private actionRegions: ActionRegion[] = [];
  private hoveredAction?: string;

  constructor(mouse: Mouse, isActive?: boolean) {
    super();
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
    for (const { listener, getRegion } of this.actionRegions) {
      const region = getRegion();
      if (!region) {
        continue;
      }
      const { left, top, width, height } = region;
      if (x >= left && y >= top && x <= left+width && y <= top+height) {
        listener();
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
          this.emit('hover', name);
        }
        return;
      }
    }
    if (this.hoveredAction !== undefined) {
      this.hoveredAction = undefined;
      this.emit('hover');
    }
  }

  getHoveredAction(): string | undefined {
    return this.hoveredAction;
  }

  addActionRegion(actionRegion: ActionRegion) {
    this.actionRegions.push(actionRegion);
  }

  setActive(value: boolean) {
    this.isActive = value;
  }
}

export default ActionRegionManager;

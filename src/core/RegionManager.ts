import { mouse, screen, Point, Region } from '@nut-tree-fork/nut-js';
import mouseEvents from 'global-mouse-events';
import StatusNotifier from './StatusNotifier.ts';

interface ActionRegion {
  callback: () => Promise<void> | void;
  regionSelector: (region: Region) => Region;
}

type RegionStatus = 'none' | 'exist' | 'selecting';

class RegionManager extends StatusNotifier {
  private region: Region | null = null;
  private regionStatus: RegionStatus = 'none';
  private actionRegions: ActionRegion[] = [];
  private active: boolean = false;
  private stopDetection: (() => void) = () => {};
  private actionCallback: () => void = () => this.performAction();
  private regionCallback: (region: Region) => void = () => {};
  private regionStatusCallback: (value: RegionStatus) => void = () => {};

  constructor(region?: Region) {
    super();
    if (region) {
      this.region = region;
    }
  }

  private async performAction() {
    if (this.region === null || this.regionStatus === 'selecting') {
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

  private async detectRegion(): Promise<Region | null> {
    return new Promise<Region | null>((resolve) => {
      let p1: Point | null = null;
      let p2: Point | null = null;
      const callback = async (event: MouseEvent) => {
        const point = await mouse.getPosition();
        if (event.button === 1) {
          p1 = point;
        } else if (event.button === 2) {
          p2 = point;
        }
        if (p1 !== null && p2 !== null) {
          res(new Region(p1.x, p1.y, p2.x-p1.x, p2.y-p1.y));
        }
      };
      const res = (value: Region | null) => {
        mouseEvents.off('mouseup', callback);
        resolve(value);
      };
      this.stopDetection = () => res(null);
      mouseEvents.on('mouseup', callback);
    }).catch((e) => {
      console.log(e);
      return null;
    });
  }

  private setRegionStatus(value: RegionStatus) {
    this.regionStatus = value;
    this.regionStatusCallback(value);
  }

  setRegion(region: Region) {
    this.region = region;
    this.regionCallback(region);
  }

  async selectNewRegion(): Promise<Region | null> {
    if (this.regionStatus === 'selecting') {
      this.stopDetection();
      return null;
    }
    this.statusCallback('Select new region');
    const previousStatus = this.regionStatus;
    this.setRegionStatus('selecting');
    const region = await this.detectRegion();
    if (region === null) {
      this.setRegionStatus(previousStatus);
      this.statusCallback('No new region');
      return null;
    }
    if (region.width < 10 || region.height < 10) {
      this.setRegionStatus(previousStatus);
      this.statusCallback('Region is too small');
      return null;
    }
    this.setRegionStatus('exist');
    screen.highlight(region);
    this.setRegion(region);
    this.statusCallback('Ready');
    return region;
  }

  async showRegion() {
    if (this.region) {
      return screen.highlight(this.region);
    }
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

  isActive(): boolean {
    return this.active;
  }

  addActionRegion(actionRegion: ActionRegion) {
    this.actionRegions.push(actionRegion);
  }

  onUpdateRegion(callback: (region: Region) => void) {
    this.regionCallback = callback;
  }

  onUpdateRegionStatus(callback: (value: RegionStatus) => void) {
    this.regionStatusCallback = callback;
  }
}

export default RegionManager;

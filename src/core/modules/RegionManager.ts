import { mouse, screen, Point, Region as NutRegion } from '@nut-tree-fork/nut-js';
import mouseEvents from 'global-mouse-events';
import StatusNotifier from './StatusNotifier.ts';

class RegionManager extends StatusNotifier {
  private region: Region | null = null;
  private regionStatus: RegionStatus = 'none';
  private stopDetection: (() => void) = () => {};
  private regionCallback: (region: Region | null) => void = () => {};
  private regionStatusCallback: (value: RegionStatus) => void = () => {};

  constructor() {
    super();
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
          res({
            left: p1.x,
            top: p1.y,
            width: p2.x-p1.x,
            height: p2.y-p1.y
          });
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
    this.setRegion(region);
    this.showRegion();
    this.statusCallback('Ready');
    return region;
  }

  setRegion(region: Region | null) {
    this.region = region;
    this.setRegionStatus(region ? 'exist' : 'none');
    this.regionCallback(region);
  }

  async showRegion() {
    if (this.region) {
      const { left, top, width, height } = this.region;
      return screen.highlight(new NutRegion(left, top, width, height));
    }
  }

  onUpdateRegion(callback: (region: Region | null) => void) {
    this.regionCallback = callback;
  }

  onUpdateRegionStatus(callback: (value: RegionStatus) => void) {
    this.regionStatusCallback = callback;
  }
}

export default RegionManager;

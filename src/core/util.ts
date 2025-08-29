import { mouse, Point, Region } from '@nut-tree-fork/nut-js';
import mouseEvents from 'global-mouse-events';

let stopDetection: (() => void) | null = null;

export async function detectRegion(): Promise<Region | null> {
  if (stopDetection) {
    stopDetection();
    return null;
  }
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
      mouseEvents.removeListener('mouseup', callback);
      stopDetection = null;
      resolve(value);
    };
    stopDetection = () => res(null);
    mouseEvents.on('mouseup', callback);
  }).catch((e) => {
    console.log(e);
    return null;
  });
}

import { mouse, Point, Region } from '@nut-tree-fork/nut-js';
import mouseEvents from 'global-mouse-events';

export async function detectRegion(): Promise<Region | null> {
  return new Promise<Region | null>((resolve) => {
    let p1: Point | null = null;
    let p2: Point | null = null;
    const callback = async (event: MouseEvent) => {
      const point = await mouse.getPosition();
      if (point.x < 10 && point.y < 10) {
        mouseEvents.removeListener('mouseup', callback);
        resolve(null);
      }
      if (event.button === 1) {
        p1 = point;
      } else if (event.button === 2) {
        p2 = point;
      }
      if (p1 !== null && p2 !== null) {
        mouseEvents.removeListener('mouseup', callback);
        resolve(new Region(p1.x, p1.y, p2.x-p1.x, p2.y-p1.y));
      }
    };
    mouseEvents.on('mouseup', callback);
  }).catch((e) => {
    console.log(e);
    return null;
  });
}

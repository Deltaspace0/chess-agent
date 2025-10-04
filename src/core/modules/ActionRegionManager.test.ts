import { describe, expect, it } from 'vitest';
import ActionRegionManager from './ActionRegionManager.ts';
import { MouseMock } from './mock.ts';

const mouse = new MouseMock();

describe('Action region manager', () => {
  it('should do the action when its region is clicked', async () => {
    const actionRegionManager = new ActionRegionManager(mouse, true);
    let value = 0;
    actionRegionManager.addActionRegion({
      callback: () => { value = 42 },
      getRegion: () => ({ left: 20, top: 20, width: 20, height: 20 })
    });
    await mouse.move({ x: 30, y: 30 });
    await mouse.click();
    expect(value).toBe(42);
  });

  it('should not do the action when clicking outside the region', async () => {
    const actionRegionManager = new ActionRegionManager(mouse, true);
    let value = 0;
    actionRegionManager.addActionRegion({
      callback: () => { value = 42 },
      getRegion: () => ({ left: 20, top: 20, width: 20, height: 20 })
    });
    await mouse.move({ x: 50, y: 50 });
    await mouse.click();
    expect(value).toBe(0);
  });

  it('should not do the action when not active', async () => {
    const actionRegionManager = new ActionRegionManager(mouse, false);
    let value = 0;
    actionRegionManager.addActionRegion({
      callback: () => { value = 42 },
      getRegion: () => ({ left: 20, top: 20, width: 20, height: 20 })
    });
    await mouse.move({ x: 30, y: 30 });
    await mouse.click();
    expect(value).toBe(0);
  });
});

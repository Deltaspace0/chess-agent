import { describe, expect, it, vi } from 'vitest';
import ActionRegionManager from './ActionRegionManager.ts';
import { MouseMock } from './device/Mouse.ts';

const mouse = new MouseMock();
const getRegion = () => ({ left: 20, top: 20, width: 20, height: 20 });
const getRegion2 = () => ({ left: 20, top: 40, width: 20, height: 20 });

describe('Action region manager', () => {
  it('should do the action when its region is clicked', async () => {
    const actionRegionManager = new ActionRegionManager(mouse, true);
    const callback = vi.fn();
    actionRegionManager.addActionRegion({ callback, getRegion });
    await mouse.move({ x: 30, y: 30 });
    await mouse.click();
    expect(callback).toHaveBeenCalled();
  });

  it('should not do the action when clicking outside the region', async () => {
    const actionRegionManager = new ActionRegionManager(mouse, true);
    const callback = vi.fn();
    actionRegionManager.addActionRegion({ callback, getRegion });
    await mouse.move({ x: 50, y: 20 });
    await mouse.click();
    expect(callback).not.toHaveBeenCalled();
  });

  it('should not do the action when not active', async () => {
    const actionRegionManager = new ActionRegionManager(mouse, false);
    const callback = vi.fn();
    actionRegionManager.addActionRegion({ callback, getRegion });
    await mouse.move({ x: 30, y: 30 });
    await mouse.click();
    expect(callback).not.toHaveBeenCalled();
  });

  it('should call hover callback when hovering over the region', async () => {
    const actionRegionManager = new ActionRegionManager(mouse, true);
    const callback = vi.fn();
    actionRegionManager.onHover(callback);
    actionRegionManager.addActionRegion({
      name: 'action1',
      callback: () => {},
      getRegion
    });
    actionRegionManager.addActionRegion({
      name: 'action2',
      callback: () => {},
      getRegion: getRegion2
    });
    await mouse.move({ x: 30, y: 30 });
    expect(callback).toHaveBeenCalledWith('action1');
    await mouse.move({ x: 30, y: 50 });
    expect(callback).toHaveBeenCalledWith('action2');
    await mouse.move({ x: 30, y: 80 });
    expect(callback).toHaveBeenCalledWith();
  });
});

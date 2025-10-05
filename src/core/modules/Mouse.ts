import { mouse, sleep, straightTo } from '@nut-tree-fork/nut-js';
import mouseEvents from 'global-mouse-events';

type ListenerType = 'mousedown' | 'mouseup' | 'mousemove' | 'mousewheel';
type Listener = () => void;

export interface Point {
  x: number;
  y: number;
}

export abstract class Mouse {
  private listeners: Record<ListenerType, Set<Listener>> = {
    mousedown: new Set(),
    mouseup: new Set(),
    mousemove: new Set(),
    mousewheel: new Set()
  };
  protected isActive: boolean = true;

  protected notifyListeners(type: ListenerType) {
    if (this.isActive) {
      for (const listener of this.listeners[type]) {
        listener();
      }
    }
  }

  abstract getPosition(): Promise<Point>;
  abstract move(point: Point): Promise<void>;
  abstract click(button: number): Promise<void>;
  abstract press(button: number): Promise<void>;
  abstract release(button: number): Promise<void>;
  abstract sleep(duration: number): Promise<void>;

  setActive(value: boolean) {
    this.isActive = value;
  }

  addListener(type: ListenerType, listener: Listener) {
    this.listeners[type].add(listener);
  }

  removeListener(type: ListenerType, listener: Listener) {
    this.listeners[type].delete(listener);
  }
}

export class ConcreteMouse extends Mouse {
  constructor() {
    super();
    mouseEvents.on('mousedown', () => this.notifyListeners('mousedown'));
    mouseEvents.on('mouseup', () => this.notifyListeners('mouseup'));
    mouseEvents.on('mousemove', () => this.notifyListeners('mousemove'));
    mouseEvents.on('mousewheel', () => this.notifyListeners('mousewheel'));
  }

  getPosition(): Promise<Point> {
    return mouse.getPosition();
  }

  setSpeed(speed: number): void {
    mouse.config.mouseSpeed = speed;
  }

  async move(point: Point): Promise<void> {
    await mouse.move(straightTo(point));
  }

  async click(button: number): Promise<void> {
    await mouse.click(button);
  }

  async press(button: number): Promise<void> {
    await mouse.pressButton(button);
  }

  async release(button: number): Promise<void> {
    await mouse.releaseButton(button);
  }

  async sleep(duration: number): Promise<void> {
    await sleep(duration);
  }
}

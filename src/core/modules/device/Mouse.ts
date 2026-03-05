import { utilityProcess, type UtilityProcess } from 'electron';
import EventEmitter from 'events';
import { mouse, sleep } from '@nut-tree-fork/nut-js';
import path from 'path';
import { uIOhook } from 'uiohook-napi';

const actionWorkerPath = path.join(import.meta.dirname, 'mouse-actions.js');

interface MouseEventMap {
  mousedown: [];
  mouseup: [];
  mousemove: [];
  mousewheel: [];
}

export abstract class Mouse extends EventEmitter<MouseEventMap> {
  protected isActive: boolean = true;

  abstract getPosition(): Promise<Point>;
  abstract move(point: Point): Promise<void>;
  abstract click(button: number): Promise<void>;
  abstract press(button: number): Promise<void>;
  abstract release(button: number): Promise<void>;
  abstract sleep(duration: number): Promise<void>;

  getActive(): boolean {
    return this.isActive;
  }

  setActive(value: boolean) {
    this.isActive = value;
  }
}

export class ConcreteMouse extends Mouse {
  private actionWorker: UtilityProcess;
  private stopListeners = new Set<() => void>();

  constructor() {
    super();
    this.actionWorker = utilityProcess.fork(actionWorkerPath);
    uIOhook.on('mousedown', () => this.emitMouseEvent('mousedown'));
    uIOhook.on('mouseup', () => this.emitMouseEvent('mouseup'));
    uIOhook.on('mousemove', () => this.emitMouseEvent('mousemove'));
    uIOhook.on('wheel', () => this.emitMouseEvent('mousewheel'));
  }

  private emitMouseEvent(event: keyof MouseEventMap) {
    if (this.isActive) {
      this.emit(event);
    }
  }

  private async performAction(action: string, arg: unknown) {
    if (!this.isActive) {
      return;
    }
    const key = performance.now();
    this.actionWorker.postMessage({ action, arg, key });
    return new Promise<void>((resolve, reject) => {
      const listen = (data: { action: string, key: number }) => {
        if (data.action === action && data.key === key) {
          this.actionWorker.off('message', listen);
          this.stopListeners.delete(reject);
          resolve();
        }
      };
      this.actionWorker.on('message', listen);
      this.stopListeners.add(reject);
    });
  }

  setActive(value: boolean) {
    if (this.isActive && !value) {
      this.actionWorker.kill();
      this.actionWorker = utilityProcess.fork(actionWorkerPath);
      for (const listener of this.stopListeners) {
        listener();
      }
    }
    this.isActive = value;
  }

  getPosition(): Promise<Point> {
    return mouse.getPosition();
  }

  setSpeed(speed: number): void {
    mouse.config.mouseSpeed = speed;
  }

  async move(point: Point): Promise<void> {
    if (mouse.config.mouseSpeed > 10000) {
      return this.performAction('move', point);
    }
    return this.performAction('move-straight', point);
  }

  async click(button: number): Promise<void> {
    return this.performAction('click', button);
  }

  async press(button: number): Promise<void> {
    return this.performAction('press', button);
  }

  async release(button: number): Promise<void> {
    return this.performAction('release', button);
  }

  async sleep(duration: number): Promise<void> {
    await sleep(duration);
  }
}

export interface MouseAction {
  type: 'down' | 'up';
  point: Point;
}

export class MouseMock extends Mouse {
  private position: Point = { x: 0, y: 0 };
  private actions: MouseAction[] = [];

  constructor() {
    super();
    this.addListener('mousedown', () => {
      this.actions.push({
        type: 'down',
        point: {...this.position}
      });
    });
    this.addListener('mouseup', () => {
      this.actions.push({
        type: 'up',
        point: {...this.position}
      });
    });
  }

  async getPosition(): Promise<Point> {
    return this.position;  
  }

  async move(point: Point): Promise<void> {
    this.position = point;
    this.emit('mousemove');
  }

  async click(): Promise<void> {
    this.emit('mousedown');
    this.emit('mouseup');
  }

  async press(): Promise<void> {
    this.emit('mousedown');
  }

  async release(): Promise<void> {
    this.emit('mouseup');
  }

  async sleep(): Promise<void> {}

  getActions(): MouseAction[] {
    return this.actions;
  }

  clearActions() {
    this.actions = [];
  }
}

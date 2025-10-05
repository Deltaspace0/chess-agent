import { Mouse, type Point } from './Mouse.ts';

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
    this.notifyListeners('mousemove');
  }

  async click(): Promise<void> {
    this.notifyListeners('mousedown');
    this.notifyListeners('mouseup');
  }

  async press(): Promise<void> {
    this.notifyListeners('mousedown');
  }

  async release(): Promise<void> {
    this.notifyListeners('mouseup');
  }

  async sleep(): Promise<void> {}

  getActions(): MouseAction[] {
    return this.actions;
  }

  clearActions() {
    this.actions = [];
  }
}

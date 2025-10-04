import { Mouse, type Point } from './Mouse.ts';

export class MouseMock extends Mouse {
  private position: Point = { x: 0, y: 0 };

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
}

import { describe, expect, it } from 'vitest';
import Board from './Board.ts';
import { MouseMock, type MouseAction } from './mock.ts';

function getBoard(mouse: MouseMock): Board {
  const board = new Board(mouse);
  board.setDraggingMode(true);
  board.setRegion({ left: 0, top: 0, width: 8, height: 8 });
  board.setPerspective(true);
  return board;
}

function getMatcher(expectedActions: MouseAction[]) {
  return (actions: MouseAction[]) => {
    if (actions.length !== expectedActions.length) {
      return false;
    }
    for (let i = 0; i < actions.length; i++) {
      const { type, point } = actions[i];
      const { type: expectedType, point: expectedPoint } = expectedActions[i];
      if (type !== expectedType) {
        return false;
      }
      const { x, y } = point;
      const { x: ex, y: ey } = expectedPoint;
      if (x < ex || y < ey || x > ex+1 || y > ey+1) {
        return false;
      }
    }
    return true;
  };
}

describe('Board', () => {
  describe('Input', () => {
    it('should detect a dragging move', async () => {
      const mouse = new MouseMock();
      const board = getBoard(mouse);
      const promise = new Promise<void>((resolve) => {
        board.onMove((move) => {
          try {
            expect(move).toBe('d2d4');
            return true;
          } finally {
            resolve();
          }
        });
      });
      await mouse.move({ x: 3.5, y: 6.5 });
      await mouse.press();
      await mouse.move({ x: 3.5, y: 4.5 });
      await mouse.release();
      await promise;
    });

    it('should detect a clicking move', async () => {
      const mouse = new MouseMock();
      const board = getBoard(mouse);
      const promise = new Promise<void>((resolve) => {
        board.onMove((move) => {
          try {
            expect(move).toBe('d2d4');
            return true;
          } finally {
            resolve();
          }
        });
      });
      await mouse.move({ x: 3.5, y: 6.5 });
      await mouse.click();
      await mouse.move({ x: 3.5, y: 4.5 });
      await mouse.click();
      await promise;
    });

    it('should detect a move on the flipped board', async () => {
      const mouse = new MouseMock();
      const board = getBoard(mouse);
      board.setPerspective(false);
      const promise = new Promise<void>((resolve) => {
        board.onMove((move) => {
          try {
            expect(move).toBe('e7e5');
            return true;
          } finally {
            resolve();
          }
        });
      });
      await mouse.move({ x: 3.5, y: 6.5 });
      await mouse.press();
      await mouse.move({ x: 3.5, y: 4.5 });
      await mouse.release();
      await promise;
    });

    it('should detect a pressed square', async () => {
      const mouse = new MouseMock();
      const board = getBoard(mouse);
      const promise = new Promise<void>((resolve) => {
        board.onMouseDownSquare((square) => {
          try {
            expect(square).toBe('b5');
          } finally {
            resolve();
          }
        });
      });
      await mouse.move({ x: 1.5, y: 3.5 });
      await mouse.press();
      await promise;
    });
  });

  describe('Output', () => {
    it('should perform a dragging move', async () => {
      const mouse = new MouseMock();
      const board = getBoard(mouse);
      await board.playMove('e2e4');
      expect(mouse.getActions()).toSatisfy(getMatcher([{
        type: 'down',
        point: { x: 4, y: 6 }
      }, {
        type: 'up',
        point: { x: 4, y: 4 }
      }]));
    });

    it('should perform a clicking move', async () => {
      const mouse = new MouseMock();
      const board = getBoard(mouse);
      board.setDraggingMode(false);
      await board.playMove('e2e4');
      expect(mouse.getActions()).toSatisfy(getMatcher([{
        type: 'down',
        point: { x: 4, y: 6 }
      }, {
        type: 'up',
        point: { x: 4, y: 6 }
      }, {
        type: 'down',
        point: { x: 4, y: 4 }
      }, {
        type: 'up',
        point: { x: 4, y: 4 }
      }]));
    });

    it('should perform a move on the flipped board', async () => {
      const mouse = new MouseMock();
      const board = getBoard(mouse);
      board.setPerspective(false);
      await board.playMove('e2e4');
      expect(mouse.getActions()).toSatisfy(getMatcher([{
        type: 'down',
        point: { x: 3, y: 1 }
      }, {
        type: 'up',
        point: { x: 3, y: 3 }
      }]));
    });

    it('should throw an error when the region is null', async () => {
      const mouse = new MouseMock();
      const board = getBoard(mouse);
      board.setRegion(null);
      await expect(board.playMove('e2e4')).rejects.toThrow();
    });
  });
});

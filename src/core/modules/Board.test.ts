import { describe, expect, it, vi } from 'vitest';
import Board from './Board.ts';
import { MouseMock, type MouseAction } from './device/Mouse.ts';

function getBoard(mouse: MouseMock): Board {
  const board = new Board(mouse);
  board.setDraggingMode(true);
  board.setRegion({ left: 0, top: 0, width: 8, height: 8 });
  board.setPerspective(true);
  board.setAutoPromotion(true);
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
      const callback = vi.fn(() => true);
      board.onMove(callback);
      await mouse.move({ x: 3.5, y: 6.5 });
      await mouse.press();
      await mouse.move({ x: 3.5, y: 4.5 });
      await mouse.release();
      await expect.poll(() => callback).toHaveBeenCalledWith('d2d4');
    });

    it('should detect a clicking move', async () => {
      const mouse = new MouseMock();
      const board = getBoard(mouse);
      const callback = vi.fn(() => true);
      board.onMove(callback);
      await mouse.move({ x: 3.5, y: 6.5 });
      await mouse.click();
      await mouse.move({ x: 3.5, y: 4.5 });
      await mouse.click();
      await expect.poll(() => callback).toHaveBeenCalledWith('d2d4');
    });

    it('should detect a move on click after illegal move', async () => {
      const mouse = new MouseMock();
      const board = getBoard(mouse);
      const firstMove = new Promise<void>((resolve) => {
        board.onMove(() => {
          resolve();
          return false;
        });
      });
      await mouse.move({ x: 3.5, y: 6.5 });
      await mouse.click();
      await mouse.move({ x: 4.5, y: 6.5 });
      await mouse.click();
      await firstMove;
      const callback = vi.fn(() => true);
      board.onMove(callback);
      await mouse.move({ x: 4.5, y: 4.5 });
      await mouse.click();
      await expect.poll(() => callback).toHaveBeenCalledWith('e2e4');
    });

    it('should not detect a move on click after legal move', async () => {
      const mouse = new MouseMock();
      const board = getBoard(mouse);
      const firstMove = new Promise<void>((resolve) => {
        board.onMove(() => {
          resolve();
          return true;
        });
      });
      await mouse.move({ x: 3.5, y: 6.5 });
      await mouse.click();
      await mouse.move({ x: 3.5, y: 4.5 });
      await mouse.click();
      await firstMove;
      const callback = vi.fn(() => false);
      board.onMove(callback);
      await mouse.move({ x: 1.5, y: 1.5 });
      await mouse.click();
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(callback).not.toHaveBeenCalled();
    });

    it('should detect a move on the flipped board', async () => {
      const mouse = new MouseMock();
      const board = getBoard(mouse);
      board.setPerspective(false);
      const callback = vi.fn(() => true);
      board.onMove(callback);
      await mouse.move({ x: 3.5, y: 6.5 });
      await mouse.press();
      await mouse.move({ x: 3.5, y: 4.5 });
      await mouse.release();
      await expect.poll(() => callback).toHaveBeenCalledWith('e7e5');
    });

    it('should detect a pressed square', async () => {
      const mouse = new MouseMock();
      const board = getBoard(mouse);
      const callback = vi.fn();
      board.onMouseDownSquare(callback);
      await mouse.move({ x: 1.5, y: 3.5 });
      await mouse.press();
      await expect.poll(() => callback).toHaveBeenCalledWith('b5');
    });
  
    describe('Promotion', () => {
      it('should detect Queen promotion', async () => {
        const mouse = new MouseMock();
        const board = getBoard(mouse);
        const callback = vi.fn();
        board.onPromotion(callback);
        board.setPromotionMove('a7a8');
        await mouse.move({ x: 0.5, y: 0.5 });
        await mouse.click();
        await expect.poll(() => callback).toHaveBeenCalledWith('q');
      });

      it('should detect Knight promotion', async () => {
        const mouse = new MouseMock();
        const board = getBoard(mouse);
        const callback = vi.fn();
        board.onPromotion(callback);
        board.setPromotionMove('b7b8');
        await mouse.move({ x: 1.5, y: 1.5 });
        await mouse.click();
        await expect.poll(() => callback).toHaveBeenCalledWith('n');
      });

      it('should detect Rook promotion', async () => {
        const mouse = new MouseMock();
        const board = getBoard(mouse);
        const callback = vi.fn();
        board.onPromotion(callback);
        board.setPromotionMove('c7c8');
        await mouse.move({ x: 2.5, y: 2.5 });
        await mouse.click();
        await expect.poll(() => callback).toHaveBeenCalledWith('r');
      });

      it('should detect Bishop promotion', async () => {
        const mouse = new MouseMock();
        const board = getBoard(mouse);
        const callback = vi.fn();
        board.onPromotion(callback);
        board.setPromotionMove('d7d8');
        await mouse.move({ x: 3.5, y: 3.5 });
        await mouse.click();
        await expect.poll(() => callback).toHaveBeenCalledWith('b');
      });

      it('should detect Bishop promotion on the flipped board', async () => {
        const mouse = new MouseMock();
        const board = getBoard(mouse);
        board.setPerspective(false);
        const callback = vi.fn();
        board.onPromotion(callback);
        board.setPromotionMove('d7d8');
        await mouse.move({ x: 4.5, y: 4.5 });
        await mouse.click();
        await expect.poll(() => callback).toHaveBeenCalledWith('b');
      });

      it('should not detect promotion with disabled autoPromotion', async () => {
        const mouse = new MouseMock();
        const board = getBoard(mouse);
        board.setAutoPromotion(false);
        const callback = vi.fn();
        board.onPromotion(callback);
        board.setPromotionMove('d7d8');
        await mouse.move({ x: 3.5, y: 3.5 });
        await mouse.click();
        await new Promise((resolve) => setTimeout(resolve, 10));
        expect(callback).not.toHaveBeenCalled();
      });
    });
  });

  describe('Output', () => {
    describe('Move', () => {
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

    describe('Promotion', () => {
      it('should promote to Queen', async () => {
        const mouse = new MouseMock();
        const board = getBoard(mouse);
        await board.playMove('g7f8q');
        expect(mouse.getActions()).toSatisfy(getMatcher([{
          type: 'down',
          point: { x: 6, y: 1 }
        }, {
          type: 'up',
          point: { x: 5, y: 0 }
        }, {
          type: 'down',
          point: { x: 5, y: 0 }
        }, {
          type: 'up',
          point: { x: 5, y: 0 }
        }]));
      });

      it('should promote to Knight', async () => {
        const mouse = new MouseMock();
        const board = getBoard(mouse);
        await board.playMove('g7g8n');
        expect(mouse.getActions()).toSatisfy(getMatcher([{
          type: 'down',
          point: { x: 6, y: 1 }
        }, {
          type: 'up',
          point: { x: 6, y: 0 }
        }, {
          type: 'down',
          point: { x: 6, y: 1 }
        }, {
          type: 'up',
          point: { x: 6, y: 1 }
        }]));
      });

      it('should promote to Rook', async () => {
        const mouse = new MouseMock();
        const board = getBoard(mouse);
        await board.playMove('g7h8r');
        expect(mouse.getActions()).toSatisfy(getMatcher([{
          type: 'down',
          point: { x: 6, y: 1 }
        }, {
          type: 'up',
          point: { x: 7, y: 0 }
        }, {
          type: 'down',
          point: { x: 7, y: 2 }
        }, {
          type: 'up',
          point: { x: 7, y: 2 }
        }]));
      });

      it('should promote to Bishop', async () => {
        const mouse = new MouseMock();
        const board = getBoard(mouse);
        await board.playMove('a7a8b');
        expect(mouse.getActions()).toSatisfy(getMatcher([{
          type: 'down',
          point: { x: 0, y: 1 }
        }, {
          type: 'up',
          point: { x: 0, y: 0 }
        }, {
          type: 'down',
          point: { x: 0, y: 3 }
        }, {
          type: 'up',
          point: { x: 0, y: 3 }
        }]));
      });

      it('should promote to Bishop on the flipped board', async () => {
        const mouse = new MouseMock();
        const board = getBoard(mouse);
        board.setPerspective(false);
        await board.playMove('a7a8b');
        expect(mouse.getActions()).toSatisfy(getMatcher([{
          type: 'down',
          point: { x: 7, y: 6 }
        }, {
          type: 'up',
          point: { x: 7, y: 7 }
        }, {
          type: 'down',
          point: { x: 7, y: 4 }
        }, {
          type: 'up',
          point: { x: 7, y: 4 }
        }]));
      });

      it('should not promote with disabled autoPromotion', async () => {
        const mouse = new MouseMock();
        const board = getBoard(mouse);
        board.setAutoPromotion(false);
        await board.playMove('a7a8b');
        expect(mouse.getActions()).toSatisfy(getMatcher([{
          type: 'down',
          point: { x: 0, y: 1 }
        }, {
          type: 'up',
          point: { x: 0, y: 0 }
        }]));
      });
    });
  });
});

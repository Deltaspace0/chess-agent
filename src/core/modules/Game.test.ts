import { describe, expect, it, vi } from 'vitest';
import Game from './Game.ts';

describe('Game', () => {
  describe('UCI formatting', () => {
    it('should format uci cp evaluation with moves', () => {
      const game = new Game();
      game.move('e2e4');
      const input = 'cp 28 c7c5 g1f3 b8c6 d2d4 c5d4 f3d4';
      const output = '0.28  1. ... c5 2. Nf3 Nc6 3. d4 cxd4 4. Nxd4 *';
      expect(game.formatEvalMoves(input)).toBe(output);
    });

    it('should format uci mate evaluation with moves', () => {
      const game = new Game();
      game.move('f2f3');
      game.move('e7e5');
      game.move('g2g4');
      const input = 'mate -1 d8h4';
      const output = 'M-1  2. ... Qh4# *';
      expect(game.formatEvalMoves(input)).toBe(output);
    });
  });

  describe('Position editing', () => {
    it('should put new piece on the board', () => {
      const game = new Game();
      game.load('6k1/5p1p/6p1/8/8/7P/5PP1/6K1 w - - 0 1');
      const callback = vi.fn();
      game.onUpdatePosition(callback);
      const result = game.putPiece({
        sourceSquare: null,
        targetSquare: 'a2',
        piece: 'wp'
      });
      expect(result).toBe(true);
      const expectedFen = '6k1/5p1p/6p1/8/8/7P/P4PP1/6K1 w - - 0 1';
      expect(callback).toHaveBeenCalledWith(expectedFen);
    });

    it('should remove a piece from the board', () => {
      const game = new Game();
      game.load('6k1/5p1p/6p1/8/8/7P/P4PP1/6K1 w - - 0 1');
      const callback = vi.fn();
      game.onUpdatePosition(callback);
      const result = game.putPiece({
        sourceSquare: 'a2',
        targetSquare: null,
        piece: 'wp'
      });
      expect(result).toBe(true);
      const expectedFen = '6k1/5p1p/6p1/8/8/7P/5PP1/6K1 w - - 0 1';
      expect(callback).toHaveBeenCalledWith(expectedFen);
    });

    it('should move a piece to a new square', () => {
      const game = new Game();
      game.load('6k1/5p1p/6p1/8/8/7P/5PP1/6K1 w - - 0 1');
      const callback = vi.fn();
      game.onUpdatePosition(callback);
      const result = game.putPiece({
        sourceSquare: 'f2',
        targetSquare: 'a2',
        piece: 'wp'
      });
      expect(result).toBe(true);
      const expectedFen = '6k1/5p1p/6p1/8/8/7P/P5P1/6K1 w - - 0 1';
      expect(callback).toHaveBeenCalledWith(expectedFen);
    });

    it('should change the turn when the enemy King is attacked', () => {
      const game = new Game();
      game.load('6k1/5p1p/6p1/8/8/7P/5PP1/6K1 w - - 0 1');
      const callback = vi.fn();
      game.onUpdatePosition(callback);
      const result = game.putPiece({
        sourceSquare: null,
        targetSquare: 'a8',
        piece: 'wr'
      });
      expect(result).toBe(true);
      const expectedFen = 'R5k1/5p1p/6p1/8/8/7P/5PP1/6K1 b - - 1 1';
      expect(callback).toHaveBeenCalledWith(expectedFen);
    });

    it('should not put the second White (Black) King on the board', () => {
      const game = new Game();
      game.load('6k1/5p1p/6p1/8/8/7P/5PP1/6K1 w - - 0 1');
      const callback = vi.fn();
      game.onUpdatePosition(callback);
      const result = game.putPiece({
        sourceSquare: null,
        targetSquare: 'f1',
        piece: 'wk'
      });
      expect(result).toBe(false);
      expect(callback).not.toHaveBeenCalled();
    })
  });

  describe('Move skipping', () => {
    it('should skip a move if the position allows it', () => {
      const game = new Game();
      game.load('6k1/5p1p/6p1/8/8/7P/5PP1/6K1 w - - 0 1');
      const callback = vi.fn();
      game.onUpdatePosition(callback);
      const result = game.skipMove();
      expect(result).toBe('b');
      const expectedFen = '6k1/5p1p/6p1/8/8/7P/5PP1/6K1 b - - 1 1';
      expect(callback).toHaveBeenCalledWith(expectedFen);
    });

    it('should not skip a move if the position does not allow it', () => {
      const game = new Game();
      game.load('R5k1/5p1p/6p1/8/8/7P/5PP1/6K1 b - - 1 1');
      const callback = vi.fn();
      game.onUpdatePosition(callback);
      const result = game.skipMove();
      expect(result).toBe(null);
      expect(callback).not.toHaveBeenCalled();
    });
  });
});

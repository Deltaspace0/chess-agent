import type { Piece } from 'chess.js';
import { describe, expect, it, vi } from 'vitest';
import Game from './Game.ts';

function getPieces(game: Game): [Piece, number, number][] {
  const board = game.board();
  const pieces: [Piece, number, number][] = [];
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      const piece = board[i][j];
      if (piece) {
        pieces.push([piece, i, j]);
      }
    }
  }
  return pieces;
}

describe('Game', () => {
  describe('UCI formatting', () => {
    it('should format uci cp evaluation with moves', () => {
      const game = new Game();
      game.move('e2e4');
      const { pgn } = game.formatPrincipalVariation({
        evaluation: 'cp 28',
        variation: 'c7c5 g1f3 b8c6 d2d4 c5d4 f3d4'
      });
      const output = '0.28  1. ... c5 2. Nf3 Nc6 3. d4 cxd4 4. Nxd4 *';
      expect(pgn).toBe(output);
    });

    it('should format uci mate evaluation with moves', () => {
      const game = new Game();
      game.move('f2f3');
      game.move('e7e5');
      game.move('g2g4');
      const { pgn } = game.formatPrincipalVariation({
        evaluation: 'mate -1',
        variation: 'd8h4'
      });
      const output = 'M-1  2. ... Qh4# *';
      expect(pgn).toBe(output);
    });
  });

  describe('Position editing', () => {
    it('should put new piece on the board', () => {
      const game = new Game();
      game.load('6k1/5p1p/6p1/8/8/7P/5PP1/6K1 w - - 0 1');
      const callback = vi.fn();
      game.onUpdatePosition(callback);
      const result = game.putPieceEdit({
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
      const result = game.putPieceEdit({
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
      const result = game.putPieceEdit({
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
      const result = game.putPieceEdit({
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
      const result = game.putPieceEdit({
        sourceSquare: null,
        targetSquare: 'f1',
        piece: 'wk'
      });
      expect(result).toBe(false);
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('Auto castling', () => {
    it('should automatically set castling rights if possible', () => {
      const game = new Game();
      game.setAutoCastling(true);
      game.load('rnbqkbnr/pppppppp/8/8/8/3K4/PPPPPPPP/RNBQ1BNR w kq - 0 1');
      const callback = vi.fn();
      game.onUpdatePosition(callback);
      game.putPieceEdit({
        sourceSquare: 'd3',
        targetSquare: 'e1',
        piece: 'wk'
      });
      const expectedFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
      expect(callback).toHaveBeenCalledWith(expectedFen);
    });

    it('should not set castling rights if auto castling is disabled', () => {
      const game = new Game();
      game.setAutoCastling(false);
      game.load('rnbqkbnr/pppppppp/8/8/8/3K4/PPPPPPPP/RNBQ1BNR w kq - 0 1');
      const callback = vi.fn();
      game.onUpdatePosition(callback);
      game.putPieceEdit({
        sourceSquare: 'd3',
        targetSquare: 'e1',
        piece: 'wk'
      });
      const expectedFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w kq - 0 1';
      expect(callback).toHaveBeenCalledWith(expectedFen);
    });
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

  describe('Move finding', () => {
    it('should return empty moves if position is the same', () => {
      const game = new Game();
      game.load('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
      const fen = game.fen();
      const moves = game.findMovesForPieces(getPieces(game));
      expect(moves).toStrictEqual([]);
      expect(fen).toBe(game.fen());
    });

    it('should return null if position is unreachable', () => {
      const game = new Game();
      game.load('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/rNBQKBNR w KQkq - 0 1');
      const pieces = getPieces(game);
      game.load('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
      const fen = game.fen();
      const moves = game.findMovesForPieces(pieces);
      expect(moves).toBe(null);
      expect(fen).toBe(game.fen());
    });

    it('should return null if position is unreachable (2)', () => {
      const game = new Game();
      game.load('rn2kbnr/p1pp1ppp/1p2p1q1/4P2P/3P4/2NB1Q2/PPP2PP1/R1B1K1NR b KQkq - 2 7');
      const pieces = getPieces(game);
      game.load('rn2kbnr/p1pp1ppp/1p2p1q1/4P2P/3P4/2NB1b2/PPP2PP1/R1BQK1NR b KQkq - 2 7');
      const fen = game.fen();
      const moves = game.findMovesForPieces(pieces);
      expect(moves).toBe(null);
      expect(fen).toBe(game.fen());
    });

    it('should return one move', () => {
      const game = new Game();
      game.load('rnbqkbnr/pppppppp/8/8/8/5N2/PPPPPPPP/RNBQKB1R w KQkq - 0 1');
      const pieces = getPieces(game);
      game.load('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
      const fen = game.fen();
      const moves = game.findMovesForPieces(pieces);
      expect(moves).toStrictEqual(['g1f3']);
      expect(fen).toBe(game.fen());
    });

    it('should return two moves', () => {
      const game = new Game();
      game.load('r1b1k2r/ppp1bppp/2n5/3qp3/8/3P1NP1/PP2PP1P/R1BQKB1R w KQkq - 0 8');
      const pieces = getPieces(game);
      game.load('r1bqk2r/ppp1bppp/2n5/3np3/8/2NP1NP1/PP2PP1P/R1BQKB1R w KQkq - 1 7');
      const fen = game.fen();
      const moves = game.findMovesForPieces(pieces);
      expect(moves).toStrictEqual(['c3d5', 'd8d5']);
      expect(fen).toBe(game.fen());
    });

    it('should return three moves', () => {
      const game = new Game();
      game.load('rn2kbnr/p1pp1ppp/1p2p1q1/4P2P/3P4/2N2b2/PPP2PP1/R1BQKBNR w KQkq - 1 7');
      const pieces = getPieces(game);
      game.load('rnb1kbnr/p1pp1ppp/1p2p1q1/4P3/3P3P/2N5/PPP2PP1/R1BQKBNR b KQkq - 0 5');
      const fen = game.fen();
      const moves = game.findMovesForPieces(pieces);
      expect(moves).toStrictEqual(['c8b7', 'h4h5', 'b7f3']);
      expect(fen).toBe(game.fen());
    });

    it('should return three moves (2)', () => {
      const game = new Game();
      game.load('rn1k1bnr/p1pp1ppp/1p2p1q1/4P2P/3P4/2NB1Q2/PPP2PP1/R1B1K1NR b KQ - 0 8');
      const pieces = getPieces(game);
      game.load('rn2kbnr/p1pp1ppp/1p2p1q1/4P2P/3P4/2N2b2/PPP2PP1/R1BQKBNR w KQkq - 1 7');
      const fen = game.fen();
      const moves = game.findMovesForPieces(pieces);
      expect(moves).toStrictEqual(['f1d3', 'e8d8', 'd1f3']);
      expect(fen).toBe(game.fen());
    });

    it('should return three moves (3)', () => {
      const game = new Game();
      game.load('5R2/p2k1R2/1p6/8/4P3/5P2/P5B1/6K1 b - - 2 37');
      const pieces = getPieces(game);
      game.load('4kr2/p4R2/1p6/8/4PR2/5P2/P5B1/6K1 w - - 1 36');
      const fen = game.fen();
      const moves = game.findMovesForPieces(pieces);
      expect(moves).toStrictEqual(['f7f8', 'e8d7', 'f4f7']);
      expect(fen).toBe(game.fen());
    });

    it('should find en passant move', () => {
      const game = new Game();
      game.load('rnbqkb1r/pp1p1ppp/2P1pn2/8/8/8/PPP1PPPP/RNBQKBNR w KQkq - 1 4');
      const pieces = getPieces(game);
      game.load('rnbqkbnr/pp1p1ppp/4p3/2pP4/8/8/PPP1PPPP/RNBQKBNR w KQkq c6 0 3');
      const moves = game.findMovesForPieces(pieces);
      const fen = game.fen();
      expect(moves).toStrictEqual(['d5c6', 'g8f6']);
      expect(fen).toBe(game.fen());
    });
  });
});

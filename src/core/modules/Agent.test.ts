import { describe, expect, it, vi } from 'vitest';
import type { Piece } from 'chess.js';
import { Agent } from './Agent.ts';
import Game from './Game.ts';
import type { AgentEngine, AgentRecognizer } from './Agent.ts';

function getEngineMock(): AgentEngine {
  return {
    reset: vi.fn(),
    clear: vi.fn(),
    undo: vi.fn(),
    sendMove: vi.fn(),
    getBestMove: vi.fn(),
    getPonderMove: vi.fn(),
    onBestMove: vi.fn()
  };
}

function getRecognizerMock(): AgentRecognizer {
  let resolveMove: (() => void) | null = null;
  return {
    recognizeBoard: vi.fn(),
    isScanning: vi.fn(() => resolveMove !== null),
    stopScanning: vi.fn(() => resolveMove && resolveMove()),
    scanMove: vi.fn(() => new Promise<string>((_, reject) => {
      resolveMove = reject;
    }))
  };
}

function getAgent(engine: AgentEngine, recognizer: AgentRecognizer): Agent {
  return new Agent({ engine, game: new Game(), recognizer });
}

describe('Agent', () => {
  describe('Best move', () => {
    it('should return the best move immediately', async () => {
      const engine = getEngineMock();
      const agent = getAgent(engine, getRecognizerMock());
      engine.getBestMove = vi.fn(() => 'e2e4');
      const move = await agent.findBestMove();
      expect(move).toBe('e2e4');
      expect(engine.getBestMove).toHaveBeenCalled();
    });

    it('should return the best move after waiting', async () => {
      const engine = getEngineMock();
      const agent = getAgent(engine, getRecognizerMock());
      engine.getBestMove = vi.fn(() => null);
      engine.onBestMove = vi.fn((f) => f('e2e4'));
      const move = await agent.findBestMove();
      expect(move).toBe('e2e4');
      expect(engine.onBestMove).toHaveBeenCalled();
    });

    it('should stop waiting for the best move', async () => {
      const engine = getEngineMock();
      const agent = getAgent(engine, getRecognizerMock());
      engine.getBestMove = vi.fn(() => null);
      const movePromise = agent.findBestMove();
      agent.findBestMove();
      expect(movePromise).resolves.toBe(null);
    })
  });

  describe('Scanning', () => {
    it('should process the scanned move', async () => {
      const recognizer = getRecognizerMock();
      recognizer.scanMove = vi.fn(() => Promise.resolve('e2e4'));
      const agent = getAgent(getEngineMock(), recognizer);
      const callback = vi.fn();
      agent.onMove(callback);
      const move = await agent.scanMove();
      expect(move).toBe('e2e4');
      expect(recognizer.scanMove).toHaveBeenCalled();
      expect(callback).toHaveBeenCalledWith('e2e4');
    });

    it('should stop the move scanning', async () => {
      const recognizer = getRecognizerMock();
      const agent = getAgent(getEngineMock(), recognizer);
      const callback = vi.fn();
      agent.onMove(callback);
      const movePromise = agent.scanMove();
      agent.scanMove();
      expect(movePromise).resolves.toBe(null);
      expect(recognizer.isScanning).toHaveBeenCalled();
      expect(recognizer.stopScanning).toHaveBeenCalled();
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('Recognition', () => {
    it('should reset the engine with recognized position', async () => {
      const engine = getEngineMock();
      const recognizer = getRecognizerMock();
      recognizer.recognizeBoard = vi.fn(() => Promise.resolve([
        [{ color: 'b', type: 'k' }, 0, 7],
        [{ color: 'w', type: 'k' }, 7, 7]
      ] as [Piece, number, number][]));
      const agent = getAgent(engine, recognizer);
      await agent.recognizeBoard();
      expect(recognizer.recognizeBoard).toHaveBeenCalled();
      const expectedFen = '7k/8/8/8/8/8/8/7K w - - 0 1';
      expect(engine.reset).toHaveBeenCalledWith(expectedFen);
    });

    it('should clear the engine if there are no kings', async () => {
      const engine = getEngineMock();
      const recognizer = getRecognizerMock();
      recognizer.recognizeBoard = vi.fn(() => Promise.resolve([]));
      const agent = getAgent(engine, recognizer);
      await agent.recognizeBoard();
      expect(engine.clear).toHaveBeenCalled();
    });
  });

  describe('Promotion', () => {
    it('should make a promotion request', () => {
      const agent = getAgent(getEngineMock(), getRecognizerMock());
      const callback = vi.fn();
      agent.onPromotion(callback);
      agent.loadPosition('6k1/1P6/8/8/8/8/8/6K1 w - - 0 1');
      agent.processMove('b7b8');
      expect(callback).toHaveBeenCalled();
    });

    it('should not make a promotion request on illegal move', () => {
      const agent = getAgent(getEngineMock(), getRecognizerMock());
      const callback = vi.fn();
      agent.onPromotion(callback);
      agent.loadPosition('6k1/1P6/8/8/8/8/8/6K1 w - - 0 1');
      agent.processMove('b7a8');
      expect(callback).not.toHaveBeenCalled();
    });

    it('should promote a pawn to the chosen piece', () => {
      const engine = getEngineMock();
      const agent = getAgent(engine, getRecognizerMock());
      agent.loadPosition('6k1/1P6/8/8/8/8/8/6K1 w - - 0 1');
      agent.processMove('b7b8');
      agent.promoteTo('q');
      expect(engine.sendMove).toHaveBeenCalledWith('b7b8q', false);
    });

    it('should automatically promote to the best move', async () => {
      const engine = getEngineMock();
      engine.getBestMove = vi.fn(() => 'b7b8r');
      const agent = getAgent(engine, getRecognizerMock());
      agent.loadPosition('6k1/1P6/8/8/8/8/8/6K1 w - - 0 1');
      await agent.findBestMove();
      agent.processMove('b7b8');
      expect(engine.sendMove).toHaveBeenCalledWith('b7b8r', false);
    });
  });
});

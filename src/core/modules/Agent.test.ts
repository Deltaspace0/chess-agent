import { describe, expect, it, vi } from 'vitest';
import type { Piece } from 'chess.js';
import { Agent } from './Agent.ts';
import Game from './Game.ts';
import type { AgentEngine, AgentRecognizer } from './Agent.ts';

function getEngineMock(bestMove?: string): AgentEngine {
  return {
    reset: vi.fn(),
    clear: vi.fn(),
    undo: vi.fn(),
    sendMove: vi.fn(),
    getEngineInfo: vi.fn(() => ({ bestMove, principalVariations: [] })),
    onEngineInfo: vi.fn(),
    offEngineInfo: vi.fn()
  };
}

function getRecognizerMock(): AgentRecognizer<void> {
  let resolveMove: (() => void) | null = null;
  return {
    recognizeBoard: vi.fn(() => Promise.resolve([])),
    isWaitingMove: vi.fn(() => resolveMove !== null),
    stopWaitingMove: vi.fn(() => resolveMove && resolveMove()),
    waitMove: vi.fn(() => new Promise<void>((_, reject) => {
      resolveMove = reject;
    }))
  };
}

function getAgent(
  engine: AgentEngine,
  recognizer: AgentRecognizer<void>
): Agent<void> {
  return new Agent({ engine, game: new Game(), recognizer });
}

describe('Agent', () => {
  describe('Move processing', () => {
    it('should process a legal move', () => {
      const agent = getAgent(getEngineMock(), getRecognizerMock());
      const callback = vi.fn();
      agent.onMoves(callback);
      const result = agent.processMove('e2e4');
      expect(result).toBe(true);
      expect(callback).toHaveBeenCalledWith(['e2e4']);
    });

    it('should process an illegal move', () => {
      const agent = getAgent(getEngineMock(), getRecognizerMock());
      const callback = vi.fn();
      agent.onMoves(callback);
      const result = agent.processMove('e2e5');
      expect(result).toBe(false);
      expect(callback).not.toHaveBeenCalled();
    });

    it('should not call onMove after checkmate', () => {
      const agent = getAgent(getEngineMock(), getRecognizerMock());
      const callback = vi.fn();
      agent.processMove('f2f3');
      agent.processMove('e7e5');
      agent.processMove('g2g4');
      agent.onMoves(callback);
      const result = agent.processMove('d8h4');
      expect(result).toBe(true);
      expect(callback).not.toHaveBeenCalled();
    });

    it('should undo a move when undo keyword is sent', () => {
      const engine = getEngineMock();
      const agent = getAgent(engine, getRecognizerMock());
      agent.processMove('f2f3');
      const result = agent.processMove('undo');
      expect(result).toBe(true);
      expect(engine.undo).toHaveBeenCalled();
      expect(agent.processMove('d7d5')).toBe(false);
      expect(agent.processMove('f2f4')).toBe(true);
    });
  });

  describe('Best move', () => {
    it('should return the best move immediately', async () => {
      const engine = getEngineMock('e2e4');
      const agent = getAgent(engine, getRecognizerMock());
      const move = await agent.findBestMove();
      expect(move).toBe('e2e4');
      expect(engine.getEngineInfo).toHaveBeenCalled();
      expect(engine.offEngineInfo).not.toHaveBeenCalled();
    });

    it('should return the best move after waiting', async () => {
      const engine = getEngineMock();
      const agent = getAgent(engine, getRecognizerMock());
      engine.onEngineInfo = vi.fn((f) => f({ bestMove: 'e2e4' }));
      const move = await agent.findBestMove();
      expect(move).toBe('e2e4');
      expect(engine.onEngineInfo).toHaveBeenCalled();
      expect(engine.offEngineInfo).toHaveBeenCalled();
    });

    it('should stop waiting for the best move', async () => {
      const engine = getEngineMock();
      const agent = getAgent(engine, getRecognizerMock());
      const movePromise = agent.findBestMove();
      agent.findBestMove();
      await expect(movePromise).resolves.toBe(null);
      expect(engine.offEngineInfo).toHaveBeenCalled();
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
      const agent = getAgent(engine, recognizer);
      await agent.recognizeBoard();
      expect(engine.clear).toHaveBeenCalled();
    });

    it('should recognize board after move', async () => {
      const recognizer = getRecognizerMock();
      recognizer.waitMove = vi.fn(() => Promise.resolve());
      const agent = getAgent(getEngineMock(), recognizer);
      await agent.recognizeBoardAfterMove();
      expect(recognizer.waitMove).toHaveBeenCalled();
      expect(recognizer.recognizeBoard).toHaveBeenCalled();
    });

    it('should stop waiting move', async () => {
      const recognizer = getRecognizerMock();
      const agent = getAgent(getEngineMock(), recognizer);
      agent.recognizeBoardAfterMove();
      agent.recognizeBoardAfterMove();
      expect(recognizer.isWaitingMove).toHaveBeenCalled();
      expect(recognizer.stopWaitingMove).toHaveBeenCalled();
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
      const engine = getEngineMock('b7b8r');
      const agent = getAgent(engine, getRecognizerMock());
      agent.loadPosition('6k1/1P6/8/8/8/8/8/6K1 w - - 0 1');
      await agent.findBestMove();
      agent.processMove('b7b8');
      expect(engine.sendMove).toHaveBeenCalledWith('b7b8r', false);
    });
  });
});

import { describe, expect, it, vi } from 'vitest';
import EngineUCI from './EngineUCI.ts';
import EngineProcess from './EngineProcess.ts';

class ProcessMock extends EngineProcess {
  private messages: string[] = [];
  private resolveMessage: ((message: string) => void) | null = null;

  send(message: string) {
    if (this.resolveMessage) {
      this.resolveMessage(message);
      this.resolveMessage = null;
    } else {
      this.messages.push(message);
    }
  }

  async nextMessage(): Promise<string> {
    const result = this.messages.shift();
    if (result !== undefined) {
      return result;
    }
    return new Promise((resolve) => {
      this.resolveMessage = resolve;
    });
  }

  getMessageCount(): number {
    return this.messages.length;
  }

  output(data: string) {
    this.emit('stdout', data);
  }
}

async function waitMessageMatch(process: ProcessMock, regexp: RegExp) {
  while (true) {
    const message = await process.nextMessage();
    if (message.match(regexp)) {
      return;
    }
  }
}

function getEngine(process: ProcessMock): EngineUCI {
  const engine = new EngineUCI();
  engine.setProcess(process);
  return engine;
}

async function getInitializedEngine(process: ProcessMock): Promise<EngineUCI> {
  const engine = getEngine(process);
  await process.nextMessage();
  process.output('uciok');
  await waitMessageMatch(process, /^setoption name /);
  await waitMessageMatch(process, /^position /);
  await waitMessageMatch(process, /^go /);
  return engine;
}

describe('EngineUCI', () => {
  describe('Initialization', () => {
    it('should send uci and nothing after not receiving uciok', async () => {
      const process = new ProcessMock();
      getEngine(process);
      await expect(process.nextMessage()).resolves.toBe('uci');
      await new Promise((resolve) => setTimeout(resolve, 5));
      expect(process.getMessageCount()).toBe(0);
      process.output('no');
      await new Promise((resolve) => setTimeout(resolve, 5));
      expect(process.getMessageCount()).toBe(0);
    });
  });

  describe('Input', () => {
    it('should send new option to the process', async () => {
      const process = new ProcessMock();
      const engine = await getInitializedEngine(process);
      engine.setOption('threads', 3);
      const next = () => expect(process.nextMessage()).resolves;
      await next().toBe('stop');
      await next().toBe('setoption name Threads value 3');
    });

    it('should send move to the engine', async () => {
      const process = new ProcessMock();
      const engine = await getInitializedEngine(process);
      engine.sendMove('e2e4');
      const next = () => expect(process.nextMessage()).resolves;
      await next().toBe('stop');
      await next().toBe('position startpos moves e2e4');
      await next().toMatch(/^go /);
      expect(engine.getMoves()).toBe('e2e4');
    });

    it('should reset the position with custom fen', async () => {
      const process = new ProcessMock();
      const engine = await getInitializedEngine(process);
      engine.reset('<custom fen>');
      const next = () => expect(process.nextMessage()).resolves;
      await next().toBe('stop');
      await next().toMatch(/position fen <custom fen>/);
      await next().toMatch(/^go /);
    });

    it('should undo move', async () => {
      const process = new ProcessMock();
      const engine = await getInitializedEngine(process);
      engine.sendMove('e2e4');
      engine.sendMove('e7e5');
      engine.undo();
      expect(engine.getMoves()).toBe('e2e4');
    });
  });

  describe('Output', () => {
    it('should receive uci name and author', async () => {
      const process = new ProcessMock();
      const engine = getEngine(process);
      const listener = vi.fn();
      engine.addListener('info', listener);
      process.output('id name <test name>');
      process.output('id author <test author>');
      await expect.poll(() => listener).toHaveBeenCalledWith({
        name: '<test name>',
        author: '<test author>',
        principalVariations: []
      });
    });

    it('should send correct engine info', async () => {
      const process = new ProcessMock();
      const engine = await getInitializedEngine(process);
      const listener = vi.fn();
      engine.addListener('info', listener);
      engine.sendMove('f2f3');
      process.output('info depth 13 seldepth 20 multipv 1 score cp 96 nodes '+
        '322797 nps 321831 hashfull 148 tbhits 0 time 1003 pv e7e5');
      await expect.poll(() => listener).toHaveBeenCalledWith({
        depth: 13,
        nodes: 322797,
        nodesPerSecond: 321831,
        time: 1003,
        principalVariations: [{ evaluation: 'cp -96', variation: 'e7e5' }]
      });
    });

    it('should send correct principal variations', async () => {
      const process = new ProcessMock();
      const engine = await getInitializedEngine(process);
      engine.setOption('multiPV', 3);
      await waitMessageMatch(process, /^go /);
      const listener = vi.fn();
      engine.addListener('info', listener);
      process.output('info depth 13 seldepth 19 multipv 1 score cp 80 nodes '+
        '252001 nps 251498 hashfull 102 tbhits 0 time 1002 pv e2e4');
      process.output('info depth 12 seldepth 17 multipv 2 score cp 52 nodes '+
        '252001 nps 251498 hashfull 102 tbhits 0 time 1002 pv c2c4 e7e6');
      process.output('info depth 12 seldepth 12 multipv 3 score cp 52 nodes '+
        '252001 nps 251498 hashfull 102 tbhits 0 time 1002 pv d2d4 d7d5');
      await expect.poll(() => listener).toHaveBeenCalledWith(
        expect.objectContaining({ principalVariations: [
          { evaluation: 'cp 80', variation: 'e2e4' },
          { evaluation: 'cp 52', variation: 'c2c4 e7e6' },
          { evaluation: 'cp 52', variation: 'd2d4 d7d5' }
        ] })
      );
    });

    it('should send best and ponder moves', async () => {
      const process = new ProcessMock();
      const engine = await getInitializedEngine(process);
      const listener = vi.fn();
      engine.addListener('info', listener);
      process.output('bestmove e2e4 ponder e7e5');
      await expect.poll(() => listener).toHaveBeenCalledWith(
        expect.objectContaining({ bestMove: 'e2e4', ponderMove: 'e7e5' })
      );
    });

    it('should not send ponder move if it is not provided', async () => {
      const process = new ProcessMock();
      const engine = await getInitializedEngine(process);
      const listener = vi.fn();
      engine.addListener('info', listener);
      process.output('bestmove e2e4');
      await expect.poll(() => listener).toHaveBeenCalledWith(
        expect.objectContaining({ bestMove: 'e2e4', ponderMove: undefined })
      );
    });
  });
});

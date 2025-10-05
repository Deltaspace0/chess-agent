import { describe, expect, it, vi } from 'vitest';
import Engine from './Engine.ts';
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
    this.sendToListeners('stdout', data);
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

function getEngine(process: ProcessMock): Engine {
  const engine = new Engine();
  engine.setProcess(process);
  return engine;
}

async function getInitializedEngine(process: ProcessMock): Promise<Engine> {
  const engine = getEngine(process);
  await process.nextMessage();
  process.output('uciok');
  await waitMessageMatch(process, /^setoption name /);
  await waitMessageMatch(process, /^position /);
  await waitMessageMatch(process, /^go /);
  return engine;
}

describe('Engine', () => {
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
      const callback = vi.fn();
      engine.onEngineInfo(callback);
      process.output('id name <test name>');
      process.output('id author <test author>');
      await expect.poll(() => callback).toHaveBeenCalledWith({
        name: '<test name>',
        author: '<test author>'
      });
    });

    it('should send correct engine info', async () => {
      const process = new ProcessMock();
      const engine = await getInitializedEngine(process);
      const callback = vi.fn();
      engine.onEngineInfo(callback);
      engine.sendMove('f2f3');
      process.output('info depth 13 seldepth 20 multipv 1 score cp 96 nodes '+
        '322797 nps 321831 hashfull 148 tbhits 0 time 1003 pv e7e5');
      await expect.poll(() => callback).toHaveBeenCalledWith({
        depth: 13,
        evaluation: 'cp -96',
        nodes: 322797,
        nodesPerSecond: 321831,
        time: 1003
      });
    });

    it('should send correct principal variations', async () => {
      const process = new ProcessMock();
      const engine = await getInitializedEngine(process);
      engine.setOption('multiPV', 3);
      await waitMessageMatch(process, /^go /);
      const callback = vi.fn();
      engine.onPrincipalMoves(callback);
      process.output('info depth 13 seldepth 19 multipv 1 score cp 80 nodes '+
        '252001 nps 251498 hashfull 102 tbhits 0 time 1002 pv e2e4');
      process.output('info depth 12 seldepth 17 multipv 2 score cp 52 nodes '+
        '252001 nps 251498 hashfull 102 tbhits 0 time 1002 pv c2c4 e7e6');
      process.output('info depth 12 seldepth 12 multipv 3 score cp 52 nodes '+
        '252001 nps 251498 hashfull 102 tbhits 0 time 1002 pv d2d4 d7d5');
      await expect.poll(() => callback).toHaveBeenCalledWith([
        'cp 80 e2e4', 'cp 52 c2c4 e7e6', 'cp 52 d2d4 d7d5'
      ]);
    });

    it('should send best and ponder moves', async () => {
      const process = new ProcessMock();
      const engine = await getInitializedEngine(process);
      const callback = vi.fn();
      engine.onBestMove(callback);
      process.output('bestmove e2e4 ponder e7e5');
      await expect.poll(() => callback).toHaveBeenCalledWith('e2e4');
      expect(engine.getPonderMove()).toBe('e7e5');
    });
  });
});

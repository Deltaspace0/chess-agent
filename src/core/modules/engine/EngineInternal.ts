import { utilityProcess, type UtilityProcess } from 'electron';
import path from 'path';
import EngineProcess from './EngineProcess.ts';

class EngineInternal extends EngineProcess {
  private worker: UtilityProcess;
  private options: Record<string, string> = {};

  constructor() {
    super();
    const workerPath = path.join(import.meta.dirname, 'stockfish.js');
    this.worker = utilityProcess.fork(workerPath);
    this.worker.on('message', (e) => {
      const stream = e.type === 'error' ? 'stderr' : 'stdout';
      this.sendToListeners(stream, e.message);
    });
  }

  refresh() {
    for (const name in this.options) {
      const value = this.options[name];
      this.worker.postMessage(`setoption name ${name} value ${value}`);
    }
  }

  send(message: string) {
    if (message.includes('Threads')) {
      return;
    }
    this.sendToListeners('stdin', message);
    const words = message.split(' ');
    if (words[0] === 'setoption') {
      this.options[words[2]] = words[4];
    }
    this.worker.postMessage(message);
  }
}

export default EngineInternal;

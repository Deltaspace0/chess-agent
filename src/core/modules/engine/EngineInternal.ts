import path from 'path';
import { Worker } from 'worker_threads';
import EngineProcess from './EngineProcess.ts';

class EngineInternal extends EngineProcess {
  private worker: Worker;
  private options: Record<string, string> = {};

  constructor() {
    super();
    const workerPath = path.join(import.meta.dirname, 'stockfish.js');
    this.worker = new Worker(workerPath);
    this.worker.on('message', (e) => {
      const stream = e.type === 'error' ? 'stderr' : 'stdout';
      this.emit(stream, e.message);
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
    this.emit('stdin', message);
    const words = message.split(' ');
    if (words[0] === 'setoption') {
      this.options[words[2]] = words[4];
    }
    this.worker.postMessage(message);
  }
}

export default EngineInternal;

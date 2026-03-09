import path from 'path';
import { Worker } from 'worker_threads';
import EngineProcess from './EngineProcess.ts';

class EngineInternal extends EngineProcess {
  private worker: Worker;

  constructor() {
    super();
    const workerPath = path.join(import.meta.dirname, 'stockfish.js');
    this.worker = new Worker(workerPath);
    this.worker.on('message', (e) => {
      const stream = e.type === 'error' ? 'stderr' : 'stdout';
      this.emit(stream, e.message);
    });
  }

  send(message: string) {
    if (message.includes('Threads')) {
      return;
    }
    this.emit('stdin', message);
    this.worker.postMessage(message);
  }
}

export default EngineInternal;

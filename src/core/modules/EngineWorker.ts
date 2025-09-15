import Worker from 'web-worker';
import EngineProcess from './EngineProcess.ts';

class EngineWorker extends EngineProcess {
  private worker: Worker;

  constructor() {
    super();
    const url = new URL('../stockfish.js', import.meta.url);
    this.worker = new Worker(url, { type: 'module' });
    this.worker.addEventListener('message', (e) => {
      for (const listener of this.listeners) {
        listener(e.data);
      }
    });
  }

  send(message: string) {
    this.worker.postMessage(message);
  }
}

export default EngineWorker;

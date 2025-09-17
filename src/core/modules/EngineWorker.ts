import Worker from 'web-worker';
import EngineProcess from './EngineProcess.ts';

class EngineWorker extends EngineProcess {
  private worker: Worker;

  constructor() {
    super();
    const url = new URL('../stockfish.js', import.meta.url);
    this.worker = new Worker(url, { type: 'module' });
    this.worker.addEventListener('message', (e) => {
      const stream = e.data.type === 'error' ? 'stderr' : 'stdout';
      for (const listener of this.listeners[stream]) {
        listener(e.data.message);
      }
    });
  }

  send(message: string) {
    if (message.includes('Threads')) {
      return;
    }
    this.worker.postMessage(message);
    for (const listener of this.listeners.stdin) {
      listener(message);
    }
  }
}

export default EngineWorker;

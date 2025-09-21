import Worker from 'web-worker';
import EngineProcess from './EngineProcess.ts';

class EngineInternal extends EngineProcess {
  private worker!: Worker;
  private options: Record<string, string> = {};

  constructor() {
    super();
    this.useNextWorker();
  }

  private useNextWorker() {
    const url = new URL('./stockfish.js', import.meta.url);
    this.worker = new Worker(url, { type: 'module' });
    this.worker.addEventListener('message', (e) => {
      const stream = e.data.type === 'error' ? 'stderr' : 'stdout';
      for (const listener of this.listeners[stream]) {
        listener(e.data.message);
      }
    });
    for (const name in this.options) {
      this.worker.postMessage(`setoption name ${name} value ${this.options[name]}`);
    }
  }

  send(message: string) {
    if (message.includes('Threads')) {
      return;
    }
    for (const listener of this.listeners.stdin) {
      listener(message);
    }
    if (message === 'stop') {
      this.worker.terminate();
      this.useNextWorker();
      return;
    }
    const words = message.split(' ');
    if (words[0] === 'setoption') {
      this.options[words[2]] = words[4];
    }
    this.worker.postMessage(message);
  }
}

export default EngineInternal;

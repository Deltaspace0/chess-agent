import Worker from 'web-worker';
import EngineProcess from './EngineProcess.ts';

class EngineInternal extends EngineProcess {
  private worker: Worker | null = null;
  private options: Record<string, string> = {};

  private useNextWorker() {
    const url = new URL('./stockfish.js', import.meta.url);
    this.worker = new Worker(url, { type: 'module' });
    this.worker.addEventListener('message', (e) => {
      const stream = e.data.type === 'error' ? 'stderr' : 'stdout';
      this.sendToListeners(stream, e.data.message);
    });
    for (const name in this.options) {
      const value = this.options[name];
      this.worker.postMessage(`setoption name ${name} value ${value}`);
    }
  }

  kill() {
    this.worker?.terminate();
    this.worker = null;
  }

  send(message: string) {
    if (message.includes('Threads')) {
      return;
    }
    this.sendToListeners('stdin', message);
    if (message === 'stop') {
      this.worker?.terminate();
      this.useNextWorker();
      return;
    }
    if (!this.worker) {
      this.useNextWorker();
    }
    const words = message.split(' ');
    if (words[0] === 'setoption') {
      this.options[words[2]] = words[4];
    }
    this.worker!.postMessage(message);
  }
}

export default EngineInternal;

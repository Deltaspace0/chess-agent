import { spawn, type ChildProcessWithoutNullStreams } from 'child_process';
import Worker from 'web-worker';

class EngineProcess {
  private defaultWorker: Worker;
  private process: ChildProcessWithoutNullStreams | null = null;
  private listener: (data: string) => void = () => {};

  constructor() {
    const defaultURL = new URL('../stockfish.js', import.meta.url);
    this.defaultWorker = new Worker(defaultURL, { type: 'module' });
    this.defaultWorker.addEventListener('message', (e) => {
      if (!this.process) {
        this.listener(e.data);
      }
    });
  }

  spawn(path: string | null): boolean {
    if (this.process) {
      this.process.kill();
      this.process = null;
    }
    if (!path) {
      return true;
    }
    try {
      this.process = spawn(path);
    } catch (e) {
      return false;
    }
    this.process.stdout.on('data', (data) => {
      const dataLines = data.toString().split('\n').slice(0, -1);
      for (const line of dataLines) {
        this.listener(line);
      }
    });
    this.process.stderr.on('data', (data) => {
      console.error(`Engine stderr: ${data}`);
    });
    return true;
  }

  send(message: string) {
    if (this.process) {
      this.process.stdin.write(message+'\n');
    } else {
      this.defaultWorker.postMessage(message);
    }
  }

  onMessage(listener: (data: string) => void) {
    this.listener = listener;
  }
}

export default EngineProcess;

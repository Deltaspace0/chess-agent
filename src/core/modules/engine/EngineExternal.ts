import { spawn, type ChildProcessWithoutNullStreams } from 'child_process';
import EngineProcess from './EngineProcess.ts';

class EngineExternal extends EngineProcess {
  private process: ChildProcessWithoutNullStreams | null = null;

  spawn(path: string): boolean {
    this.kill();
    try {
      this.process = spawn(path);
    } catch (e) {
      return false;
    }
    this.process.on('exit', (code) => {
      for (const listener of this.listeners.exit) {
        listener(JSON.stringify(code));
      }
    });
    for (const t of ['stdout', 'stderr'] as const) {
      this.process[t].on('data', (data) => {
        const dataLines = data.toString().split('\n').slice(0, -1);
        for (const listener of this.listeners[t]) {
          for (const line of dataLines) {
            listener(line);
          }
        }
      });
    }
    return true;
  }

  kill() {
    if (this.process) {
      this.process.removeAllListeners('exit');
      this.process.kill();
      this.process = null;
    }
  }

  send(message: string) {
    if (this.process) {
      this.process.stdin.write(message+'\n');
      for (const listener of this.listeners.stdin) {
        listener(message);
      }
    }
  }
}

export default EngineExternal;

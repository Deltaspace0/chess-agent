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
    this.process.stdout.on('data', (data) => {
      const dataLines = data.toString().split('\n').slice(0, -1);
      for (const listener of this.listeners) {
        for (const line of dataLines) {
          listener(line);
        }
      }
    });
    this.process.stderr.on('data', (data) => {
      console.error(`Engine stderr: ${data}`);
    });
    return true;
  }

  kill() {
    if (this.process) {
      this.process.kill();
      this.process = null;
    }
  }

  send(message: string) {
    if (this.process) {
      this.process.stdin.write(message+'\n');
    }
  }
}

export default EngineExternal;

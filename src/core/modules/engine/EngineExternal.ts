import { spawn, type ChildProcessWithoutNullStreams } from 'child_process';
import EngineProcess from './EngineProcess.ts';

class EngineExternal extends EngineProcess {
  private process: ChildProcessWithoutNullStreams | null = null;

  spawn(path: string): boolean {
    this.resetEngineInfo();
    this.kill();
    try {
      this.process = spawn(path);
    } catch (e) {
      return false;
    }
    this.process.on('exit', (code) => {
      this.sendToListeners('exit', JSON.stringify(code));
    });
    for (const stream of ['stdout', 'stderr'] as const) {
      this.process[stream].on('data', (data) => {
        const dataLines = data.toString().split('\n').slice(0, -1);
        for (const line of dataLines) {
          this.sendToListeners(stream, line);
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
      this.sendToListeners('stdin', message);
    }
  }
}

export default EngineExternal;

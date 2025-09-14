import { spawn, type ChildProcessWithoutNullStreams } from 'child_process';

class EngineProcess {
  private process: ChildProcessWithoutNullStreams | null = null;
  private listener: (data: string) => void = () => {};

  spawn(path: string) {
    this.process = spawn(path);
    this.process.stdout.on('data', (data) => {
      const dataLines = data.toString().split('\n').slice(0, -1);
      for (const line of dataLines) {
        this.listener(line);
      }
    });
    this.process.stderr.on('data', (data) => {
      console.error(`Engine stderr: ${data}`);
    });
  }

  send(message: string) {
    if (this.process) {
      this.process.stdin.write(message+'\n');
    }
  }

  onMessage(listener: (data: string) => void) {
    this.listener = listener;
  }
}

export default EngineProcess;

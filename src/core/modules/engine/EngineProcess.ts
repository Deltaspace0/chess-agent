import EventEmitter from 'events';

interface ProcessEventMap {
  stdin: [data: string];
  stdout: [data: string];
  stderr: [data: string];
  exit: [code: string];
}

abstract class EngineProcess extends EventEmitter<ProcessEventMap> {
  abstract send(message: string): void;

  async expect(
    expectedData: string,
    delay: number,
    message?: string
  ): Promise<boolean> {
    return new Promise((resolve) => {
      const res = (result: boolean) => {
        this.removeListener('stdout', listener);
        resolve(result);
      };
      const listener = (data: string) => {
        if (data.trim() === expectedData) {
          res(true);
        }
      };
      this.addListener('stdout', listener);
      setTimeout(() => res(false), delay);
      if (message) {
        this.send(message);
      }
    });
  }
}

export default EngineProcess;

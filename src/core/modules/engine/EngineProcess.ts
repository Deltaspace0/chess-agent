type ListenerType = 'stdin' | 'stdout' | 'stderr' | 'exit' | 'id';
type Listener = (data: string) => void;

abstract class EngineProcess {
  private listeners: Record<ListenerType, Set<Listener>> = {
    stdin: new Set(),
    stdout: new Set(),
    stderr: new Set(),
    exit: new Set(),
    id: new Set()
  };
  private engineName: string = '';
  private engineAuthor: string = '';

  constructor() {
    this.listeners.stdout.add((data) => {
      if (data.startsWith('id name')) {
        this.engineName = data.slice('id name'.length);
        this.sendToListeners('id', 'name');
      } else if (data.startsWith('id author')) {
        this.engineAuthor = data.slice('id author'.length);
        this.sendToListeners('id', 'author');
      }
    });
  }

  protected sendToListeners(type: ListenerType, data: string) {
    for (const listener of this.listeners[type]) {
      listener(data);
    }
  }

  protected resetEngineInfo() {
    this.engineName = '';
    this.engineAuthor = '';
  }

  abstract send(message: string): void;

  getEngineName(): string {
    return this.engineName;
  }

  getEngineAuthor(): string {
    return this.engineAuthor;
  }

  async expect(
    expectedData: string,
    delay: number,
    message?: string
  ): Promise<boolean> {
    return new Promise((resolve) => {
      const res = (result: boolean) => {
        this.listeners.stdout.delete(listener);
        resolve(result);
      };
      const listener = (data: string) => {
        if (data.trim() === expectedData) {
          res(true);
        }
      };
      this.listeners.stdout.add(listener);
      setTimeout(() => res(false), delay);
      if (message) {
        this.send(message);
      }
    });
  }

  addListener(type: ListenerType, listener: Listener) {
    this.listeners[type].add(listener);
  }

  removeListener(type: ListenerType, listener: Listener) {
    this.listeners[type].delete(listener);
  }
}

export default EngineProcess;

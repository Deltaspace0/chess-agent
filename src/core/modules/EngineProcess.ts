abstract class EngineProcess {
  protected listeners: Set<(data: string) => void> = new Set();

  abstract send(message: string): void;

  addListener(listener: (data: string) => void) {
    this.listeners.add(listener);
  }

  removeListener(listener: (data: string) => void) {
    this.listeners.delete(listener);
  }
}

export default EngineProcess;

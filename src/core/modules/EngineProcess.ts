type ListenerType = 'stdin' | 'stdout' | 'stderr';
type Listener = (data: string) => void;

abstract class EngineProcess {
  protected listeners: Record<ListenerType, Set<Listener>> = {
    stdin: new Set(),
    stdout: new Set(),
    stderr: new Set()
  };

  abstract send(message: string): void;

  addListener(type: ListenerType, listener: Listener) {
    this.listeners[type].add(listener);
  }

  removeListener(type: ListenerType, listener: Listener) {
    this.listeners[type].delete(listener);
  }
}

export default EngineProcess;
